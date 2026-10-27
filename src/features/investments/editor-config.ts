import { type InvestmentTransaction } from "@/domain/investments/schema";

export const transactionNames: Record<InvestmentTransaction["kind"], string> = {
  openingCash: "Số dư ví mở đầu",
  openingInvestment: "Tài sản mở đầu",
  deposit: "Nạp tiền",
  withdraw: "Rút tiền",
  transfer: "Chuyển ví",
  buy: "Mua",
  sell: "Bán",
  valuation: "Định giá",
};
export type EditorMode = { categoryId?: string } & (
  | {
      type: "create" | "configure" | "archive" | "restore";
      categoryId?: string;
    }
  | {
      type: "transaction";
      kind?: InvestmentTransaction["kind"];
      categoryId?: string;
    }
  | { type: "revise" | "cancel"; transaction: InvestmentTransaction }
);
