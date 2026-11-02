import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildReport, reportDetails } from "../src/domain/reports/build";
import {
  parseQuery,
  periodFor,
  reportSources,
  type ReportInput,
  type Books,
} from "../src/domain/reports/model";
import { fundBookAt, fundsAt } from "../src/domain/reports/funds";
import { reportCSV } from "../src/i18n/report-exports/reports";
import { english } from "../src/i18n/messages";
import { buildInvestmentReviewData } from "../scripts/lib/investment-review-data.mjs";
import { materialize } from "../src/domain/expenses/engine";
import type { FundBook } from "../src/domain/funds/types";

const clock = { today: "2026-11-02", now: "2026-11-02T04:00:00.000Z" };
const base = (
  books: Partial<Books> = {},
  errors: ReportInput["errors"] = [],
): ReportInput => ({ books, errors, generation: 0 });
const query = (extra = {}) => parseQuery(extra, clock);
const metric = (result: ReturnType<typeof buildReport>, id: string) =>
  result.report.metrics.find((m) => m.id === id)!;
function income(amount: string | null = "100"): Books["income"] {
  return {
    version: 1,
    categories: [
      {
        id: "salary",
        start: "2026-10",
        deleted: false,
        rules: [
          { month: "2026-10", name: "Salary", description: "", active: true },
        ],
      },
    ],
    monthly: [
      { categoryId: "salary", month: "2026-10", amount: "80", note: "" },
      ...(amount === null
        ? []
        : [{ categoryId: "salary", month: "2026-11", amount, note: "" }]),
    ],
    oneOffs: [],
    audit: [],
  };
}
function expenses(): NonNullable<Books["expenses"]> {
  return {
    version: 1,
    start: "2025-01",
    jars: [
      {
        id: "rent",
        kind: "monthly",
        start: "2025-01",
        opening: "0",
        rules: [
          {
            month: "2025-01",
            name: "Rent",
            description: "",
            active: true,
            amount: "50",
            group: "Living",
            method: "Bank",
          },
        ],
      },
      {
        id: "travel",
        kind: "accumulation",
        start: "2025-01",
        opening: "0",
        rules: [
          {
            month: "2025-01",
            name: "Travel",
            description: "",
            active: true,
            amount: "20",
            group: "Life",
            method: "Bank",
          },
        ],
      },
    ],
    inputs: [],
    spends: [],
    years: [],
    labels: [],
    audit: [],
  };
}
function funds(): FundBook {
  const location = randomUUID(),
    id = randomUUID();
  return {
    version: 4,
    funds: ["emergency", "rainy_day", "sinking"],
    locations: [{ id: location, name: "Bank", active: true }],
    configurations: [
      {
        id: randomUUID(),
        sequence: 1,
        at: "2026-09-01T00:00:00Z",
        living: {
          expenseVersion: 1,
          month: "2026-09",
          total: "100",
          items: [{ jarId: randomUUID(), name: "Living", amount: "100" }],
        },
        multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
        priority: ["emergency", "rainy_day", "sinking"],
      },
    ],
    revisions: [
      {
        id,
        rootId: id,
        sequence: 2,
        reason: "",
        transaction: {
          id,
          fundId: "emergency",
          locationId: location,
          amount: "1000",
          kind: "deposit",
          occurredAt: "2026-10-01T00:00:00Z",
          note: "",
        },
      },
    ],
    audit: [],
  };
}

describe("combined financial reports", () => {
  it("localizes every computed report title, metric and column rather than only literal UI calls", () => {
    const labels = new Set<string>();
    for (const tab of [
      "summary",
      "cashflow",
      "savings",
      "investments",
      "funds",
      "goals",
    ]) {
      const { report } = buildReport(base(), query({ tab }), clock);
      for (const m of report.metrics) labels.add(m.label);
      for (const table of report.tables) {
        labels.add(table.title);
        for (const c of table.columns) labels.add(c.label);
      }
    }
    expect(
      [...labels].filter((label) => !Object.hasOwn(english, label)),
    ).toEqual([]);
  });
  it("resolves previous months, quarters, years and leap years without day prorating", () => {
    expect(
      periodFor(query({ year: 2028, month: 2 }), {
        ...clock,
        today: "2028-03-01",
      }).to,
    ).toBe("2028-02-29");
    expect(
      periodFor(query({ year: 2026, month: 1 }), clock, true),
    ).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
    expect(
      periodFor(query({ period: "quarter", month: 2 }), clock, true),
    ).toMatchObject({ from: "2025-10-01", to: "2025-12-31" });
    expect(periodFor(query({ period: "year" }), clock, true)).toMatchObject({
      from: "2025-01-01",
      to: "2025-12-31",
    });
    expect(periodFor(query(), clock)).toMatchObject({
      from: "2026-11-01",
      to: "2026-11-30",
      asOf: clock.today,
      partial: true,
    });
    expect(() => query({ month: 13 })).toThrow();
    expect(() => query({ year: "bad" })).toThrow();
  });
  it("requests only the dependencies of the selected tab", () => {
    expect(reportSources("cashflow")).toEqual(["income", "expenses"]);
    expect(reportSources("funds")).toEqual(["funds"]);
    expect(reportSources("goals")).toEqual([
      "savings",
      "investments",
      "funds",
      "goals",
    ]);
  });
  it("distinguishes absent data, unrecorded income, explicit zero and source failure", () => {
    const empty = buildReport(base(), query(), clock);
    expect(empty.report.sources.income).toMatchObject({
      empty: true,
      status: "ready",
    });
    expect(metric(empty, "income.total").value).toBeNull();
    const unrecorded = buildReport(
      base({ income: income(null) }),
      query(),
      clock,
    );
    expect(metric(unrecorded, "income.total").value).toBeNull();
    expect(unrecorded.report.warnings.join(" ")).toMatch(/chưa nhập/);
    expect(
      metric(
        buildReport(base({ income: income("0") }), query(), clock),
        "income.total",
      ),
    ).toMatchObject({
      value: "0",
      previous: "80",
      delta: "-80",
      percent: "-100.00",
    });
    const failed = buildReport(
      base({ income: income() }, ["expenses"]),
      query(),
      clock,
    );
    expect(failed.report.sources.expenses?.status).toBe("error");
    expect(metric(failed, "expenses.spent")).toBeUndefined();
    expect(metric(failed, "cashflow.difference")).toBeUndefined();
    expect(metric(failed, "income.total").value).toBe("100");
  });
  it("keeps exact integer totals and does not count accumulation funding as spending", () => {
    const amount = "999999999999999999999999";
    const result = buildReport(
      base({ income: income(amount), expenses: expenses() }),
      query({ tab: "cashflow" }),
      clock,
    );
    expect(metric(result, "income.total").value).toBe(amount);
    expect(metric(result, "expenses.spent").value).toBe("50");
    expect(metric(result, "expenses.funding").value).toBe("70");
    expect(metric(result, "cashflow.difference").value).toBe(
      (BigInt(amount) - 50n).toString(),
    );
    for (const m of result.report.metrics) {
      if (m.value !== null)
        expect(
          result.details[m.id]
            .reduce((n, r) => n + BigInt(r.amount ?? "0"), 0n)
            .toString(),
          m.id,
        ).toBe(m.value);
    }
  });
  it("reads sealed expense snapshots and flags unclosed historical years without mutating books", () => {
    const book = expenses();
    const snapshot = materialize(book, clock).filter((r) =>
      r.month.startsWith("2025"),
    );
    book.years.push({ year: 2025, closedAt: "2026-01-01T00:00:00Z", snapshot });
    const before = JSON.stringify(book);
    book.jars[0].rules[0].amount = "999";
    const sealed = buildReport(
      base({ expenses: book }),
      query({ period: "year", year: 2025, tab: "cashflow" }),
      clock,
    );
    expect(metric(sealed, "expenses.spent").value).toBe("600");
    expect(sealed.report.warnings.join(" ")).not.toContain("chưa chốt");
    book.jars[0].rules[0].amount = "50";
    expect(JSON.stringify(book)).toBe(before);
    const draft = buildReport(
      base({ expenses: expenses() }),
      query({ period: "year", year: 2025 }),
      clock,
    );
    expect(draft.report.warnings.join(" ")).toContain("chưa chốt");
  });
  it("compares the unfinished period with the full previous period and excludes future-month income", () => {
    const book = income()!;
    book.monthly.push({
      categoryId: "salary",
      month: "2026-12",
      amount: "90000",
      note: "",
    });
    const result = buildReport(
      base({ income: book }),
      query({ period: "quarter", month: 11 }),
      clock,
    );
    expect(metric(result, "income.total").value).toBe("180");
    expect(result.report.previousPeriod).toMatchObject({
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(
      result.details["income.total"].some((r) => r.date === "2026-12"),
    ).toBe(false);
  });
  it("keeps future periods empty and handles the first supported year without invalid previous-year parsing", () => {
    const future = buildReport(
      base({ income: income(), expenses: expenses(), funds: funds() }),
      query({ year: 2027 }),
      clock,
    );
    expect(future.report.period.future).toBe(true);
    expect(
      future.report.metrics.every(
        (m) => m.value === null && m.previous === null,
      ),
    ).toBe(true);
    expect(
      Object.values(future.report.sources).every((s) => s.status === "ready"),
    ).toBe(true);
    const first = buildReport(base(), query({ year: 2000, month: 1 }), clock);
    expect(
      Object.values(first.report.sources).every((s) => s.status === "ready"),
    ).toBe(true);
  });
  it("preserves current holding and portfolio cash accounting, including a fully sold portfolio", () => {
    const data = buildInvestmentReviewData({
      ownerId: randomUUID(),
      today: clock.today,
    });
    const result = buildReport(
      base({ investments: data.book }),
      query({ tab: "investments" }),
      clock,
    );
    expect(result.report.sources.investments?.status).toBe("ready");
    expect(
      BigInt(metric(result, "investments.assets").value!) +
        BigInt(metric(result, "investments.cash").value!),
    ).toBe(BigInt(metric(result, "investments.value").value!));
    const closed = result.report.tables
      .find((t) => t.id === "investments.portfolios")!
      .rows.find((r) => r.id === data.ids.closed)!;
    expect(closed).toMatchObject({ cost: "0", value: "0", profit: "0" });
    for (const m of result.report.metrics)
      if (m.value !== null)
        expect(
          result.details[m.id]
            .reduce((n, r) => n + BigInt(r.amount ?? "0"), 0n)
            .toString(),
          m.id,
        ).toBe(m.value);
  });
  it("keeps the last known investment valuation with a stale warning", () => {
    const data = buildInvestmentReviewData({
      ownerId: randomUUID(),
      today: clock.today,
    });
    data.book.revisions = data.book.revisions.filter(
      (r) => r.transaction?.kind !== "valuation",
    );
    const result = buildReport(
      base({ investments: data.book }),
      query({ tab: "investments" }),
      clock,
    );
    expect(metric(result, "investments.value").value).not.toBeNull();
    expect(metric(result, "investments.cash").value).not.toBeNull();
    expect(result.report.warnings.join(" ")).toContain("định giá cũ");
  });
  it("never uses a future gold valuation or replaces missing values with zero", () => {
    const id = randomUUID(),
      transactionId = randomUUID();
    const savings: NonNullable<Books["savings"]> = {
      version: 2,
      categories: [
        {
          id,
          start: "2026-10",
          kind: "gold",
          unit: "chỉ",
          rules: [
            {
              month: "2026-10",
              name: "Gold",
              description: "",
              emoji: "",
              active: true,
            },
          ],
        },
      ],
      revisions: [
        {
          id: transactionId,
          rootId: transactionId,
          sequence: 1,
          reason: "",
          transaction: {
            id: transactionId,
            kind: "buyGold",
            date: "2026-10-01",
            categoryId: id,
            quantity: "1",
            unitPrice: "100",
            fee: "0",
            tax: "0",
            cashCategoryId: null,
            note: "",
          },
        },
      ],
      prices: [
        {
          id: randomUUID(),
          categoryId: id,
          sequence: 2,
          date: "2026-11-03",
          price: "200",
        },
      ],
      closes: [],
      audit: [],
    };
    const result = buildReport(
      base({ savings }),
      query({ tab: "savings" }),
      clock,
    );
    expect(result.report.sources.savings?.status).toBe("ready");
    expect(metric(result, "savings.value").value).toBeNull();
    expect(result.report.warnings.join(" ")).toContain("thiếu định giá");
    expect(
      result.report.tables.find((t) => t.id === "savings.categories")!.rows[0]
        .value,
    ).toBeNull();
  });
  it("replays Fund corrections before date filtering, respects Vietnam midnight and historical configuration", () => {
    const book = funds(),
      original = book.revisions[0];
    book.revisions.push({
      ...original,
      id: randomUUID(),
      sequence: 3,
      transaction: {
        ...original.transaction!,
        amount: "700",
        occurredAt: "2026-10-31T17:00:00Z",
      },
    });
    expect(fundsAt(book, "2026-10-31").total).toBe("0");
    expect(fundsAt(book, "2026-11-01").total).toBe("700");
    const configuration = book.configurations[0];
    book.configurations.push({
      ...configuration,
      id: randomUUID(),
      sequence: 4,
      at: "2026-11-02T00:00:00Z",
      multipliers: { ...configuration.multipliers, emergency: "10" },
    });
    expect(fundsAt(book, "2026-11-01").funds[0].target).toBe("600");
    expect(fundsAt(book, "2026-11-02").funds[0].target).toBe("1000");
    expect(fundBookAt(book, "2026-11-01")?.revisions).toHaveLength(1);
    book.revisions.push({
      ...original,
      id: randomUUID(),
      sequence: 5,
      transaction: null,
    });
    expect(fundsAt(book, "2026-11-01").total).toBe("0");
  });
  it("does not count internal Fund transfers as deposits or withdrawals", () => {
    const book = funds(),
      id = randomUUID();
    book.revisions.push({
      id,
      rootId: id,
      sequence: 3,
      reason: "",
      transaction: {
        id,
        kind: "transfer",
        fundId: "emergency",
        locationId: book.locations[0].id,
        toFundId: "rainy_day",
        toLocationId: book.locations[0].id,
        amount: "100",
        occurredAt: "2026-11-01T00:00:00Z",
        note: "",
      },
    });
    const result = buildReport(
      base({ funds: book }),
      query({ tab: "funds" }),
      clock,
    );
    expect(metric(result, "funds.value").value).toBe("1000");
    expect(metric(result, "funds.inflow").value).toBe("0");
    expect(metric(result, "funds.outflow").value).toBe("0");
    expect(
      result.report.tables.find((t) => t.id === "funds.transactions")!.rows[0]
        .kind,
    ).toBe("Chuyển nội bộ");
  });
  it("keeps periods before Fund tracking began distinct from recorded zero balances", () => {
    const book = funds();
    const before = buildReport(
      base({ funds: book }),
      query({ tab: "funds", month: 8 }),
      clock,
    );
    expect(metric(before, "funds.value").value).toBeNull();
    expect(
      before.report.tables.find((t) => t.id === "funds.balances")!.rows,
    ).toEqual([]);
    const started = buildReport(
      base({ funds: book }),
      query({ tab: "funds", month: 9 }),
      clock,
    );
    expect(metric(started, "funds.value").value).toBe("0");
  });
  it("keeps goal progress current when selecting old periods and never adds it into asset totals", () => {
    const id = randomUUID();
    const goals: NonNullable<Books["goals"]> = {
      version: 1,
      goals: [
        {
          id,
          name: "Car",
          note: "",
          purpose: "spending",
          mode: "ledger",
          basis: "capital",
          target: "1000",
          monthly: "100",
          deadline: "2027-01-01",
          links: [],
          status: "active",
          rank: 0,
          completion: null,
        },
      ],
      revisions: [
        {
          id: randomUUID(),
          rootId: randomUUID(),
          sequence: 1,
          reason: "",
          transaction: {
            id: randomUUID(),
            goalId: id,
            kind: "deposit",
            toGoalId: null,
            amount: "400",
            occurredAt: clock.now,
            note: "",
          },
        },
      ],
      audit: [],
    };
    const result = buildReport(base({ goals }), query({ year: 2025 }), clock);
    expect(
      result.report.tables.find((t) => t.id === "goals.current")!.rows[0],
    ).toMatchObject({ value: "400", remaining: "600" });
    expect(result.report.metrics.some((m) => m.source === "goals")).toBe(false);
    const standalone = buildReport(
      base({ goals }, ["investments"]),
      query({ tab: "goals", year: 2025 }),
      clock,
    );
    expect(standalone.report.metrics).toEqual([]);
    expect(standalone.report.tables.map((t) => t.id)).toEqual([
      "goals.current",
    ]);
    expect(standalone.report.tables[0].rows[0].value).toBe("400");
    expect(reportCSV(result.report, "en")).toContain(
      "Goals show current progress",
    );
  });
  it("paginates reconciled detail and rejects stale versions, including reset generations", () => {
    const input = base({ income: income() }),
      result = buildReport(input, query({ tab: "cashflow" }), clock);
    expect(
      reportDetails(result, "income.total", result.report.versions, 1).total,
    ).toBe(1);
    expect(() => reportDetails(result, "income.total", "old", 1)).toThrow(
      /đã thay đổi/,
    );
    const reset = buildReport(
      { ...input, generation: 1 },
      query({ tab: "cashflow" }),
      clock,
    );
    expect(() =>
      reportDetails(reset, "income.total", result.report.versions, 1),
    ).toThrow();
  });
  it("exports full active-tab tables in both languages, escapes account text and labels partial periods", () => {
    const book = income()!;
    book.categories[0].rules[0].name = '=HYPERLINK("x")';
    book.monthly[1].note = "line\nnext";
    const result = buildReport(
      base({ income: book }),
      query({ tab: "cashflow" }),
      clock,
    );
    const csv = reportCSV(result.report, "en");
    expect(csv).toMatch(/^\uFEFF/);
    expect(csv).toContain("This period has not ended");
    expect(csv).toContain("Previous full period");
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain("line\nnext");
    expect(csv).toContain('"Recorded income","100","80","20","25.00"');
    expect(csv).not.toContain("Current goals");
  });
});
