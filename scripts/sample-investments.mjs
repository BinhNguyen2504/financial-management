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
const readme = `# Investment UI review

Owner: ${data.ownerId}
Dataset: ${data.datasetId}
Date: ${data.investmentToday}

All amounts and dates are illustrative. Five portfolios own six cash wallets. Stocks use the 10m deposit, 7m purchase, 3m cash and 8m valuation example. Bitcoin illustrates selling all and buying again; an index fund retains only cash. Other cases cover partial sales, fees/taxes, wallet transfers, withdrawal, dated valuations, correction and cancellation.

Existing modules are preserved when seeding an empty Investment ledger. If the Investment schema is absent, run 01-enable-and-seed.sql with the migration/admin connection. Otherwise seed through the runtime RLS import and read back. Repeating the seed preserves review edits.

For an existing test ledger, use scripts/prepare-investment-refresh.mjs with --source <existing review sample-data.json>. It exports a backup and prepares an admin SQL package that replaces only Investments, checks the exact snapshot and blocks Goal references.

The historical 03-reset.sql clears four modules and must not be used for this Investment refresh. Generating this package does not write cloud data or deploy the application.
`;
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
