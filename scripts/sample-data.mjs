import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { buildReviewData, buildReviewSQL } from "./lib/review-data.mjs";

const { values } = parseArgs({
  options: {
    owner: { type: "string" },
    today: { type: "string" },
    help: { type: "boolean" },
  },
});
if (values.help || !values.owner) {
  console.log(
    "npm run data:sample -- --owner <Supabase User UID> [--today YYYY-MM-DD]\nCreates private imports/ui-review-*/ SQL + JSON files. Never connects to a database.\n--today changes the sample date only; normally use today's Vietnam date.",
  );
  if (!values.help) process.exitCode = 1;
} else {
  const data = buildReviewData({ ownerId: values.owner, today: values.today });
  const sql = buildReviewSQL(data);
  const directory = resolve(
    "imports",
    `ui-review-${data.today}-${data.datasetId.slice(0, 8)}`,
  );
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const [name, content] of Object.entries({
    "00-inspect.sql": sql.inspect,
    "01-seed.sql": sql.seed,
    "02-backup.sql": sql.backup,
    "03-reset.sql": sql.reset,
    "sample-data.json": JSON.stringify(data, null, 2) + "\n",
    "README.md": `# UI review data\n\nOwner: ${data.ownerId}\nDataset: ${data.datasetId}\nGenerated for: ${data.today}\n\nSynthetic records inspired by your Notion screenshots.\n\n1. In Supabase SQL Editor, select postgres/admin and run 00-inspect.sql. Verify the User UID and existing counts.\n2. Run 01-seed.sql. Existing financial records are never overwritten. A pristine initialized expense book can be reused while preserving its initialization audit/command. Running this exact seed again makes no changes.\n3. Sign in with the same user in the app. Refresh /overview, /budgets, /income. Review monthly/quarterly reports, mobile/desktop and Privacy Mode.\n4. Only after UI/UX approval, stop editing on all devices, run 02-backup.sql and export the JSON result outside the SQL Editor.\n5. In 03-reset.sql, replace NOT_CONFIRMED with RESET REVIEW ${data.ownerId}, then run the whole file. It clears all Income/Expenses data for this marked review owner, including changes made during review and closed years.\n6. Run 00-inspect.sql again: all counts should be zero. Account/login/profile remain. Refresh the app and choose your real starting month.\n\nReset temporarily disables five named immutable-history triggers inside its transaction and restores them before commit. It needs table-owner/admin rights. RLS is never disabled. Any error rolls back all changes.\n\nFull instructions: docs/10-sample-data.md\n`,
  }))
    await writeFile(join(directory, name), content, {
      mode: 0o600,
      flag: "wx",
    });
  console.log(
    `Đã tạo bộ review: ${directory}\n${data.expenses.jars.length} hũ, ${data.expenses.inputs.length} dòng tháng, ${data.expenses.spends.length} lần sử dụng tích lũy.\n${data.income.categories.length} nguồn thu cố định, ${data.income.monthly.length} số thu tháng, ${data.income.oneOffs.length} khoản phát sinh.\nChưa kết nối hoặc ghi vào Supabase. Chạy 01-seed.sql bằng SQL Editor để import. Reset chưa được xác nhận.`,
  );
}
