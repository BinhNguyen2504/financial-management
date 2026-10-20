type Issue = { path: readonly PropertyKey[]; message: string };

const hints: Record<string, string> = {
  name: "Nhập tên từ 1 đến 100 ký tự.",
  description: "Mô tả không được dài quá 1.000 ký tự.",
  note: "Ghi chú không được dài quá 1.000 ký tự.",
  reason: "Nhập lý do thay đổi để giữ lịch sử rõ ràng.",
  amount: "Nhập số tiền VND nguyên, không âm, tối đa 24 chữ số.",
  fee: "Nhập phí bằng số tiền VND nguyên; nhập 0 nếu không có phí.",
  tax: "Nhập thuế bằng số tiền VND nguyên; nhập 0 nếu không có thuế.",
  value: "Nhập giá trị bằng số tiền VND nguyên, không âm.",
  cost: "Nhập giá vốn bằng số tiền VND nguyên, không âm.",
  quantity: "Nhập số lượng dương, tối đa 6 chữ số sau dấu thập phân.",
  unitPrice: "Nhập đơn giá bằng số tiền VND nguyên, không âm.",
  month: "Chọn tháng hợp lệ trong thời gian được phép.",
  start: "Chọn thời điểm bắt đầu hợp lệ.",
  date: "Chọn ngày hợp lệ trong thời gian được phép.",
  maturity: "Chọn ngày đáo hạn hợp lệ.",
  occurredAt: "Chọn thời điểm giao dịch hợp lệ theo giờ Việt Nam.",
  categoryId: "Chọn một danh mục có sẵn.",
  cashCategoryId: "Chọn ví tiền phù hợp hoặc để trống nếu không bắt buộc.",
  contractId: "Chọn một sổ tiền gửi có sẵn.",
  locationId: "Chọn nơi giữ tiền có sẵn.",
  toLocationId: "Chọn nơi nhận tiền có sẵn.",
  emoji: "Chọn hoặc nhập một biểu tượng hợp lệ.",
  unit: "Chọn đơn vị vàng trong danh sách.",
};

/** Keep domain-specific Vietnamese messages; translate generic schema diagnostics for forms. */
export function fieldErrorsFromIssues(
  issues: readonly Issue[],
  fullPath = false,
) {
  return Object.fromEntries(
    issues.map((issue) => {
      const field = String(issue.path.at(-1) ?? "form");
      const key = fullPath ? issue.path.map(String).join(".") : field;
      const message =
        /^(Invalid|Too |Expected|Unrecognized|Input |Required)/i.test(
          issue.message,
        )
          ? (hints[field] ?? "Kiểm tra thông tin và chọn giá trị hợp lệ.")
          : issue.message;
      return [key, message];
    }),
  );
}
