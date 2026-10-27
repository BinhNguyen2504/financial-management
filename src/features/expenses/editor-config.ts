import type { ExpenseRow, Label, Spend } from "@/domain/expenses/types";

export type EditorMode =
  | { mode: "initialize" | "create" }
  | { mode: "month" | "configure" | "stop" | "emoji"; row: ExpenseRow }
  | { mode: "spend"; row: ExpenseRow; spend?: Spend }
  | { mode: "deleteSpend"; spend: Spend }
  | { mode: "label"; label?: Label }
  | { mode: "deleteLabel"; label: Label }
  | { mode: "closeYear"; year: number };
export const titles: Record<EditorMode["mode"], string> = {
  emoji: "Đổi biểu tượng",
  initialize: "Bắt đầu quản lý chi tiêu",
  create: "Thêm hũ chi tiêu",
  month: "Điều chỉnh tháng",
  configure: "Sửa hũ và mức mặc định",
  stop: "Ngừng cấp tiền cho hũ",
  spend: "Sử dụng tiền tích lũy",
  deleteSpend: "Xóa lần sử dụng",
  label: "Phương thức và nhóm",
  deleteLabel: "Xóa phân loại",
  closeYear: "Chốt và lưu năm",
};
