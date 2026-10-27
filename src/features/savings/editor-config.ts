import { type SavingsTransaction } from "@/domain/savings/schema";
import type { SavingsCategory } from "@/domain/savings/types";

export const transactionNames: Record<SavingsTransaction["kind"], string> = {
  openingCash: "Số dư tiền mở đầu",
  openingDeposit: "Sổ tiền gửi mở đầu",
  openingGold: "Vàng mở đầu",
  deposit: "Nạp tiền từ ngoài",
  withdraw: "Rút tiền ra ngoài",
  transfer: "Chuyển tiền nội bộ",
  openDeposit: "Mở sổ tiền gửi",
  withdrawDeposit: "Rút gốc / tất toán",
  interest: "Nhận lãi",
  rollover: "Tái tục sổ",
  buyGold: "Mua vàng",
  sellGold: "Bán vàng",
  fee: "Phí từ ví tiền",
};
export const kindNames = {
  cash: "Tiền / ví",
  deposit: "Tiền gửi",
  gold: "Vàng",
};
export type EditorMode =
  | { type: "create" }
  | { type: "configure" | "archive" | "restore"; category: SavingsCategory }
  | {
      type: "transaction";
      transaction?: SavingsTransaction;
      categoryId?: string;
      kind?: SavingsTransaction["kind"];
    }
  | { type: "void"; transaction: SavingsTransaction }
  | { type: "price"; categoryId?: string }
  | { type: "close" | "reopen" };
export const titles = {
  create: "Thêm danh mục",
  configure: "Sửa danh mục",
  archive: "Lưu trữ danh mục",
  restore: "Khôi phục danh mục",
  transaction: "Ghi giao dịch",
  void: "Hủy giao dịch",
  price: "Cập nhật giá vàng",
  close: "Chốt tháng",
  reopen: "Mở lại tháng",
};
