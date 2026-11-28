import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAction as applyFund,
  replay,
  toView,
} from "../src/domain/funds/engine";
import {
  actionSchema as fundAction,
  fundIds,
} from "../src/domain/funds/schema";
import { savingsSources } from "../src/domain/funds/savings-sources";
import { fundImpact } from "../src/domain/funds/savings-impact";
import { validateFundBook } from "../src/domain/funds/validate";
import type { FundBook } from "../src/domain/funds/types";
import { applyAction as applySavings } from "../src/domain/savings/engine";
import { actionSchema as savingsAction } from "../src/domain/savings/schema";
import type { SavingsBook } from "../src/domain/savings/types";
import {
  runSavingsCommand,
  type SavingsRepository,
  type StoredCommand,
} from "../src/application/savings";
import { runGoalCommand, type GoalRepository } from "../src/application/goals";
import {
  runFundCommand,
  type FundRepository,
  type FundStoredCommand,
} from "../src/application/funds";
import { goalSources } from "../src/domain/goals/sources";
import {
  applyAction as applyGoal,
  validateGoalBook,
  view as goalView,
} from "../src/domain/goals/engine";
import { actionSchema as goalAction } from "../src/domain/goals/schema";
import { fundsAt } from "../src/domain/reports/funds";
import { buildReport } from "../src/domain/reports/build";
import { parseQuery, reportSources } from "../src/domain/reports/model";
import { fundSummary } from "../src/domain/overview/summary";

const clock = { today: "2026-11-20", now: "2026-11-20T05:00:00.000Z" };
const cash = randomUUID(),
  deposit = randomUUID(),
  gold = randomUUID(),
  place = randomUUID(),
  own = randomUUID();

function savings(amount = "50000000") {
  let book: SavingsBook | null = null;
  const act = (raw: unknown) =>
    (book = applySavings(book, savingsAction.parse(raw), clock));
  for (const [id, kind, name] of [
    [cash, "cash", "Ngân hàng"],
    [deposit, "deposit", "Sổ gửi"],
    [gold, "gold", "Vàng"],
  ])
    act({
      type: "createCategory",
      id,
      kind,
      name,
      start: "2026-10",
      unit: kind === "gold" ? "chỉ" : null,
    });
  act({
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "openingCash",
      categoryId: cash,
      date: "2026-10-01",
      amount,
    },
  });
  return book!;
}
const withdraw = (amount: string, id = randomUUID()) =>
  savingsAction.parse({
    type: "postTransaction",
    transaction: {
      id,
      kind: "withdraw",
      categoryId: cash,
      date: "2026-11-01",
      amount,
    },
  });
const source = {
  expenseVersion: 1,
  month: "2026-11",
  items: [{ jarId: randomUUID(), name: "Sinh hoạt", amount: "9000000" }],
};
const link = (extra: object = {}) =>
  fundAction.parse({
    type: "saveLocation",
    id: place,
    name: "Ngân hàng",
    active: true,
    savings: { categoryId: cash, fundId: "emergency" },
    ...extra,
  });
function funds(linked = true) {
  let book = applyFund(
    null,
    fundAction.parse({
      type: "configure",
      id: randomUUID(),
      jarIds: source.items.map((i) => i.jarId),
      multipliers: { emergency: "3", rainy_day: "1", sinking: "1" },
      priority: [...fundIds],
      applyLiving: true,
      expectedExpenseVersion: 1,
      sourceMonth: "2026-11",
    }),
    source,
    clock,
  );
  book = applyFund(
    book,
    fundAction.parse({
      type: "saveLocation",
      id: own,
      name: "Tiền mặt",
      active: true,
    }),
    source,
    clock,
  );
  return linked ? applyFund(book, link(), source, clock) : book;
}
const post = (locationId: string, extra: object = {}) =>
  fundAction.parse({
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      fundId: "emergency",
      locationId,
      amount: "1000000",
      occurredAt: clock.now,
      note: "",
      ...extra,
    },
  });
const emergency = (book: FundBook, savingsBook: SavingsBook | null) =>
  toView(book, source, clock, savingsSources(savingsBook, clock.today)).state
    .funds[0];

describe("Savings categories backing a fund", () => {
  it("offers only cash and deposit balances", () => {
    expect(
      savingsSources(savings(), clock.today).map((s) => [s.kind, s.amount]),
    ).toEqual(
      expect.arrayContaining([
        ["cash", "50000000"],
        ["deposit", "0"],
      ]),
    );
    expect(savingsSources(savings(), clock.today)).toHaveLength(2);
  });
  it("adds the live balance to the fund and keeps the ledger unchanged", () => {
    const book = applyFund(funds(), post(own), source, clock);
    expect(replay(book).funds[0].balance).toBe("1000000");
    expect(emergency(book, savings())).toMatchObject({
      balance: "51000000",
      target: "27000000",
      missing: "0",
    });
    expect(emergency(book, savings("20000000"))).toMatchObject({
      balance: "21000000",
      missing: "6000000",
    });
    // A cleared Savings ledger counts as zero instead of a stale amount.
    expect(emergency(book, null).balance).toBe("1000000");
    expect(
      fundSummary(
        toView(book, source, clock, savingsSources(savings(), clock.today)),
      ).total,
    ).toBe("51000000");
    expect(() => validateFundBook(book)).not.toThrow();
  });
  it("links a category once, never changes its source and refuses ledger entries", () => {
    const book = funds();
    const act = (action: ReturnType<typeof link>, from = book) =>
      applyFund(from, action, source, clock);
    expect(() =>
      act(
        link({
          id: randomUUID(),
          name: "Khác",
          savings: { categoryId: cash, fundId: "sinking" },
        }),
      ),
    ).toThrow(/đã gắn/);
    expect(() =>
      act(link({ savings: { categoryId: deposit, fundId: "emergency" } })),
    ).toThrow(/Không đổi nguồn/);
    expect(() => act(link({ savings: undefined }))).toThrow(/Không đổi nguồn/);
    expect(() => act(link({ id: own, name: "Tiền mặt" }))).toThrow(
      /Không đổi nguồn/,
    );
    expect(() => act(post(place) as never)).toThrow(/Tiết kiệm/);
    expect(() =>
      act(
        post(own, {
          kind: "transfer",
          toFundId: "sinking",
          toLocationId: place,
          note: "x",
        }) as never,
      ),
    ).toThrow(/Tiết kiệm/);
    const moved = act(
      link({ savings: { categoryId: cash, fundId: "sinking" } }),
    );
    expect(emergency(moved, savings()).balance).toBe("0");
    const stopped = act(link({ active: false }), moved);
    expect(
      toView(stopped, source, clock, savingsSources(savings(), clock.today))
        .state.total,
    ).toBe("0");
    expect(() => validateFundBook(stopped)).not.toThrow();
  });
  it("reports only funds whose total goes down", () => {
    const book = funds(),
      before = savingsSources(savings(), clock.today);
    const after = savingsSources(
      applySavings(savings(), withdraw("30000000"), clock),
      clock.today,
    );
    expect(fundImpact(book, before, after)).toEqual([
      {
        fundId: "emergency",
        before: "50000000",
        after: "20000000",
        target: "27000000",
        missing: "7000000",
        sources: [{ name: "Ngân hàng", before: "50000000", after: "20000000" }],
      },
    ]);
    expect(fundImpact(book, after, before)).toEqual([]);
    expect(fundImpact(funds(false), before, after)).toEqual([]);
    const both = applyFund(
      book,
      link({
        id: randomUUID(),
        name: "Sổ gửi",
        savings: { categoryId: deposit, fundId: "emergency" },
      }),
      source,
      clock,
    );
    const moved = savingsSources(
      applySavings(
        savings(),
        savingsAction.parse({
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind: "openDeposit",
            categoryId: deposit,
            cashCategoryId: cash,
            date: "2026-11-01",
            amount: "10000000",
            name: "Sổ 1",
            maturity: "2027-11-01",
          },
        }),
        clock,
      ),
      clock.today,
    );
    expect(fundImpact(both, before, moved)).toEqual([]);
  });
});

describe("Saving a command that lowers a fund", () => {
  function repository(fundBook: () => FundBook | null) {
    let book = savings();
    const commands = new Map<string, StoredCommand>();
    const value: SavingsRepository = {
      transaction: (_owner, run) =>
        run({
          read: async () => book,
          command: async (id) => commands.get(id) ?? null,
          fundBook: async () => fundBook(),
          save: async (next) => void (book = next),
          remember: async (id, stored) => void commands.set(id, stored),
        }),
    };
    return { value, commands, version: () => book.version };
  }
  it("requires the accepted Fund version, then replays the same receipt", async () => {
    let fundBook = funds();
    const repo = repository(() => fundBook);
    const command = {
      id: randomUUID(),
      expectedVersion: repo.version(),
      action: withdraw("30000000"),
    };
    const run = (raw: object, preview = false) =>
      runSavingsCommand(
        repo.value,
        "owner",
        { ...command, ...raw },
        clock,
        preview,
      );
    const preview = await run({}, true);
    expect(preview.fundImpact).toMatchObject({
      fundsVersion: fundBook.version,
    });
    await expect(run({})).rejects.toMatchObject({
      status: 409,
      code: "FUND_IMPACT_CONFIRMATION_REQUIRED",
    });
    const accepted = { acknowledgedFundsVersion: fundBook.version };
    fundBook = applyFund(fundBook, post(own), source, clock);
    await expect(run(accepted)).rejects.toMatchObject({
      code: "FUND_IMPACT_CONFIRMATION_REQUIRED",
    });
    const current = { acknowledgedFundsVersion: fundBook.version };
    const saved = await run(current);
    expect(saved).not.toHaveProperty("fundImpact");
    expect(repo.commands.get(command.id)!.result).not.toHaveProperty(
      "fundImpact",
    );
    expect(await run(current)).toEqual(saved);
  });
  it("saves without consent when no fund is affected", async () => {
    const repo = repository(() => funds(false));
    const command = {
      id: randomUUID(),
      expectedVersion: repo.version(),
      action: withdraw("30000000"),
    };
    expect(
      (await runSavingsCommand(repo.value, "owner", command, clock, true))
        .fundImpact,
    ).toBeNull();
    await expect(
      runSavingsCommand(repo.value, "owner", command, clock),
    ).resolves.toMatchObject({ version: command.expectedVersion + 1 });
  });
  it("links only an existing active cash or deposit category", async () => {
    let book = funds(false);
    let stored: SavingsBook | null = savings();
    const commands = new Map<string, FundStoredCommand>();
    const repo: FundRepository = {
      transaction: (_owner, run) =>
        run({
          read: async () => book,
          source: async () => source,
          savings: async () => stored,
          command: async (id) => commands.get(id) ?? null,
          save: async (next) => void (book = next),
          remember: async (id, stored) => void commands.set(id, stored),
        }),
    };
    const run = (categoryId: string, extra: object = {}) =>
      runFundCommand(
        repo,
        "owner",
        {
          id: randomUUID(),
          expectedVersion: book.version,
          action: link({
            savings: { categoryId, fundId: "emergency" },
            ...extra,
          }),
        },
        clock,
      );
    await expect(run(gold)).rejects.toThrow(/tiền mặt hoặc tiền gửi/);
    await expect(run(randomUUID())).rejects.toThrow(/tiền mặt hoặc tiền gửi/);
    expect((await run(cash)).after.funds[0].balance).toBe("50000000");
    // The category disappearing later must not block renaming or moving the live link.
    stored = null;
    await expect(run(cash, { name: "Đổi tên" })).resolves.toBeDefined();
    await run(cash, { active: false });
    await expect(run(cash)).rejects.toThrow(/tiền mặt hoặc tiền gửi/);
  });
});

describe("Goals and reports with linked funds", () => {
  it("counts a category once when a milestone selects it and its fund", () => {
    const books = { savings: savings(), investments: null, funds: funds() };
    const sources = goalSources(books, clock.today);
    expect(sources.items.find((s) => s.sourceId === "emergency")).toMatchObject(
      { value: "50000000", componentIds: [cash] },
    );
    const goal = applyGoal(
      null,
      goalAction.parse({
        type: "saveGoal",
        goal: {
          id: randomUUID(),
          name: "Cột mốc",
          note: "",
          purpose: "milestone",
          mode: "linked",
          basis: "value",
          target: "100000000",
          deadline: null,
          monthly: "0",
          links: [
            { kind: "funds", sourceId: "emergency", share: 10000 },
            { kind: "savings", sourceId: cash, share: 10000 },
          ],
        },
      }),
      sources,
      clock,
    );
    expect(goalView(goal, sources, clock).states[0].current).toBe("50000000");
    expect(() => validateGoalBook(goal)).not.toThrow();
  });
  it("asks for a new preview when Savings behind a linked fund changed", async () => {
    const sources = goalSources(
      { savings: savings(), investments: null, funds: funds() },
      clock.today,
    );
    const repo: GoalRepository = {
      transaction: (_owner, run) =>
        run({
          read: async () => null,
          sources: async () => sources,
          command: async () => null,
          save: async () => {},
          remember: async () => {},
        }),
    };
    const command = (savingsVersion: number) => ({
      id: randomUUID(),
      expectedVersion: 0,
      expectedSources: { ...sources.versions, savings: savingsVersion },
      action: goalAction.parse({
        type: "saveGoal",
        goal: {
          id: randomUUID(),
          name: "Cột mốc",
          note: "",
          purpose: "milestone",
          mode: "linked",
          basis: "value",
          target: "100000000",
          deadline: null,
          monthly: "0",
          links: [{ kind: "funds", sourceId: "emergency", share: 10000 }],
        },
      }),
    });
    await expect(
      runGoalCommand(
        repo,
        "owner",
        command(sources.versions.savings! - 1),
        clock,
        true,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_VERSION_CONFLICT" });
    await expect(
      runGoalCommand(
        repo,
        "owner",
        command(sources.versions.savings!),
        clock,
        true,
      ),
    ).resolves.toMatchObject({ version: 1 });
  });
  it("counts a link only from the day it was saved", () => {
    const book = funds();
    const later = applyFund(
      book,
      link({ savings: { categoryId: cash, fundId: "sinking" } }),
      source,
      { today: "2026-11-25", now: "2026-11-25T05:00:00.000Z" },
    );
    expect(
      fundsAt(later, "2026-11-24", savings()).funds.map((f) => f.balance),
    ).toEqual(["50000000", "0", "0"]);
    expect(
      fundsAt(later, "2026-11-25", savings()).funds.map((f) => f.balance),
    ).toEqual(["0", "0", "50000000"]);
    expect(fundsAt(book, "2026-11-19", savings()).total).toBe("0");
    expect(fundsAt(book, "2026-11-20", savings()).total).toBe("50000000");
    expect(reportSources("funds")).toEqual(["funds", "savings"]);
    const input = {
      books: { funds: book, savings: savings() },
      errors: [],
      generation: 0,
    };
    const query = parseQuery({ tab: "funds" }, clock);
    const result = buildReport(input, query, clock);
    expect(
      result.report.metrics.find((m) => m.id === "funds.value")!.value,
    ).toBe("50000000");
    expect(result.report.metrics.every((m) => m.source === "funds")).toBe(true);
    expect(result.report.warnings.join()).toContain("Tiết kiệm");
    // A link older than the comparison period is complete data, not a warning about it.
    const older = buildReport(
      input,
      parseQuery({ tab: "funds" }, { ...clock, today: "2026-12-20" }),
      { today: "2026-12-20", now: "2026-12-20T05:00:00.000Z" },
    );
    expect(older.report.warnings.join()).toContain("Tiết kiệm");
    expect(older.report.warnings.join()).not.toContain("Kỳ trước");
    expect(
      older.report.tables.find((t) => t.id === "funds.balances")!.rows[0]
        .percent,
    ).toBe("100.00");
    const unlinked = buildReport(
      {
        books: { funds: funds(false) },
        errors: ["savings"],
        generation: 0,
      },
      query,
      clock,
    );
    expect(unlinked.report.sources.funds?.status).toBe("ready");
    expect(unlinked.report.sources).not.toHaveProperty("savings");
    const failed = buildReport(
      { books: { funds: book }, errors: ["savings"], generation: 0 },
      query,
      clock,
    );
    expect(failed.report.sources.funds?.status).toBe("error");
  });
});
