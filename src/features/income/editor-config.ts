import type { IncomeCategory, IncomeRow } from "@/domain/income/types";

export type EditorMode =
  | { type: "create" }
  | { type: "configure" | "stop" | "deleteCategory"; category: IncomeCategory }
  | { type: "monthly" | "clear"; row: IncomeRow }
  | { type: "oneoff"; row?: IncomeRow }
  | { type: "deleteOneOff"; row: IncomeRow };
export const titles = {
  create: "Thêm danh mục cố định",
  configure: "Sửa danh mục",
  stop: "Ngừng danh mục",
  deleteCategory: "Xóa danh mục",
  monthly: "Nhập thu nhập tháng",
  clear: "Xóa số thu đã nhập",
  oneoff: "Khoản thu phát sinh",
  deleteOneOff: "Xóa khoản thu phát sinh",
};
