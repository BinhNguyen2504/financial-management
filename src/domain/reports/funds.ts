import { activeTransactions, replay } from "../funds/engine";
import type { FundBook } from "../funds/types";

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
export const fundsAt = (book: FundBook | null, date: string) =>
  replay(fundBookAt(book, date));
