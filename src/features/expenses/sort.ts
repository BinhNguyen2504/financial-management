import type { ExpenseRow } from "@/domain/expenses/types";

export const expenseSortKeys = [
  "name",
  "target",
  "opening",
  "required",
  "funded",
  "spent",
  "closing",
] as const;
export type ExpenseSortKey = (typeof expenseSortKeys)[number];
export interface ExpenseSort {
  /** Empty keeps the default order from the engine. */
  key: ExpenseSortKey | "";
  direction: "asc" | "desc";
}
export const defaultExpenseSort: ExpenseSort = { key: "", direction: "asc" };

export function validExpenseSort(value: unknown): value is ExpenseSort {
  if (!value || typeof value !== "object") return false;
  const { key, direction } = value as Record<string, unknown>;
  return (
    (key === "" || expenseSortKeys.some((item) => item === key)) &&
    (direction === "asc" || direction === "desc")
  );
}

/**
 * Header click order: names start A→Z and amounts start largest first; a second click reverses
 * and a third returns to the default order.
 */
export function nextSort(
  current: ExpenseSort,
  key: ExpenseSortKey,
): ExpenseSort {
  const first = key === "name" ? "asc" : "desc";
  if (current.key !== key) return { key, direction: first };
  if (current.direction === first)
    return { key, direction: first === "asc" ? "desc" : "asc" };
  return defaultExpenseSort;
}

/** "Đã bỏ hũ" is the regular funding plus the extra top-up, as shown in the table. */
function amount(row: ExpenseRow, key: Exclude<ExpenseSortKey, "name">): bigint {
  return key === "funded"
    ? BigInt(row.funding) + BigInt(row.extra)
    : BigInt(row[key]);
}

/** Returns a new array; equal values keep the engine's order so the result is stable. */
export function sortExpenseRows(
  rows: ExpenseRow[],
  sort: ExpenseSort,
  locale: string,
): ExpenseRow[] {
  const { key } = sort;
  if (!key) return rows;
  const sign = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      let order: number;
      if (key === "name") order = a.row.name.localeCompare(b.row.name, locale);
      else {
        const left = amount(a.row, key);
        const right = amount(b.row, key);
        order = left < right ? -1 : left > right ? 1 : 0;
      }
      return order * sign || a.index - b.index;
    })
    .map(({ row }) => row);
}
