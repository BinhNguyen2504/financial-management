import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAction as invest,
  emptyBook,
} from "../src/domain/investments/engine";
import { actionSchema as investmentAction } from "../src/domain/investments/schema";
import { goalSources } from "../src/domain/goals/sources";
import {
  applyAction,
  validateGoalBook,
  view,
} from "../src/domain/goals/engine";
import { availableShare } from "../src/domain/goals/source-links";
import { sourcesSchema, type GoalAction } from "../src/domain/goals/schema";
import { buildReport } from "../src/domain/reports/build";
import { parseQuery } from "../src/domain/reports/model";

const clock = { today: "2026-11-05", now: "2026-11-05T12:00:00Z" };
function fixture() {
  const asset = randomUUID(),
    wallet = randomUUID(),
    extra = randomUUID();
  let investments = emptyBook();
  const act = (raw: unknown) => {
    investments = invest(investments, investmentAction.parse(raw), clock);
  };
  act({
    type: "createCategory",
    id: asset,
    walletId: wallet,
    kind: "investment",
    name: "Quỹ cổ phiếu",
    start: clock.today,
  });
  const tx = (kind: string, categoryId: string, fields: object) =>
    act({
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        date: clock.today,
        kind,
        categoryId,
        ...fields,
      },
    });
  tx("openingCash", wallet, { amount: "10000000" });
  tx("buy", asset, {
    cashCategoryId: wallet,
    amount: "7000000",
    value: "8000000",
  });
  act({
    type: "createCategory",
    id: extra,
    kind: "cash",
    parentCategoryId: asset,
    name: "Ví bổ sung",
    start: clock.today,
  });
  tx("openingCash", extra, { amount: "2000000" });
  return {
    asset,
    wallet,
    extra,
    act,
    tx,
    get investments() {
      return investments;
    },
    get sources() {
      return goalSources(
        { savings: null, investments, funds: null },
        clock.today,
      );
    },
  };
}
function goal(
  sourceId: string,
  scope?: "portfolio",
  share = 10000,
): GoalAction {
  return {
    type: "saveGoal",
    goal: {
      id: randomUUID(),
      name: "Mua xe",
      note: "",
      purpose: "spending",
      mode: "linked",
      basis: "value",
      target: "100000000",
      deadline: null,
      monthly: "0",
      links: [
        { kind: "investments", sourceId, share, ...(scope ? { scope } : {}) },
      ],
    },
  };
}
describe("Investment portfolio sources for Goals", () => {
  it("keeps Reports consistent for both old wallet links and whole-portfolio links", () => {
    const s = fixture();
    let book = applyAction(
      null,
      goal(s.wallet, undefined, 4000),
      {
        versions: s.sources.versions,
        items: s.sources.legacyItems!,
      },
      clock,
    );
    book = applyAction(
      book,
      goal(s.asset, "portfolio", 4000),
      s.sources,
      clock,
    );
    const report = buildReport(
      {
        books: { investments: s.investments, goals: book },
        errors: [],
        generation: 0,
      },
      parseQuery({ tab: "goals" }, clock),
      clock,
    );
    const rows = report.report.tables.find(
      (t) => t.id === "goals.current",
    )!.rows;
    expect(
      book.goals.map((g) => rows.find((r) => r.id === g.id)?.value),
    ).toEqual(["1200000", "5200000"]);
    validateGoalBook(book);
  });
  it("offers one portfolio including every owned wallet and applies each basis and share once", () => {
    const s = fixture(),
      sources = s.sources;
    expect(sources.items).toHaveLength(1);
    expect(sourcesSchema.parse(sources).items[0]).toMatchObject({
      sourceId: s.asset,
      name: "Quỹ cổ phiếu",
      capital: "12000000",
      value: "13000000",
      scope: "portfolio",
      componentIds: [s.asset, s.wallet, s.extra],
    });
    const action = goal(s.asset, "portfolio", 4000);
    let book = applyAction(null, action, sources, clock);
    expect(view(book, sources, clock).states[0].current).toBe("5200000");
    if (action.type !== "saveGoal") throw new Error("fixture");
    book = applyAction(
      book,
      { ...action, goal: { ...action.goal, basis: "capital" } },
      sources,
      clock,
    );
    expect(view(book, sources, clock).states[0].current).toBe("4800000");
    validateGoalBook(book);
  });
  it("keeps a portfolio stable through buying and selling rather than exposing a second source", () => {
    const s = fixture();
    s.tx("sell", s.asset, {
      cashCategoryId: s.wallet,
      amount: "8000000",
      cost: "7000000",
      value: "0",
    });
    expect(s.sources.items).toHaveLength(1);
    expect(s.sources.items[0]).toMatchObject({
      capital: "13000000",
      value: "13000000",
    });
    s.tx("buy", s.asset, {
      cashCategoryId: s.wallet,
      amount: "6000000",
      value: "6000000",
    });
    expect(s.sources.items[0].value).toBe("13000000");
  });
  it("preserves old position links, completion snapshots and replay without counting a wallet twice", () => {
    const s = fixture();
    const oldSources = {
      versions: s.sources.versions,
      items: s.sources.legacyItems!,
    };
    const action = goal(s.asset);
    if (action.type !== "saveGoal") throw new Error("fixture");
    action.goal.target = "13000000";
    action.goal.links.push(
      { kind: "investments", sourceId: s.wallet, share: 10000 },
      { kind: "investments", sourceId: s.extra, share: 10000 },
    );
    action.goal.links.reverse();
    let book = applyAction(null, action, oldSources, clock);
    expect(book.audit[0].sources.items.map((s) => s.sourceId)).toEqual(
      oldSources.items.map((s) => s.sourceId),
    );
    const original = structuredClone(book);
    expect(view(book, s.sources, clock).states[0].current).toBe("13000000");
    book = applyAction(book, action, s.sources, clock);
    book = applyAction(
      book,
      {
        type: "setStatus",
        goalId: action.goal.id,
        status: "completed",
        reason: "",
      },
      s.sources,
      clock,
    );
    s.tx("deposit", s.wallet, { amount: "1" });
    expect(view(book, s.sources, clock).states[0].current).toBe("13000000");
    validateGoalBook(original);
    validateGoalBook(book);
  });
  it("requires new links to observe the whole portfolio", () => {
    const s = fixture();
    expect(() => applyAction(null, goal(s.wallet), s.sources, clock)).toThrow(
      /toàn bộ danh mục/,
    );
    expect(() => applyAction(null, goal(s.asset), s.sources, clock)).toThrow(
      /toàn bộ danh mục/,
    );
  });
  it("enforces capacity across old partial allocations and new portfolio allocations", () => {
    const s = fixture();
    const oldSources = {
      versions: s.sources.versions,
      items: s.sources.legacyItems!,
    };
    let book = applyAction(
      null,
      goal(s.wallet, undefined, 6000),
      oldSources,
      clock,
    );
    expect(availableShare(book.goals, s.sources, s.sources.items[0], "")).toBe(
      4000,
    );
    expect(() =>
      applyAction(book, goal(s.asset, "portfolio", 4001), s.sources, clock),
    ).toThrow(/100%/);
    book = applyAction(
      book,
      goal(s.asset, "portfolio", 4000),
      s.sources,
      clock,
    );
    expect(availableShare(book.goals, s.sources, s.sources.items[0], "")).toBe(
      0,
    );
    const ledger = goal(s.asset);
    if (ledger.type !== "saveGoal") throw new Error("fixture");
    ledger.goal.mode = "ledger";
    ledger.goal.links = [];
    book = applyAction(book, ledger, s.sources, clock);
    validateGoalBook(book);
  });
  it("retains dated valuations and handles portfolio aggregates above the single-position money limit exactly", () => {
    const s = fixture();
    s.tx("deposit", s.wallet, { amount: "10000000000000000000000" });
    s.tx("valuation", s.asset, { value: "999999999999999999999999" });
    expect(sourcesSchema.parse(s.sources).items[0].value).toBe(
      "1010000000000000004999999",
    );
    const later = goalSources(
      { savings: null, investments: s.investments, funds: null },
      "2026-12-05",
    );
    expect(later.items[0]).toMatchObject({
      stale: true,
      valueDate: clock.today,
    });
  });
});
