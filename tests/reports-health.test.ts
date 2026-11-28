import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildReport } from "../src/domain/reports/build";
import { parseQuery, type Books } from "../src/domain/reports/model";
import { applyAction as applyFund } from "../src/domain/funds/engine";
import {
  actionSchema as fundAction,
  fundIds,
} from "../src/domain/funds/schema";
import type { FundBook } from "../src/domain/funds/types";
import { applyAction as applySavings } from "../src/domain/savings/engine";
import { actionSchema as savingsAction } from "../src/domain/savings/schema";
import type { SavingsBook } from "../src/domain/savings/types";
import type { ExpenseBook, MonthInput } from "../src/domain/expenses/types";
import type { Goal, GoalBook } from "../src/domain/goals/schema";
import type { Clock } from "../src/domain/shared/types";
import { buildInvestmentReviewData } from "../scripts/lib/investment-review-data.mjs";

const clock: Clock = { today: "2026-11-20", now: "2026-11-20T05:00:00.000Z" };
function run(
  books: Partial<Books>,
  extra: Record<string, unknown> = {},
  at: Clock = clock,
  errors: ("savings" | "investments" | "funds" | "income" | "goals")[] = [],
) {
  return buildReport(
    { books, errors, generation: 0 },
    parseQuery(extra, at),
    at,
  );
}
const overview = (...args: Parameters<typeof run>) =>
  run(...args).report.overview!;
const indicator = (
  id: "emergency" | "savingsRate" | "budget" | "goals",
  ...args: Parameters<typeof run>
) => overview(...args).indicators.find((i) => i.id === id)!;

const cash = randomUUID();
function savings(amount = "50000000", date = "2026-10-01") {
  let book: SavingsBook | null = null;
  for (const raw of [
    {
      type: "createCategory",
      id: cash,
      kind: "cash",
      name: "Ngân hàng",
      start: "2026-10",
      unit: null,
    },
    {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "openingCash",
        categoryId: cash,
        date,
        amount,
      },
    },
  ])
    book = applySavings(book, savingsAction.parse(raw), clock);
  return book!;
}
function gold(priceDate: string): SavingsBook {
  const id = randomUUID(),
    transaction = randomUUID();
  return {
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
            name: "Vàng",
            description: "",
            emoji: "",
            active: true,
          },
        ],
      },
    ],
    revisions: [
      {
        id: transaction,
        rootId: transaction,
        sequence: 1,
        reason: "",
        transaction: {
          id: transaction,
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
        date: priceDate,
        price: "200",
      },
    ],
    closes: [],
    audit: [],
  };
}
/** Fund with one own location; `held` is posted to the emergency fund. */
function funds(held: string | null = "600", date = "2026-10-01"): FundBook {
  const location = randomUUID(),
    id = randomUUID();
  return {
    version: 4,
    funds: [...fundIds],
    locations: [{ id: location, name: "Tiền mặt", active: true }],
    configurations: [
      {
        id: randomUUID(),
        sequence: 1,
        at: "2026-09-01T00:00:00Z",
        living: {
          expenseVersion: 1,
          month: "2026-09",
          total: "100",
          items: [{ jarId: randomUUID(), name: "Sống", amount: "100" }],
        },
        multipliers: { emergency: "6", rainy_day: "1", sinking: "1" },
        priority: [...fundIds],
      },
    ],
    revisions:
      held === null
        ? []
        : [
            {
              id,
              rootId: id,
              sequence: 2,
              reason: "",
              transaction: {
                id,
                fundId: "emergency",
                locationId: location,
                amount: held,
                kind: "deposit",
                occurredAt: `${date}T05:00:00Z`,
                note: "",
              },
            },
          ],
    audit: [],
  };
}
/** Adds a location that follows the Savings cash category from `clock.now`. */
function linked(book: FundBook) {
  return applyFund(
    book,
    fundAction.parse({
      type: "saveLocation",
      id: randomUUID(),
      name: "Ngân hàng",
      active: true,
      savings: { categoryId: cash, fundId: "emergency" },
    }),
    {
      expenseVersion: 1,
      month: "2026-11",
      items: [{ jarId: randomUUID(), name: "Sống", amount: "100" }],
    },
    clock,
  );
}
function income(
  months: Record<string, string | null>,
): NonNullable<Books["income"]> {
  return {
    version: 1,
    categories: [
      {
        id: "salary",
        start: Object.keys(months)[0],
        deleted: false,
        rules: [
          {
            month: Object.keys(months)[0],
            name: "Lương",
            description: "",
            active: true,
          },
        ],
      },
    ],
    monthly: Object.entries(months).flatMap(([month, amount]) =>
      amount === null
        ? []
        : [{ categoryId: "salary", month, amount, note: "" }],
    ),
    oneOffs: [],
    audit: [],
  };
}
/** One monthly jar with a budget of 100. */
function expenses(
  inputs: Record<string, Partial<MonthInput>> = {},
  start = "2026-10",
): ExpenseBook {
  return {
    version: 1,
    start,
    jars: [
      {
        id: "food",
        kind: "monthly",
        start,
        opening: "0",
        rules: [
          {
            month: start,
            name: "Ăn uống",
            description: "",
            active: true,
            amount: "100",
            group: "",
            method: "",
          },
        ],
      },
    ],
    inputs: Object.entries(inputs).map(([month, input]) => ({
      jarId: "food",
      month,
      target: null,
      funding: null,
      extra: "0",
      closing: null,
      ...input,
    })),
    spends: [],
    labels: [],
    years: [],
    audit: [],
  };
}
function goals(...list: Partial<Goal>[]): GoalBook {
  return {
    version: 1,
    goals: list.map((goal, rank) => ({
      id: randomUUID(),
      name: `Mục tiêu ${rank}`,
      note: "",
      purpose: "spending",
      mode: "ledger",
      basis: "capital",
      target: "1000",
      monthly: "1000",
      deadline: "2027-01-31",
      links: [],
      status: "active",
      rank,
      completion: null,
      ...goal,
    })),
    revisions: [],
    audit: [],
  };
}

describe("recorded assets", () => {
  it("adds the ledgers once and removes fund money that follows Savings", () => {
    const investments = buildInvestmentReviewData({
      ownerId: randomUUID(),
      today: clock.today,
    }).book;
    const result = run({
      savings: savings(),
      investments,
      funds: linked(funds("1000000")),
    });
    const value = (id: string) =>
      BigInt(result.report.metrics.find((m) => m.id === id)!.value!);
    const assets = result.report.overview!.assets;
    expect(assets.linked).toBe("50000000");
    expect(value("funds.value")).toBe(51000000n);
    expect(BigInt(assets.total!)).toBe(
      value("savings.value") + value("investments.value") + 1000000n,
    );
    expect(
      assets.composition.reduce((n, c) => n + BigInt(c.value!), 0n).toString(),
    ).toBe(assets.total);
    expect(assets.composition.find((c) => c.id === "funds")!.value).toBe(
      "1000000",
    );
  });
  it("does not read a link created during the period as growth", () => {
    const assets = overview({
      savings: savings(),
      funds: linked(funds("1000000")),
    }).assets;
    expect(assets).toMatchObject({
      total: "51000000",
      opening: "51000000",
      delta: "0",
      percent: "0.00",
      changeReason: null,
      openingDate: "2026-10-31",
    });
  });
  it("skips the comparison when a ledger started during the period or nothing existed before it", () => {
    const started = overview({
      savings: savings(),
      funds: funds("500", "2026-11-05"),
    }).assets;
    expect(started).toMatchObject({ total: "50000500", delta: null });
    expect(started.changeReason).toMatch(/bắt đầu ghi/);
    const fresh = overview({
      savings: savings("100", "2026-11-05"),
    }).assets;
    expect(fresh).toMatchObject({ total: "100", opening: null, delta: null });
    expect(fresh.changeReason).toMatch(/Đầu kỳ chưa ghi/);
    expect(fresh.sources.find((s) => s.id === "funds")!.state).toBe(
      "unrecorded",
    );
    expect(fresh.notes).toContain("Quỹ an toàn chưa ghi số dư nên tính 0.");
  });
  it("never replaces a missing valuation or a failed ledger with zero", () => {
    const missing = overview({ savings: gold("2026-11-25") }).assets;
    expect(missing.total).toBeNull();
    expect(missing.reasons).toEqual(["Tiết kiệm thiếu định giá."]);
    expect(missing.composition.find((c) => c.id === "gold")!.value).toBeNull();
    const opening = overview({ savings: gold("2026-11-05") }).assets;
    expect(opening).toMatchObject({ total: "200", opening: null, delta: null });
    expect(opening.changeReason).toMatch(/Thiếu dữ liệu đầu kỳ/);
    const failed = overview({ savings: savings() }, {}, clock, [
      "investments",
    ]).assets;
    expect(failed.total).toBeNull();
    expect(failed.reasons).toContain("Chưa đọc được Đầu tư.");
    const linkedFailure = overview(
      { funds: linked(funds()), savings: savings() },
      {},
      clock,
      ["savings"],
    );
    expect(linkedFailure.assets.total).toBeNull();
    expect(linkedFailure.indicators[0].rating).toBe("insufficient");
  });
  it("has no total or ratings for an empty account", () => {
    const empty = overview({});
    expect(empty.assets.total).toBeNull();
    expect(empty.assets.reasons).toEqual([
      "Chưa ghi tài sản nào đến ngày này.",
    ]);
    expect(empty.indicators.map((i) => i.rating)).toEqual(
      Array(4).fill("insufficient"),
    );
  });
  it("is only built for a current or past summary report", () => {
    const books = { savings: savings() };
    expect(run(books, { tab: "savings" }).report.overview).toBeUndefined();
    expect(run(books, { year: 2027 }).report.overview).toBeUndefined();
    expect(
      buildReport(
        { books, errors: [], generation: 0 },
        parseQuery({}, clock),
        clock,
        { metric: "savings.value" },
      ).report.overview,
    ).toBeUndefined();
  });
});

describe("financial health indicators", () => {
  it.each([
    ["600", "good", "6.00"],
    ["599", "attention", "5.99"],
    ["300", "attention", "3.00"],
    ["299", "improve", "2.99"],
  ])("rates %s emergency money as %s", (held, rating, months) => {
    expect(indicator("emergency", { funds: funds(held) })).toMatchObject({
      rating,
      value: { value: months },
    });
  });
  it("needs a living level and a recorded balance for the emergency rating", () => {
    const unconfigured = funds();
    unconfigured.configurations = [];
    expect(indicator("emergency", { funds: unconfigured }).reason).toMatch(
      /mức sinh hoạt/,
    );
    expect(indicator("emergency", { funds: funds(null) }).reason).toMatch(
      /chưa ghi số dư/,
    );
  });
  it("does not rate an emergency fund that only other funds have money in", () => {
    const book = funds();
    book.revisions[0].transaction!.fundId = "sinking";
    expect(indicator("emergency", { funds: book })).toMatchObject({
      rating: "insufficient",
      value: null,
    });
  });
  it("treats a link to a Savings category without entries as nothing recorded", () => {
    const savingsBook = savings();
    savingsBook.revisions = [];
    const result = overview({
      savings: savingsBook,
      funds: linked(funds(null)),
    });
    expect(result.assets.total).toBeNull();
    expect(result.assets.composition.every((c) => c.value === null)).toBe(true);
    expect(result.indicators[0].rating).toBe("insufficient");
    // A balance that arrives through the link counts from its first entry.
    expect(
      indicator("emergency", {
        savings: savings(),
        funds: linked(funds(null)),
      }).rating,
    ).toBe("good");
  });
  const october = (input: Partial<MonthInput>) => ({
    income: income({ "2026-10": "100" }),
    expenses: expenses({ "2026-10": input }),
  });
  it.each([
    [{ closing: "20" }, "good", "20.00"],
    [{ closing: "19" }, "attention", "19.00"],
    [{ closing: "0" }, "attention", "0.00"],
    [{ closing: "0", extra: "50" }, "improve", "-50.00"],
  ])("rates the savings share for %o", (input, rating, value) => {
    expect(
      indicator("savingsRate", october(input), { month: 10 }),
    ).toMatchObject({ rating, value: { value }, fallback: false });
  });
  it("counts an unconfirmed jar as spent and says so", () => {
    const result = indicator("savingsRate", october({}), { month: 10 });
    expect(result.value?.value).toBe("0.00");
    expect(result.facts.at(-1)).toMatchObject({ type: "count", value: "1" });
  });
  it.each([
    [
      { income: income({ "2026-10": null }), expenses: expenses() },
      "Chưa ghi thu nhập",
    ],
    [
      { income: income({ "2026-10": "100" }), expenses: null },
      "Chưa có hũ chi",
    ],
    [october({ funded: false }), "Có hũ chưa bỏ tiền"],
    [october({ closing: "100" }), "Chưa ghi khoản chi nào"],
  ])("skips a month that would fake the savings share", (books, reason) => {
    expect(indicator("savingsRate", books, { month: 10 })).toMatchObject({
      rating: "insufficient",
      value: null,
      months: [{ month: "2026-10", excluded: reason }],
    });
  });
  it("skips a month with income still missing", () => {
    const book = income({ "2026-10": "100" });
    book.categories.push({
      ...book.categories[0],
      id: "bonus",
      rules: [{ ...book.categories[0].rules[0], name: "Thưởng" }],
    });
    expect(
      indicator(
        "savingsRate",
        { income: book, expenses: expenses() },
        { month: 10 },
      ).months[0].excluded,
    ).toBe("Còn khoản thu chưa nhập");
  });
  it("falls back to the latest completed month, across years too", () => {
    const current = indicator("savingsRate", october({ closing: "50" }));
    expect(current).toMatchObject({
      fallback: true,
      months: [{ month: "2026-10", excluded: null }],
      value: { value: "50.00" },
    });
    const january = indicator(
      "savingsRate",
      {
        income: income({ "2026-12": "200" }),
        expenses: expenses(
          { "2026-12": { funded: true, closing: "0" } },
          "2026-12",
        ),
      },
      {},
      { today: "2027-01-10", now: "2027-01-10T05:00:00.000Z" },
    );
    expect(january.months).toEqual([{ month: "2026-12", excluded: null }]);
    expect(january.value?.value).toBe("50.00");
  });
  it("uses only the completed months of a longer period", () => {
    const result = indicator(
      "savingsRate",
      {
        income: income({ "2026-10": "100", "2026-11": "100" }),
        expenses: expenses({
          "2026-10": { closing: "40" },
          "2026-11": { funded: true, closing: "0" },
        }),
      },
      { period: "quarter" },
    );
    expect(result.months.map((m) => m.month)).toEqual(["2026-10"]);
    expect(result.value?.value).toBe("40.00");
  });
  it.each([
    [{ closing: "0" }, "good", "0"],
    [{ closing: "0", extra: "5" }, "attention", "1"],
    [{ closing: "0", extra: "6" }, "improve", "1"],
  ])("rates the budget for %o", (input, rating, jars) => {
    expect(indicator("budget", october(input), { month: 10 })).toMatchObject({
      rating,
      value: { value: jars },
    });
  });
  it("needs a confirmed closing before praising or blaming a budget", () => {
    expect(
      indicator("budget", october({ extra: "50" }), { month: 10 }),
    ).toMatchObject({
      rating: "insufficient",
      months: [{ excluded: "Chưa nhập số dư cuối của hũ" }],
    });
    const stopped = expenses({ "2026-10": { closing: "0" } });
    stopped.jars[0].rules[0].active = false;
    expect(
      indicator("budget", { expenses: stopped }, { month: 10 }).months[0]
        .excluded,
    ).toBe("Chưa có hũ chi");
  });
  it.each<[Partial<Goal>[], string]>([
    [[{}], "good"],
    [[{}, { monthly: "1" }], "attention"],
    [[{ monthly: "1" }, { deadline: "2026-01-01" }], "improve"],
    [[{ deadline: null }], "insufficient"],
    [[{}, { status: "paused", deadline: "2026-01-01" }], "good"],
    [[{ status: "archived", deadline: "2026-01-01" }], "insufficient"],
  ])("rates goals %o as %s", (list, rating) => {
    expect(indicator("goals", { goals: goals(...list) }).rating).toBe(rating);
  });
  it("treats a goal with an unreadable source as unknown rather than overdue", () => {
    const result = indicator("goals", {
      goals: goals({
        mode: "linked",
        deadline: "2026-01-01",
        links: [{ kind: "savings", sourceId: randomUUID(), share: 10000 }],
      }),
    });
    expect(result).toMatchObject({
      rating: "insufficient",
      value: null,
      reason: "Có mục tiêu không đọc được nguồn.",
    });
  });
});
