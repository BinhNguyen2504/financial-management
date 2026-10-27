import type { InvestmentBook, InvestmentCategory } from "./types";
export { endOfMonth, previousDate, nextMonth } from "../shared/dates";
export { savingsClock as investmentClock } from "../shared/clock";
export class InvestmentError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
  ) {
    super(message);
  }
}
export const fail = (message: string): never => {
  throw new InvestmentError(message);
};
export function emptyBook(): InvestmentBook {
  return { version: 0, categories: [], revisions: [], audit: [] };
}
export function ruleAt(
  c: InvestmentCategory,
  date: string,
  sequence = Infinity,
) {
  return c.rules
    .filter((r) => r.date < date || (r.date === date && r.sequence <= sequence))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence)
    .at(-1);
}
export function activeTransactions(book: InvestmentBook) {
  const latest = new Map<string, InvestmentBook["revisions"][number]>();
  const originals = new Map<string, number>();
  for (const r of book.revisions) {
    latest.set(r.rootId, r);
    if (r.id === r.rootId) originals.set(r.rootId, r.sequence);
  }
  return [...latest.values()]
    .filter((r) => r.transaction)
    .map((r) => ({
      transaction: r.transaction!,
      sequence: originals.get(r.rootId)!,
      revision: r,
    }))
    .sort(
      (a, b) =>
        a.transaction.date.localeCompare(b.transaction.date) ||
        a.sequence - b.sequence,
    );
}
