import type {
  InvestmentBook,
  InvestmentState,
  PortfolioPosition,
} from "./types";
import { defaultWalletId, ruleAt } from "./model";

/** Database row ordering must not change which wallet is selected for a trade. */
export function settlementWallet(
  book: InvestmentBook | null,
  categoryId: string | undefined,
  date: string,
): string {
  if (!book || !categoryId) return "";
  const creation = book.audit.find(
    (a) => a.action.type === "createCategory" && a.action.id === categoryId,
  )?.action;
  const preferred =
    creation?.type === "createCategory"
      ? (creation.walletId ?? defaultWalletId(categoryId))
      : defaultWalletId(categoryId);
  const wallets = book.categories
    .filter(
      (c) =>
        c.kind === "cash" &&
        c.parentCategoryId === categoryId &&
        c.start <= date &&
        ruleAt(c, date)?.active,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return wallets.find((c) => c.id === preferred)?.id ?? wallets[0]?.id ?? "";
}

/** Group wallets for display; the underlying ledger positions remain independent. */
export function portfolioPositions(
  book: InvestmentBook | null,
  state: InvestmentState,
): PortfolioPosition[] {
  return state.positions
    .filter((p) => p.kind === "investment")
    .map((p) => {
      const walletIds = new Set(
        book?.categories
          .filter((c) => c.kind === "cash" && c.parentCategoryId === p.id)
          .map((c) => c.id),
      );
      const wallets = state.positions.filter((w) => walletIds.has(w.id));
      const cash = wallets.reduce((n, w) => n + BigInt(w.cash), 0n).toString();
      return {
        ...p,
        cash,
        wallets,
        total:
          p.value === null ? null : (BigInt(p.value) + BigInt(cash)).toString(),
      };
    });
}
