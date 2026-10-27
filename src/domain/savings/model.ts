import type { SavingsBook, SavingsCategory } from "./types";

export class SavingsError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_ACTION",
  ) {
    super(message);
  }
}
export { savingsClock } from "../shared/clock";
export const fail = (message: string): never => {
  throw new SavingsError(message);
};
export const scale = 1_000_000n;
export function quantity(v: string): bigint {
  const [a, b = ""] = v.split(".");
  return BigInt(a) * scale + BigInt(b.padEnd(6, "0"));
}
export function quantityText(v: bigint) {
  return `${v / scale}${v % scale ? `.${(v % scale).toString().padStart(6, "0").replace(/0+$/, "")}` : ""}`;
}
export const roundedValue = (q: bigint, price: bigint) =>
  (q * price + scale / 2n) / scale;
export { endOfMonth, previousDate, nextMonth } from "../shared/dates";
export function ruleAt(c: SavingsCategory, month: string) {
  return c.rules
    .filter((r) => r.month <= month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
}
export function activeTransactions(book: SavingsBook) {
  const latest = new Map<string, (typeof book.revisions)[number]>();
  for (const r of book.revisions) latest.set(r.rootId, r);
  const original = new Map(
    book.revisions
      .filter((r) => r.id === r.rootId)
      .map((r) => [r.rootId, r.sequence]),
  );
  return [...latest.values()]
    .filter((r) => r.transaction)
    .map((r) => ({
      transaction: r.transaction!,
      sequence: original.get(r.rootId) ?? r.sequence,
    }))
    .sort(
      (a, b) =>
        a.transaction.date.localeCompare(b.transaction.date) ||
        a.sequence - b.sequence,
    );
}
export function closedMonths(book: SavingsBook) {
  const closed = new Set<string>();
  for (const c of book.closes) {
    if (c.kind === "close") closed.add(c.month);
    else for (const m of closed) if (m >= c.month) closed.delete(m);
  }
  return [...closed].sort();
}
export function ensureOpen(book: SavingsBook, month: string) {
  if (closedMonths(book).some((m) => m >= month))
    throw new SavingsError(
      "Tháng này hoặc tháng sau đã chốt. Mở lại tháng bị ảnh hưởng trước khi sửa.",
      409,
      "MONTH_CLOSED",
    );
}
export function emptyBook(): SavingsBook {
  return {
    version: 0,
    categories: [],
    revisions: [],
    prices: [],
    closes: [],
    audit: [],
  };
}
