import { parseArgs } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "./lib/fund-review-data";
import type { InvestmentReviewData } from "./lib/investment-cloud-review.mjs";
import type { Jar } from "../src/domain/expenses/types";

const { values } = parseArgs({
  options: { base: { type: "string" }, snapshot: { type: "string" } },
});
if (!values.base || !values.snapshot)
  throw new Error(
    "Dùng --base <Investment sample-data.json> --snapshot <owner inspection backup.json>.",
  );
const base: InvestmentReviewData = JSON.parse(
  await readFile(values.base, "utf8"),
);
const snapshot = JSON.parse(await readFile(values.snapshot, "utf8"));
if (
  snapshot.ownerId !== base.ownerId ||
  snapshot.format !== "financial-manager-owner-inspection-backup"
)
  throw new Error("Snapshot và bộ mẫu phải cùng owner, đúng định dạng.");
const header = snapshot.tables.expense_books?.[0];
if (!header) throw new Error("Snapshot không có sổ Chi tiêu.");
const expenses = {
  ...base.expenses,
  start: header.start_month,
  version: header.version,
  jars: snapshot.tables.expense_jars.map(
    (j: {
      id: string;
      kind: Jar["kind"];
      start_month: string;
      opening: string;
      rules: Jar["rules"];
    }) => ({
      id: j.id,
      kind: j.kind,
      start: j.start_month,
      opening: String(j.opening),
      rules: j.rules,
    }),
  ),
};
const data = buildFundReviewData(base, { expenses });
const sql = buildFundReviewSQL(data, {
  migrationSQL: await readFile(
    "supabase/migrations/202610190001_funds.sql",
    "utf8",
  ),
});
const directory = resolve(
  "imports",
  `funds-review-${data.fundToday}-${data.datasetId.slice(0, 8)}`,
);
await mkdir(directory, { recursive: true, mode: 0o700 });
const readme = `# Fund — dữ liệu review riêng tư

Owner: ${data.ownerId}
Dataset: ${data.datasetId}
Ngày: ${data.fundToday}

Tham khảo Notion/fund-1.png, fund-2.png và phần Living Expenses trong goal.png. Không tạo Financial Goals. Toàn bộ giao dịch, số dư và ngày là dữ liệu minh họa, không phải tài sản thực.

Living expense đã chụp: ${data.funds.configurations[0].living.total} VND/tháng, từ 5 hũ đang hoạt động: ${data.references.livingJarNames.join(", ")}. Dùng mức cấu hình thực ở Chi tiêu, không ghi đè thành 9 triệu như ảnh. Hệ số cuối Emergency/Rainy Day/Sinking: 9/7/9. Mục tiêu tham khảo: 54/42/54 triệu. Giữ nguyên bốn module đã có.

| Quỹ | Số dư mẫu | Mục tiêu | Tiến độ |
|---|---:|---:|---:|
${data.expected.funds.map((f) => `| ${f.id} | ${f.balance} | ${f.target} | ${f.percent}% |`).join("\n")}

Các case: số dư ban đầu; góp định kỳ; rút và bổ sung; chuyển nội bộ nơi giữ; chuyển liên quỹ; sửa khoản góp; hủy bản ghi trùng; hai phiên bản mục tiêu; 6 nơi giữ gồm một nơi ngừng sử dụng và một nơi chưa có tiền. Hơn 20 giao dịch để review phân trang, tìm kiếm và bộ lọc. Ưu tiên Rainy Day đã đủ nên bước tiếp theo là Emergency.

## Áp dụng

1. Kiểm tra đúng project Supabase và owner; chạy 00-inspect.sql (chỉ đọc).
2. Nếu chưa có 7 bảng Fund, chạy 01-enable-and-seed.sql bằng SQL Editor/migration role. File kiểm tra marker bốn module và owner Auth, tạo schema khi cả 7 bảng đều thiếu, seed trong cùng giao dịch. Schema dở dang hoặc nguồn Chi tiêu đổi sẽ từ chối và rollback. Không nâng quyền expense_api.
3. Nếu schema đã có: npm run data:funds:import -- --file ${join(directory, "sample-data.json")} --apply. Mặc định bỏ --apply để kiểm tra. CLI sao lưu đúng owner trước khi ghi và đọc lại bằng RLS.
4. Đăng nhập đúng UID, mở /funds. Chạy 00-inspect.sql để đối soát. Seed lại giữ các chỉnh sửa review, không ghi đè. Tháng hoặc phiên bản nguồn đổi trước lần seed đầu thì tạo lại package từ snapshot mới.

## Reset sau khi duyệt UI/UX — chưa được thực hiện

Chỉ sau xác nhận riêng: xuất backup trong Cài đặt (cần migration data_imports cho restore), hoặc lưu kết quả 02-backup.sql. SQL backup là bản chụp vận hành, không phải file nhập trực tiếp trong ứng dụng.

03-reset.sql mặc định NOT_CONFIRMED và từ chối chạy. Sau duyệt UI/UX, thay đúng giá trị thành RESET REVIEW ${data.ownerId}. File kiểm tra marker cả 5 module, khóa ghi, chụp thêm backup trước xóa và xóa dữ liệu tài chính của đúng owner ở 35 bảng cùng biên nhận data_imports nếu có. Bảo toàn Auth/profile, owner khác; lỗi rollback cả dữ liệu lẫn trạng thái trigger. Lưu kết quả backup_before_reset. Không chạy reset trong lần nạp mẫu.

Không có thông tin đăng nhập trong package. File local không chứng minh cloud đã được áp dụng.
`;
for (const [name, content] of Object.entries({
  "00-inspect.sql": sql.inspect,
  "01-enable-and-seed.sql": sql.enable!,
  "02-backup.sql": sql.backup,
  "03-reset.sql": sql.reset,
  "04-seed-funds-only.sql": sql.seed,
  "sample-data.json": JSON.stringify(data, null, 2) + "\n",
  "README.md": readme,
}))
  await writeFile(join(directory, name), content, { flag: "wx", mode: 0o600 });
console.log(
  JSON.stringify(
    {
      directory,
      ownerId: data.ownerId,
      livingExpense: data.funds.configurations[0].living.total,
      state: data.expected,
    },
    null,
    2,
  ),
);
