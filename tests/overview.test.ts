import { describe, it, expect, vi } from "vitest";
import { defaultLayout, layoutSchema } from "../src/domain/overview/layout";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
  type OverviewData,
} from "../src/domain/overview/summary";
import { readOverview } from "../src/application/overview";
import { toView as expenseView } from "../src/domain/expenses/engine";
import { toView as incomeView } from "../src/domain/income/engine";
import { toView as savingsView } from "../src/domain/savings/engine";
import { toView as investmentView } from "../src/domain/investments/engine";
import { toView as fundView } from "../src/domain/funds/engine";
import type { IncomeView } from "../src/domain/income/types";
import type { ExpenseRow } from "../src/domain/expenses/types";
const clock = { today: "2026-10-29", now: "2026-10-29T00:00:00.000Z" };
function empty(): OverviewData {
  return {
    expenses: expenseSummary(expenseView(null, clock)),
    income: incomeSummary(incomeView(null, 2026, clock)),
    savings: savingsSummary(savingsView(null, clock.today, clock)),
    investments: investmentSummary(investmentView(null, clock.today, clock)),
    funds: fundSummary(
      fundView(null, { expenseVersion: 0, month: "2026-10", items: [] }, clock),
    ),
  };
}
describe("overview contracts and financial summaries", () => {
  it("has six defaults and rejects duplicate, unknown and excessive selections", () => {
    expect(defaultLayout().widgets).toEqual([
      "attention",
      "income",
      "expenses",
      "savings",
      "investments",
      "funds",
    ]);
    const { revision, ...layout } = defaultLayout();
    expect(revision).toBe(0);
    expect(layoutSchema.parse(layout)).toBeDefined();
  });
  it("accepts an empty layout, limits watched jars, and validates persisted schema", () => {
    const base = { schemaVersion: 1, widgets: [], jarIds: [] };
    expect(layoutSchema.parse(base).widgets).toEqual([]);
    for (const extra of [
      { widgets: ["income", "income"] },
      { widgets: ["networth"] },
      {
        jarIds: Array.from(
          { length: 6 },
          (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        ),
      },
      { schemaVersion: 2 },
    ])
      expect(layoutSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  });
  it("keeps missing income distinct from a recorded zero and excludes other periods", () => {
    const view: IncomeView = {
      book: null,
      year: 2026,
      today: clock.today,
      rows: [
        {
          key: "a",
          categoryId: "a",
          kind: "fixed",
          month: "2026-10",
          name: "Salary",
          description: "",
          amount: null,
          note: "",
          active: true,
        },
        {
          key: "b",
          categoryId: "b",
          kind: "fixed",
          month: "2026-10",
          name: "Other",
          description: "",
          amount: "0",
          note: "",
          active: true,
        },
        {
          key: "c",
          categoryId: null,
          kind: "oneoff",
          month: "2026-09",
          name: "Old",
          description: "",
          amount: "9999",
          note: "",
          active: true,
        },
      ],
    };
    expect(incomeSummary(view)).toMatchObject({
      total: "0",
      fixed: "0",
      oneoff: null,
      missing: 1,
    });
    expect(incomeSummary({ ...view, rows: [view.rows[0]] }).total).toBeNull();
  });
  it("uses jar reports with exact sums and preserves provisional status and overspending", () => {
    const row: ExpenseRow = {
      jarId: "j",
      month: "2026-10",
      kind: "monthly",
      name: "Food",
      description: "",
      method: "",
      group: "Living",
      active: true,
      target: "9007199254740993",
      opening: "0",
      required: "0",
      funding: "0",
      extra: "0",
      available: "0",
      spent: "9007199254740994",
      closing: "5",
      over: "1",
      status: "provisional",
    };
    const result = expenseSummary({
      book: null,
      currentYear: 2026,
      today: clock.today,
      rows: [row, { ...row, month: "2026-09", spent: "999" }],
    });
    expect(result.total).toMatchObject({
      spent: "9007199254740994",
      provisional: true,
      closing: "5",
    });
    expect(result.groups).toEqual([
      { name: "Living", value: "9007199254740994", unlabeled: false },
    ]);
    expect(result.over).toBe(1);
  });
  it("preserves unknown valuation instead of turning an incomplete total into zero", () => {
    const view = savingsView(null, clock.today, clock);
    view.state = {
      ...view.state,
      total: null,
      knownValue: "1200",
      missing: ["g"],
      positions: [
        {
          id: "g",
          name: "Gold",
          emoji: "",
          description: "",
          kind: "gold",
          unit: "chi",
          active: true,
          cash: "0",
          quantity: "1",
          cost: "500",
          value: null,
          price: null,
          priceDate: null,
          stale: true,
          unrealized: null,
        },
      ],
    };
    const result = savingsSummary(view);
    expect(result).toMatchObject({
      total: null,
      knownValue: "1200",
      missing: 1,
      stale: 1,
    });
    expect(result.kinds.find((k) => k.kind === "gold")?.value).toBeNull();
    const investment = investmentView(null, clock.today, clock);
    investment.state = {
      ...investment.state,
      positions: [
        {
          id: "i",
          name: "Stock",
          emoji: "",
          description: "",
          kind: "investment",
          active: true,
          cash: "0",
          cost: "100",
          value: null,
          valueDate: null,
          stale: true,
          unrealized: null,
          realized: "0",
          roi: null,
        },
      ],
      total: null,
      missing: ["i"],
    };
    expect(investmentSummary(investment)).toMatchObject({
      total: null,
      value: null,
      unrealized: null,
      cost: "100",
      cash: "0",
    });
  });
  it("loads each necessary source once, omits hidden sources and isolates errors", async () => {
    const data = empty(),
      loaders = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, vi.fn(async () => v)]),
      ) as {
        [K in keyof OverviewData]: ReturnType<
          typeof vi.fn<() => Promise<OverviewData[K]>>
        >;
      };
    loaders.income.mockRejectedValue(new Error("private diagnostic"));
    const result = await readOverview(
      ["income", "expenses", "allocation", "jars"],
      loaders,
      clock,
    );
    expect(loaders.expenses).toHaveBeenCalledTimes(1);
    expect(loaders.savings).not.toHaveBeenCalled();
    expect(result.sources.income).toEqual({ status: "error" });
    expect(JSON.stringify(result)).not.toContain("private diagnostic");
    expect(result.sources.expenses?.status).toBe("ready");
    const all = await readOverview(["attention"], loaders, clock);
    expect(Object.keys(all.sources)).toHaveLength(5);
    const none = await readOverview(["peace"], loaders, clock);
    expect(none.sources).toEqual({});
  });
});
