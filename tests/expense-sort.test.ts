import { describe, expect, it } from "vitest";
import type { ExpenseRow } from "../src/domain/expenses/types";
import {
  defaultExpenseSort,
  nextSort,
  sortExpenseRows,
  validExpenseSort,
} from "../src/features/expenses/sort";

const row = (name: string, fields: Partial<ExpenseRow> = {}) =>
  ({
    jarId: name,
    name,
    target: "0",
    opening: "0",
    required: "0",
    funding: "0",
    extra: "0",
    spent: "0",
    closing: "0",
    ...fields,
  }) as ExpenseRow;

const names = (rows: ExpenseRow[]) => rows.map((r) => r.name);

describe("expense table sorting", () => {
  const rows = [
    row("B", { target: "2000000", funding: "100", extra: "0" }),
    row("A", { target: "10", funding: "50", extra: "400" }),
    row("C", { target: "999999999999999999999", funding: "0", extra: "0" }),
  ];

  it("keeps the engine order when no key is chosen", () => {
    expect(sortExpenseRows(rows, defaultExpenseSort, "vi")).toBe(rows);
  });

  it("compares money exactly as BigInt in both directions without mutating the input", () => {
    const before = names(rows);
    expect(
      names(sortExpenseRows(rows, { key: "target", direction: "asc" }, "vi")),
    ).toEqual(["A", "B", "C"]);
    expect(
      names(sortExpenseRows(rows, { key: "target", direction: "desc" }, "vi")),
    ).toEqual(["C", "B", "A"]);
    expect(names(rows)).toEqual(before);
  });

  it("sorts 'Đã bỏ hũ' by funding plus the extra top-up", () => {
    expect(
      names(sortExpenseRows(rows, { key: "funded", direction: "desc" }, "vi")),
    ).toEqual(["A", "B", "C"]);
  });

  it("sorts names with the Vietnamese collation and keeps ties stable", () => {
    const sorted = sortExpenseRows(
      [row("Điện"), row("Ăn uống"), row("Bia")],
      { key: "name", direction: "asc" },
      "vi",
    );
    expect(names(sorted)).toEqual(["Ăn uống", "Bia", "Điện"]);
    const ties = [
      row("x", { spent: "5" }),
      row("y", { spent: "5" }),
      row("z", { spent: "1" }),
    ];
    expect(
      names(sortExpenseRows(ties, { key: "spent", direction: "desc" }, "vi")),
    ).toEqual(["x", "y", "z"]);
  });

  it("rejects stale or edited session values", () => {
    expect(validExpenseSort({ key: "target", direction: "asc" })).toBe(true);
    expect(validExpenseSort(defaultExpenseSort)).toBe(true);
    expect(validExpenseSort({ key: "nope", direction: "asc" })).toBe(false);
    expect(validExpenseSort({ key: "target", direction: "up" })).toBe(false);
    expect(validExpenseSort(null)).toBe(false);
  });
});

describe("header click order", () => {
  it("starts amounts largest first, then reverses, then returns to the default order", () => {
    let sort = nextSort(defaultExpenseSort, "target");
    expect(sort).toEqual({ key: "target", direction: "desc" });
    sort = nextSort(sort, "target");
    expect(sort).toEqual({ key: "target", direction: "asc" });
    expect(nextSort(sort, "target")).toEqual(defaultExpenseSort);
    expect(nextSort(sort, "spent")).toEqual({
      key: "spent",
      direction: "desc",
    });
  });
  it("starts names A to Z", () => {
    let sort = nextSort(defaultExpenseSort, "name");
    expect(sort).toEqual({ key: "name", direction: "asc" });
    sort = nextSort(sort, "name");
    expect(sort).toEqual({ key: "name", direction: "desc" });
    expect(nextSort(sort, "name")).toEqual(defaultExpenseSort);
  });
});
