import { ruleAt } from "@/domain/investments/model";
import { settlementWallet } from "@/domain/investments/portfolios";
import type {
  InvestmentBook,
  InvestmentTransaction,
} from "@/domain/investments/types";

type Kind = InvestmentTransaction["kind"];

export interface TransactionSelection {
  categoryId: string;
  cashCategoryId: string;
  /** Editor-only memory, so changing the type does not lose the portfolio. */
  portfolioId: string;
}

/** These types post to a wallet; every other type posts to a portfolio. */
export function isWalletKind(kind: Kind): boolean {
  return ["openingCash", "deposit", "withdraw", "transfer"].includes(kind);
}

function find(book: InvestmentBook | null, id: string) {
  return book?.categories.find((category) => category.id === id);
}

export function portfolioIdOf(
  book: InvestmentBook | null,
  categoryId: string,
): string {
  const category = find(book, categoryId);
  if (!category) return "";
  return category.kind === "investment"
    ? category.id
    : (category.parentCategoryId ?? "");
}

/** Carry the chosen portfolio or wallet across a transaction type change. */
export function selectionForKind(
  book: InvestmentBook | null,
  kind: Kind,
  current: TransactionSelection,
  date: string,
): TransactionSelection {
  const portfolioId =
    current.portfolioId || portfolioIdOf(book, current.categoryId);
  const selected = find(book, current.categoryId);
  const wallet = selected?.kind === "cash" ? selected : undefined;
  const isActive = (id: string) => {
    const category = find(book, id);
    return !!category && !!ruleAt(category, date)?.active;
  };
  const isWalletOf = (id: string, parent: string) =>
    !!parent && find(book, id)?.parentCategoryId === parent && isActive(id);

  if (isWalletKind(kind))
    return {
      portfolioId,
      categoryId:
        wallet && isActive(wallet.id)
          ? wallet.id
          : isWalletOf(current.cashCategoryId, portfolioId)
            ? current.cashCategoryId
            : settlementWallet(book, portfolioId, date),
      // For a transfer this is the destination, which the user must choose.
      cashCategoryId: "",
    };

  const targetId = wallet
    ? (wallet.parentCategoryId ?? "")
    : current.categoryId || portfolioId;
  const categoryId =
    find(book, targetId)?.kind === "investment" && isActive(targetId)
      ? targetId
      : "";
  const used = wallet?.id ?? current.cashCategoryId;
  return {
    portfolioId,
    categoryId,
    cashCategoryId: isWalletOf(used, categoryId)
      ? used
      : settlementWallet(book, categoryId, date),
  };
}

/** An explicit category choice replaces the remembered portfolio. */
export function selectionForCategory(
  book: InvestmentBook | null,
  kind: Kind,
  categoryId: string,
  current: TransactionSelection,
  date: string,
): TransactionSelection {
  return {
    categoryId,
    portfolioId: portfolioIdOf(book, categoryId),
    // Only trades submit a settlement wallet. Elsewhere leave the field alone,
    // so reverting a choice in an edit form is not reported as a change.
    cashCategoryId:
      kind === "buy" || kind === "sell"
        ? settlementWallet(book, categoryId, date)
        : current.cashCategoryId === categoryId
          ? ""
          : current.cashCategoryId,
  };
}
