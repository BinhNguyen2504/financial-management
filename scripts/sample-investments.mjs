import { parseArgs } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "./lib/investment-cloud-review.mjs";
const { values } = parseArgs({
  options: { base: { type: "string" }, today: { type: "string" } },
});
if (!values.base)
  throw new Error("Dùng --base <bộ mẫu Tiết kiệm đã có>/sample-data.json.");
const data = addInvestmentReviewData(
  JSON.parse(await readFile(values.base, "utf8")),
  { today: values.today },
);
const sql = buildInvestmentCloudReviewSQL(data, {
  migrationSQL: await readFile(
    "supabase/migrations/202610180001_investments.sql",
    "utf8",
  ),
});
const directory = resolve(
  "imports",
  `investments-review-${data.investmentToday}-${data.datasetId.slice(0, 8)}`,
);
await mkdir(directory, { recursive: true, mode: 0o700 });
const readme = `# Investment UI review\n\nOwner: ${data.ownerId}\nDataset: ${data.datasetId}\nDate: ${data.investmentToday}\n\nReferences: Notion/investment-1.png and investment-2.png. Starting cost/value pairs for stocks, equity funds, bond funds and crypto reference the screenshots; dates and later transactions are synthetic. This is review data, not a migration of actual financial history.\n\nExisting Income, Expenses and Savings are preserved. All four modules must have matching review markers before the complete reset is allowed.\n\n1. Run 01-enable-and-seed.sql once in the configured Supabase project SQL Editor as the migration/admin role. It adds all six Investment tables only if every one is missing, rejects partial schemas, then seeds this owner in the same transaction. Do not run reset.\n2. Refresh /investments while signed in as this owner. 00-inspect.sql verifies all 28 tables and review markers. Repeating the exact seed preserves review edits.\n3. If schema is already installed, 04-seed-investments-only.sql or data:import can seed through the normal expense_api/RLS role. The CLI saves a backup and reads back amounts.\n4. ONLY AFTER UI/UX APPROVAL: export 02-backup.sql and replace NOT_CONFIRMED in 03-reset.sql with RESET REVIEW ${data.ownerId}. The reset clears all four financial modules for this owner, including review edits, and returns another snapshot immediately before deletion. It preserves Auth/profile and other owners. It refuses mismatched markers and rolls back data and trigger changes on error.\n\nCases: initial capital/value, multiple cash wallets, monthly DCA-style contributions, buys with fees, partial profit/loss sales, direct external settlement, wallet transfers/withdrawal, full liquidation, zero-proceeds write-off, archived categories, stale/fresh valuation, corrected valuation and canceled duplicate deposit.\n\nNever execute the reset as part of seed/import. Credentials are not included in this folder. No cloud seed or reset is implied by generating these files.\n`;
for (const [name, content] of Object.entries({
  "00-inspect.sql": sql.inspect,
  "01-enable-and-seed.sql": sql.enable,
  "02-backup.sql": sql.backup,
  "03-reset.sql": sql.reset,
  "04-seed-investments-only.sql": sql.seed,
  "sample-data.json": JSON.stringify(data, null, 2) + "\n",
  "README.md": readme,
}))
  await writeFile(join(directory, name), content, { flag: "wx", mode: 0o600 });
console.log(
  `Bộ review Đầu tư và reset 28 bảng: ${directory}\nĐã sinh file local; chưa nạp cloud hoặc reset.`,
);
