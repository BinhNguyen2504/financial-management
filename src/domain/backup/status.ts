import { backupTables, moduleLabels, type BackupTable } from "./format";

const tableLabels: Record<BackupTable, string> = {
  expense_books: "Sổ chi tiêu",
  expense_jars: "Khoản chi",
  expense_month_inputs: "Thiết lập và số tiền theo tháng",
  expense_spends: "Giao dịch chi tiêu (kể cả đã xóa)",
  expense_years: "Năm và kỳ đã chốt",
  expense_labels: "Phương thức và nhóm chi tiêu",
  expense_audit: "Lịch sử thay đổi",
  expense_commands: "Thông tin xử lý đã lưu",
  income_books: "Sổ thu nhập",
  income_categories: "Khoản thu (kể cả đã xóa)",
  income_monthly: "Thu nhập theo tháng (kể cả số tiền 0)",
  income_oneoffs: "Thu nhập phát sinh (kể cả đã xóa)",
  income_audit: "Lịch sử thay đổi",
  income_commands: "Thông tin xử lý đã lưu",
  savings_books: "Sổ tiết kiệm",
  savings_categories: "Danh mục tiết kiệm (kể cả ngừng sử dụng)",
  savings_transactions: "Phiên bản giao dịch (kể cả đã hủy)",
  savings_allocations: "Liên kết lô vàng",
  savings_prices: "Lịch sử giá vàng",
  savings_closes: "Lịch sử chốt và mở kỳ",
  savings_audit: "Lịch sử thay đổi",
  savings_commands: "Thông tin xử lý đã lưu",
  investments_books: "Sổ đầu tư",
  investments_categories: "Danh mục đầu tư (kể cả ngừng sử dụng)",
  investments_transactions: "Phiên bản giao dịch (kể cả đã hủy)",
  investments_valuations: "Phiên bản định giá",
  investments_audit: "Lịch sử thay đổi",
  investments_commands: "Thông tin xử lý đã lưu",
  funds_books: "Sổ quỹ",
  funds_definitions: "Quỹ đã thiết lập",
  funds_locations: "Nơi giữ tiền (kể cả ngừng sử dụng)",
  funds_configurations: "Lịch sử cấu hình quỹ",
  funds_transactions: "Phiên bản giao dịch (kể cả đã hủy)",
  funds_audit: "Lịch sử thay đổi",
  funds_commands: "Thông tin xử lý đã lưu",
};
const modulePaths = {
  expense: "/budgets",
  income: "/income",
  savings: "/savings",
  investments: "/investments",
  funds: "/funds",
};

export function restoreBlockers(counts: Partial<Record<BackupTable, number>>) {
  return Object.entries(moduleLabels).map(([key, label]) => {
    const details = backupTables
      .filter(
        (table) => table.startsWith(key + "_") && (counts[table] ?? 0) > 0,
      )
      .map((table) => ({
        table,
        label: tableLabels[table],
        count: counts[table]!,
      }));
    return {
      key,
      label,
      href: modulePaths[key as keyof typeof modulePaths],
      count: details.reduce((total, item) => total + item.count, 0),
      details,
    };
  });
}

export function restoreReasons(empty: boolean, importReady: boolean) {
  return [
    ...(!empty ? ["ACCOUNT_NOT_EMPTY"] : []),
    ...(!importReady ? ["IMPORT_NOT_READY"] : []),
  ];
}

export type RestoreBlocker = ReturnType<typeof restoreBlockers>[number];
