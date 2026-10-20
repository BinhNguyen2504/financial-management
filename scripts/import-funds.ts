import { parseArgs, isDeepStrictEqual } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import postgres from "postgres";
import {
  buildFundReviewSQL,
  fullReviewTables,
  fundTables,
  reviewMarkerSQL,
  sqlLiteral,
  type FundReviewData,
} from "./lib/fund-review-data";
import { postgresFundRepository } from "../src/server/fund-repository";
import { readFundView } from "../src/application/funds";
import { vietnamClock } from "../src/domain/expenses/engine";
import { selectLiving } from "../src/domain/funds/engine";
const { values } = parseArgs({
  options: {
    file: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
if (!values.file || !process.env.DATABASE_URL)
  throw new Error(
    "Cần --file <Fund sample-data.json> và DATABASE_URL runtime trong .env.local.",
  );
const data: FundReviewData = JSON.parse(await readFile(values.file, "utf8"));
const generated = buildFundReviewSQL(data, { runtime: true });
const db = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  onnotice: () => {},
});
try {
  const snapshot = await db.begin(async (tx) => {
    await tx.unsafe(
      "set transaction isolation level repeatable read read only",
    );
    const [role] = await tx.unsafe(
      "select session_user as role,has_schema_privilege(session_user,'public','CREATE') as can_create",
    );
    if (role.role !== "expense_api")
      throw new Error("EXPECTED_RUNTIME_ROLE: chỉ dùng expense_api với RLS.");
    await tx.unsafe("set local role authenticated");
    await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: data.ownerId, role: "authenticated" }),
    ]);
    const tables: Record<string, unknown[]> = {},
      missing: string[] = [];
    for (const table of [...fullReviewTables, "data_imports"]) {
      const [r] = await tx.unsafe(
        "select to_regclass($1) is not null as exists",
        ["public." + table],
      );
      if (r.exists)
        tables[table] = await tx.unsafe(
          `select * from public.${table} where owner_id=$1`,
          [data.ownerId],
        );
      else missing.push(table);
    }
    return {
      format: "financial-manager-owner-inspection-backup",
      ownerId: data.ownerId,
      exportedAt: new Date().toISOString(),
      schema: { ...role, missing },
      tables,
    };
  });
  await mkdir("backups", { recursive: true, mode: 0o700 });
  const backup = resolve(
    "backups",
    `before-funds-review-${data.ownerId}-${Date.now()}.json`,
  );
  await writeFile(backup, JSON.stringify(snapshot, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify(
      {
        ownerId: data.ownerId,
        apply: values.apply,
        backup,
        missing: snapshot.schema.missing,
        countsBefore: Object.fromEntries(
          Object.entries(snapshot.tables).map(([t, rows]) => [t, rows.length]),
        ),
      },
      null,
      2,
    ),
  );
  if (fullReviewTables.some((t) => snapshot.schema.missing.includes(t)))
    throw new Error(
      `FUNDS_MIGRATION_REQUIRED: chạy ${resolve(dirname(values.file), "01-enable-and-seed.sql")} bằng Supabase SQL Editor/migration role. Chưa ghi cloud.`,
    );
  const marker = reviewMarkerSQL(data);
  const flags = await db.begin(async (tx) => {
    await tx.unsafe("set local role authenticated");
    await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: data.ownerId, role: "authenticated" }),
    ]);
    const [r] = await tx.unsafe(
      `with constants as (select ${sqlLiteral(data.ownerId)}::uuid as review_owner,${sqlLiteral(data.datasetId)}::text as review_dataset) select (${marker.previous}) as previous,(${marker.funds}) as installed from constants`,
    );
    return r;
  });
  if (!flags.previous)
    throw new Error(
      "REVIEW_MARKERS_MISMATCH: bộ mẫu bốn module trước không khớp; chưa ghi.",
    );
  if (!flags.installed && fundTables.some((t) => snapshot.tables[t].length))
    throw new Error("FUNDS_NOT_EMPTY: đã có dữ liệu khác; chưa ghi.");
  if (!flags.installed) {
    const current = await readFundView(
      postgresFundRepository(db),
      data.ownerId,
      vietnamClock(),
    );
    const accepted = data.funds.configurations[0].living;
    if (
      !isDeepStrictEqual(
        selectLiving(
          current.source,
          accepted.items.map((i) => i.jarId),
        ),
        accepted,
      )
    )
      throw new Error(
        "FUND_SOURCE_CHANGED: nguồn Chi tiêu đã đổi; tạo lại package trước khi nạp.",
      );
  }
  if (values.apply) await db.unsafe(generated.seed);
  if (values.apply || flags.installed) {
    const view = await readFundView(
      postgresFundRepository(db),
      data.ownerId,
      vietnamClock(),
    );
    if (!view.book?.configurations.some((c) => c.id === data.fundReviewId))
      throw new Error("FUND_READ_BACK_MARKER_FAILED");
    if (!flags.installed && !isDeepStrictEqual(view.state, data.expected))
      throw new Error("FUND_READ_BACK_AMOUNTS_FAILED");
    console.log(
      JSON.stringify(
        {
          status: flags.installed
            ? "Đã có bộ mẫu; giữ các chỉnh sửa review."
            : "Đã nạp và đọc lại Fund bằng RLS.",
          version: view.book.version,
          state: view.state,
          sourceChanged: view.sourceChanged,
        },
        null,
        2,
      ),
    );
  } else
    console.log(
      "Kiểm tra xong; chưa ghi. Thêm --apply để nạp nguyên tử và đối soát.",
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Fund import failed");
  process.exitCode = 1;
} finally {
  await db.end();
}
