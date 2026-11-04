import { parseArgs, isDeepStrictEqual } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import postgres from "postgres";
import { z } from "zod";
import { backupTables } from "../src/domain/backup/format";
import { vietnamClock } from "../src/domain/shared/clock";
import { readGoalView } from "../src/application/goals";
import { postgresGoalRepository } from "../src/server/goal-repository";
import { setTransactionOwner } from "../src/server/owner-transaction";
import {
  applyGoalReviewData,
  buildGoalReviewData,
  type GoalReviewData,
} from "./lib/goal-review-data";

const { values } = parseArgs({
  options: {
    owner: { type: "string" },
    file: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
if (!process.env.DATABASE_URL || (!values.owner && !values.file))
  throw new Error(
    "Cần DATABASE_URL runtime và --owner <UID> hoặc --file <package>.",
  );
if (values.apply && !values.file)
  throw new Error(
    "Tạo package trước, sau đó --file <sample-data.json> --apply.",
  );
const existing: GoalReviewData | null = values.file
  ? JSON.parse(await readFile(values.file, "utf8"))
  : null;
const owner = z.uuid().parse(values.owner ?? existing?.ownerId);
if (existing && existing.ownerId !== owner) throw new Error("OWNER_MISMATCH");
const db = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  onnotice: () => {},
});
try {
  const snapshot = await db.begin(
    "isolation level repeatable read read only",
    async (tx) => {
      const [role] = await tx`select session_user as role,
        has_schema_privilege(session_user,'public','CREATE') as can_create`;
      if (role.role !== "expense_api") throw new Error("EXPECTED_RUNTIME_ROLE");
      await setTransactionOwner(tx, owner);
      const tables: Record<string, unknown[]> = {},
        missing: string[] = [];
      for (const table of [
        ...backupTables,
        "data_imports",
        "data_generations",
        "data_resets",
        "overview_layouts",
      ]) {
        const [r] =
          await tx`select to_regclass(${"public." + table}) is not null as ready`;
        if (r.ready)
          tables[table] = [
            ...(await tx`select * from ${tx("public." + table)} where owner_id=${owner}`),
          ];
        else missing.push(table);
      }
      return {
        format: "financial-manager-owner-inspection-backup",
        ownerId: owner,
        exportedAt: new Date().toISOString(),
        role,
        missing,
        tables,
      };
    },
  );
  await mkdir("backups", { recursive: true, mode: 0o700 });
  const backup = resolve(
    "backups",
    `before-goals-review-${owner}-${Date.now()}.json`,
  );
  await writeFile(backup, JSON.stringify(snapshot, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  if (backupTables.some((t) => snapshot.missing.includes(t)))
    throw new Error(
      `SCHEMA_NOT_READY: chưa ghi; backup ${backup}; missing ${snapshot.missing.join(", ")}`,
    );
  const repository = postgresGoalRepository(db),
    clock = vietnamClock(),
    before = await readGoalView(repository, owner, clock);
  if (!existing && before.book)
    throw new Error(
      "GOALS_NOT_EMPTY: giữ dữ liệu; dùng lại package cũ để kiểm tra.",
    );
  const data =
    existing ??
    buildGoalReviewData({ ownerId: owner, sources: before.sources, clock });
  const directory = existing
    ? dirname(resolve(values.file!))
    : resolve(
        "imports",
        `goals-review-${clock.today}-${data.datasetId.slice(0, 8)}`,
      );
  if (!existing) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    for (const [name, content] of Object.entries({
      "sample-data.json": JSON.stringify(data, null, 2) + "\n",
      "README.md": `# Goal UI/UX review\n\nOwner: ${owner}\nDataset: ${data.datasetId}\nBackup: ${backup}\n\nTargets 85m (financial safety) and 500m (investment), and the tuition name, reference Notion/goal.png. All other goals and ledger transactions are synthetic review data. Linked progress reads existing sources without changing their balances. Source values and dates remain unchanged, including missing/stale valuations.\n\nReview /goals; choose All to see completed/archived cases. Open Mua xe đi làm > Giao dịch to review more than 20 transactions, filtering and pagination; Lịch sử includes correction/cancellation. Completed health goal keeps its 5m completion snapshot and a 2m remaining balance. Savings spending goals share 60/40 of one source; pausing retains allocation.\n\nApply: npm run data:goals:review -- --file ${join(directory, "sample-data.json")} --apply\n\nRepeating the same package preserves review edits. Another occupied Goals book is refused. A changed source or date before the initial apply requires a fresh package. Import is atomic through the application repository under expense_api/authenticated RLS. Backups here are owner-scoped operational snapshots, not Settings restore files.\n\nReset: DEFERRED until UI/UX approval. Do not run old reset SQL packages: they predate Goals and may omit tables. After approval, create an owner-specific reset script using the current backup/prepareReset/reset flow, download a fresh validated V3 backup and retain Auth/profile and other owners. No reset is executed by this command.\n`,
    }))
      await writeFile(join(directory, name), content, {
        flag: "wx",
        mode: 0o600,
      });
  }
  const applied = values.apply
    ? await applyGoalReviewData(repository, data, clock.today)
    : null;
  const after = await readGoalView(repository, owner, clock);
  if (applied && !applied.installed) {
    const actual = {
      book: after.book,
      sources: after.sources,
      states: after.states,
      today: after.today,
      now: after.now,
    };
    if (!isDeepStrictEqual(actual, { ...data.expected, now: clock.now }))
      throw new Error("GOAL_COMMITTED_READ_BACK_FAILED");
  }
  const report = {
    ownerId: owner,
    directory,
    backup,
    runtimeRole: snapshot.role.role,
    missing: snapshot.missing,
    applied,
    resetExecuted: false,
    goals: (values.apply ? after : data.expected).book?.goals.map((g) => ({
      name: g.name,
      status: g.status,
      mode: g.mode,
      state: (values.apply ? after : data.expected).states.find(
        (s) => s.id === g.id,
      ),
    })),
  };
  await writeFile(
    join(directory, `report-${Date.now()}.json`),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Goal review failed");
  process.exitCode = 1;
} finally {
  await db.end();
}
