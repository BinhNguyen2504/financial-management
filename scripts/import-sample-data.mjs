import { parseArgs } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  buildReviewSQL,
  reviewTables,
  REVIEW_FORMAT,
} from "./lib/review-data.mjs";
import {
  buildSavingsReviewSQL,
  allReviewTables,
} from "./lib/savings-review-data.mjs";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
if (!values.file || !process.env.DATABASE_URL)
  throw new Error(
    "Cần --file <sample-data.json> và DATABASE_URL trong .env.local. Không cần admin/service-role key.",
  );
const data = JSON.parse(await readFile(values.file, "utf8"));
if (data.format !== REVIEW_FORMAT) throw new Error("Sai định dạng bộ mẫu.");
const seed = data.savings
  ? buildSavingsReviewSQL(data, { runtime: true }).seed
  : buildReviewSQL(data, { runtime: true }).seed;
const tablesToRead = data.savings ? allReviewTables : reviewTables;
const db = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  onnotice: () => {},
});
try {
  if (data.savings) {
    const missing = await db.unsafe(
      "select to_regclass('public.savings_books') is null as missing",
    );
    if (missing[0].missing)
      throw Object.assign(
        new Error(
          "Cần chạy 01-enable-and-seed.sql bằng Supabase SQL Editor trước; kết nối runtime không có quyền tạo bảng.",
        ),
        { code: "SAVINGS_MIGRATION_REQUIRED" },
      );
  }
  const snapshot = await db.begin(async (tx) => {
    await tx.unsafe(
      "set transaction isolation level repeatable read read only",
    );
    const [{ expected }] = await tx.unsafe(
      "select session_user='expense_api' as expected",
    );
    if (!expected) throw new Error("EXPECTED_RUNTIME_ROLE");
    await tx.unsafe("set local role authenticated");
    await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: data.ownerId, role: "authenticated" }),
    ]);
    const tables = {};
    for (const table of tablesToRead)
      tables[table] = await tx.unsafe(
        `select * from public.${table} where owner_id=$1`,
        [data.ownerId],
      );
    return {
      ownerId: data.ownerId,
      exportedAt: new Date().toISOString(),
      tables,
    };
  });
  console.log(
    JSON.stringify(
      {
        ownerId: data.ownerId,
        apply: values.apply,
        countsBefore: Object.fromEntries(
          Object.entries(snapshot.tables).map(([table, rows]) => [
            table,
            rows.length,
          ]),
        ),
      },
      null,
      2,
    ),
  );
  if (values.apply) {
    await mkdir("backups", { recursive: true, mode: 0o700 });
    const backupPath = resolve(
      "backups",
      `before-review-${data.datasetId}-${Date.now()}.json`,
    );
    await writeFile(backupPath, JSON.stringify(snapshot, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    await db.unsafe(seed);
    const verified = await db.begin(async (tx) => {
      await tx.unsafe("set local role authenticated");
      await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: data.ownerId, role: "authenticated" }),
      ]);
      const counts = {};
      for (const table of tablesToRead) {
        const [r] = await tx.unsafe(
          `select count(*)::int as count from public.${table} where owner_id=$1`,
          [data.ownerId],
        );
        counts[table] = r.count;
      }
      if (data.savings) {
        const [marker] = await tx.unsafe(
          "select count(*)::int as count from public.savings_audit where owner_id=$1 and action->>'type'='createCategory' and action->>'description'=$2",
          [data.ownerId, data.savings.categories[0].rules[0].description],
        );
        if (!marker.count) throw new Error("SAVINGS_READ_BACK_FAILED");
      }
      return counts;
    });
    console.log(JSON.stringify({ countsAfter: verified }, null, 2));
    console.log(
      `Đã nạp bộ mẫu ${data.datasetId}. Backup trước khi nạp: ${backupPath}\nTải lại ${data.savings ? "/savings" : "/overview, /budgets, /income"}. Chưa reset dữ liệu.`,
    );
  } else
    console.log(
      "Chỉ đọc, chưa ghi database. Thêm --apply để nạp đúng bộ mẫu này.",
    );
} catch (error) {
  await db.unsafe("rollback").catch(() => {});
  console.error(
    "Import không hoàn tất:",
    error.code === "P0001" || error.code === "SAVINGS_MIGRATION_REQUIRED"
      ? error.message
      : (error.code ?? "CONNECTION_OR_PERMISSION_ERROR"),
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
