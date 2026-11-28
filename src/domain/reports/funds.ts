import { activeTransactions, linkedBalances, replay } from "../funds/engine";
import { savingsSources } from "../funds/savings-sources";
import type { FundBook } from "../funds/types";
import type { SavingsBook } from "../savings/types";

/** Latest corrections are resolved before the business-time cutoff, including cancellations. */
export function fundBookAt(
  book: FundBook | null,
  date: string,
): FundBook | null {
  if (!book) return null;
  const cutoff = Date.parse(`${date}T23:59:59.999+07:00`);
  return {
    ...book,
    configurations: book.configurations.filter(
      (c) => Date.parse(c.at) <= cutoff,
    ),
    // A Savings link counts only while it applied, with the fund it fed at that time.
    locations: book.locations.map((l) => {
      if (!l.savings) return l;
      const state = l.linkHistory
        ?.filter((h) => Date.parse(h.at) <= cutoff)
        .at(-1);
      return state
        ? {
            ...l,
            active: state.active,
            savings: { ...l.savings, fundId: state.fundId },
          }
        : { ...l, active: false };
    }),
    revisions: activeTransactions(book)
      .filter(({ transaction }) => Date.parse(transaction.occurredAt) <= cutoff)
      .map(({ transaction, sequence }) => ({
        id: transaction.id,
        rootId: transaction.id,
        sequence,
        transaction,
        reason: "",
      })),
  };
}
export function fundLinkedAt(
  book: FundBook | null,
  date: string,
  savings: SavingsBook | null,
) {
  const at = fundBookAt(book, date);
  return at?.locations.some((l) => l.active && l.savings)
    ? linkedBalances(at, savingsSources(savings, date))
    : {};
}
export const fundsAt = (
  book: FundBook | null,
  date: string,
  savings: SavingsBook | null = null,
) => replay(fundBookAt(book, date), fundLinkedAt(book, date, savings));
