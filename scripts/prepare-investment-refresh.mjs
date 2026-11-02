import { parseArgs } from "node:util";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import postgres from "postgres";
import { buildInvestmentReviewData } from "./lib/investment-review-data.mjs";
import {
  buildInvestmentRefreshSQL,
  refreshTables,
  snapshotSQL,
} from "./lib/investment-refresh.mjs";
const { values } = parseArgs({
  options: { source: { type: "string" }, out: { type: "string" } },
});
if (!values.source || !process.env.DATABASE_URL)
  throw new Error(
    "Use --source <existing review sample-data.json> and the runtime DATABASE_URL. This command only reads cloud data and writes a local package.",
  );
const source = JSON.parse(await readFile(values.source, "utf8"));
if (!/^[0-9a-f-]{36}$/i.test(source.ownerId) || !source.datasetId)
  throw new Error("Invalid review owner/dataset");
const db = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  onnotice: () => {},
});
try {
  const snapshot = await db.begin(async (tx) => {
    await tx`set transaction isolation level repeatable read read only`;
    const [role] = await tx`select session_user as role`;
    if (role.role !== "expense_api")
      throw new Error("Expected expense_api runtime/RLS read connection");
    for (const name of [...refreshTables, "goals_links"])
      if (
        !(
          await tx`select to_regclass(${"public." + name}) is not null as ready`
        )[0].ready
      )
        throw new Error("Missing table: " + name);
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: source.ownerId, role: "authenticated" })},true)`;
    if (
      (
        await tx`select count(*)::int n from public.goals_links where owner_id=${source.ownerId} and source_kind='investments'`
      )[0].n
    )
      throw new Error(
        "Investment sources are referenced by Goals; preserve those identities before replacing test data",
      );
    const [result] = await tx.unsafe(
      `select ${snapshotSQL(source.ownerId)} as snapshot`,
    );
    if (
      !result.snapshot.investments_audit.some(
        (a) =>
          a.action?.type === "createCategory" &&
          a.action.description?.includes(source.datasetId),
      )
    )
      throw new Error(
        "Existing investment review marker does not match; no replacement prepared",
      );
    return result.snapshot;
  });
  const sample = buildInvestmentReviewData({
    ownerId: source.ownerId,
    description: `DỮ LIỆU MẪU UI/UX · ${source.datasetId} · danh mục và ví riêng`,
  });
  const dir = resolve(
    values.out ?? `imports/investments-refresh-${sample.today}-${Date.now()}`,
  );
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(
    join(dir, "before-investments.json"),
    JSON.stringify(
      {
        ownerId: source.ownerId,
        exportedAt: new Date().toISOString(),
        tables: snapshot,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(
    join(dir, "sample-data.json"),
    JSON.stringify(sample, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(
    join(dir, "replace-investments.sql"),
    buildInvestmentRefreshSQL(sample, snapshot),
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(
    join(dir, "README.md"),
    `# Investment test-data refresh\n\nOwner: ${source.ownerId}\n\nCloud was read through runtime RLS; no cloud rows were changed. The backup contains all six Investment tables. Run replace-investments.sql with the migration/admin connection only after reviewing this backup. It compares the exact previous snapshot, blocks Goal references, replaces only this owner's Investment rows in one transaction, and returns a read-back snapshot. Other modules and other owners are preserved. Refresh the package if the ledger changes. Runtime privileges, RLS and history guards are unchanged after completion or rollback.\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    JSON.stringify(
      {
        directory: dir,
        owner: source.ownerId,
        cloudWrites: false,
        positions: sample.book.categories.length,
      },
      null,
      2,
    ),
  );
} finally {
  await db.end();
}
