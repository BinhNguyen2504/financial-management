import {
  type SavingsAction,
  type SavingsTransaction,
} from "@/domain/savings/schema";
import type { SavingsCategory } from "@/domain/savings/types";

export const auditActionNames: Record<SavingsAction["type"], string> = {
  createCategory: "Thêm danh mục",
  configureCategory: "Sửa danh mục",
  archiveCategory: "Lưu trữ danh mục",
  restoreCategory: "Khôi phục danh mục",
  postTransaction: "Ghi giao dịch",
  reviseTransaction: "Sửa hoặc hủy giao dịch",
  setPrice: "Cập nhật giá vàng",
  closeMonth: "Chốt tháng",
  reopenMonth: "Mở lại tháng",
};

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
export const transactionHints: Record<SavingsTransaction["kind"], string> = {
  openingCash:
    "Số tiền đã có trong ví khi bắt đầu theo dõi, không tính là tiền nạp mới.",
  openingDeposit:
    "Sổ đã gửi từ trước khi bắt đầu theo dõi, không tính là tiền nạp mới.",
  openingGold:
    "Vàng đã có từ trước khi bắt đầu theo dõi, không tính là tiền nạp mới.",
  deposit: "Đưa tiền từ bên ngoài Tiết kiệm vào ví này.",
  withdraw: "Lấy tiền từ ví này ra khỏi Tiết kiệm, ví dụ để chi tiêu.",
  transfer: "Chuyển tiền từ ví này sang một ví khác trong Tiết kiệm.",
  openDeposit: "Gửi một sổ mới bằng tiền từ ví Tiết kiệm hoặc từ bên ngoài.",
  withdrawDeposit:
    "Rút một phần hoặc toàn bộ tiền gốc của sổ, kèm tiền lãi thực nhận.",
  interest: "Ghi tiền lãi của sổ đang gửi: cộng vào gốc hoặc nhận tiền.",
  rollover:
    "Tất toán sổ cũ và mở sổ mới bằng tiền gốc, có thể gửi tiếp một phần lãi.",
  buyGold: "Mua thêm vàng; mỗi lần mua được theo dõi thành một đợt riêng.",
  sellGold: "Bán vàng từ các đợt đang giữ và tính lãi/lỗ cho phần đã bán.",
  fee: "Khoản phí bị trừ thẳng vào ví này.",
};
export const transactionKindsByAsset: Record<
  SavingsCategory["kind"],
  SavingsTransaction["kind"][]
> = {
  cash: ["openingCash", "deposit", "withdraw", "transfer", "fee"],
  deposit: [
    "openingDeposit",
    "openDeposit",
    "withdrawDeposit",
    "interest",
    "rollover",
  ],
  gold: ["openingGold", "buyGold", "sellGold"],
};
export const defaultTransactionKinds: Record<
  SavingsCategory["kind"],
  SavingsTransaction["kind"]
> = { cash: "deposit", deposit: "openDeposit", gold: "buyGold" };
export function assetOfTransaction(
  kind: SavingsTransaction["kind"],
): SavingsCategory["kind"] {
  if (transactionKindsByAsset.gold.includes(kind)) return "gold";
  return transactionKindsByAsset.deposit.includes(kind) ? "deposit" : "cash";
}
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
