import { parseArgs } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { buildReviewData } from "./lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "./lib/savings-review-data.mjs";
const { values } = parseArgs({
  options: {
    base: { type: "string" },
    owner: { type: "string" },
    today: { type: "string" },
  },
});
if (!values.base && !values.owner)
  throw new Error(
    "Dùng --base <sample-data.json trước đây> hoặc --owner <UID>.",
  );
const base = values.base
  ? JSON.parse(await readFile(values.base, "utf8"))
  : buildReviewData({ ownerId: values.owner, today: values.today });
const data = addSavingsReviewData(base, { today: values.today });
const sql = buildSavingsReviewSQL(data, {
  migrationSQL: await readFile(
    "supabase/migrations/202610170001_savings.sql",
    "utf8",
  ),
});
const directory = resolve(
  "imports",
  `savings-review-${data.today}-${data.datasetId.slice(0, 8)}`,
);
await mkdir(directory, { recursive: true, mode: 0o700 });
const readme = `# Savings UI review\n\nOwner: ${data.ownerId}\nDataset: ${data.datasetId}\nDate: ${data.today}\n\nSynthetic data inspired by Notion/saving.png: MoMo, VIB, Techcombank (100m principal), gold (62.2m opening cost), monthly contributions, interest, rollover, partial sales, a settled/archived contract and stale/fresh prices. Gold quantity, unit and transaction dates are explicitly illustrative.\n\nExisting Income/Expenses review data is preserved.\n\n1. Run 01-enable-and-seed.sql in the connected Supabase SQL Editor as the migration/admin role. It creates Savings only when all eight tables are missing, then imports this marked dataset atomically. Partial schemas are rejected. It requires the matching existing Income/Expenses review markers.\n2. Refresh /savings with the same account. Use 00-inspect.sql to verify counts. Re-running this exact seed preserves your edits.\n3. Export 02-backup.sql before reset. It includes all 22 tables for this owner.\n4. ONLY AFTER UI/UX APPROVAL: replace NOT_CONFIRMED in 03-reset.sql with RESET REVIEW ${data.ownerId}. This clears Income, Expenses and Savings, including review edits and immutable history. It preserves Auth/profile and other users. Never run it while real data must be kept.\n5. Reset emits a final snapshot and verifies all 22 counts are zero. No reset has been executed on cloud. Use this updated reset instead of the older 14-table file.\n\n04-seed-savings-only.sql is for a database where the Savings migration is already applied. data:import accepts this JSON and uses the normal expense_api role/RLS, takes a backup and verifies read-back.\n\nLocal preview: npm run data:preview — isolated PostgreSQL/Auth, review@example.test / OTP 123456; no real account credentials.\n`;
for (const [name, content] of Object.entries({
  "00-inspect.sql": sql.inspect,
  "01-enable-and-seed.sql": sql.enable,
  "02-backup.sql": sql.backup,
  "03-reset.sql": sql.reset,
  "04-seed-savings-only.sql": sql.seed,
  "sample-data.json": JSON.stringify(data, null, 2) + "\n",
  "README.md": readme,
}))
  await writeFile(join(directory, name), content, { flag: "wx", mode: 0o600 });
console.log(
  `Bộ mẫu Tiết kiệm và reset đầy đủ: ${directory}\nĐã tạo file local; chưa ghi cloud và chưa chạy reset.`,
);
