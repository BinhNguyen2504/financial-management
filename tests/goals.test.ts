import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAction,
  balances,
  goalState,
  validateGoalBook,
  view,
} from "../src/domain/goals/engine";
import {
  actionSchema,
  type GoalBook,
  type GoalAction,
  type GoalSources,
} from "../src/domain/goals/schema";
import { parseBackup, backupTables } from "../src/domain/backup/format";

const clock = { today: "2026-10-30", now: "2026-10-30T10:00:00.000Z" };
function fixture() {
  const source = randomUUID();
  const sources: GoalSources = {
    versions: { savings: 1, investments: 0, funds: 0 },
    items: [
      {
        kind: "savings",
        sourceId: source,
        name: "Tích lũy",
        active: true,
        capital: "100000000",
        value: "120000000",
        valueDate: "2026-10-01",
        stale: false,
      },
    ],
  };
  let book: GoalBook | null = null;
  const act = (action: GoalAction) => {
    book = applyAction(book, action, sources, clock);
    return book;
  };
  const create = (
    patch: Partial<Extract<GoalAction, { type: "saveGoal" }>["goal"]> = {},
  ) => {
    const id = randomUUID();
    act({
      type: "saveGoal",
      goal: {
        id,
        name: "Mua xe",
        note: "",
        purpose: "spending",
        mode: "ledger",
        basis: "value",
        target: "100000000",
        deadline: "2026-12-31",
        monthly: "10000000",
        links: [],
        ...patch,
      },
    });
    return id;
  };
  const post = (
    id: string,
    kind = "deposit",
    amount = "1000000",
    toGoalId: string | null = null,
  ) => {
    const t = {
      id: randomUUID(),
      goalId: id,
      kind,
      amount,
      toGoalId,
      occurredAt: "2026-10-01T00:00:00.000Z",
      note: "Góp hoặc dùng tiền",
    };
    act(actionSchema.parse({ type: "postTransaction", transaction: t }));
    return t;
  };
  return {
    source,
    sources,
    act,
    create,
    post,
    get book() {
      return book!;
    },
  };
}
describe("Goals rules", () => {
  it("caps allocations per source independently of valuation basis; milestones may overlap", () => {
    const s = fixture();
    const links = [
      { kind: "savings" as const, sourceId: s.source, share: 4000 },
    ];
    s.create({ mode: "linked", links });
    s.create({
      mode: "linked",
      basis: "capital",
      links: [{ ...links[0], share: 6000 }],
    });
    expect(() =>
      s.create({ mode: "linked", links: [{ ...links[0], share: 1 }] }),
    ).toThrow(/100%/);
    const id = s.create({
      mode: "linked",
      purpose: "milestone",
      links: [{ ...links[0], share: 10000 }],
    });
    expect(
      goalState(
        s.book.goals.find((g) => g.id === id)!,
        s.book,
        s.sources,
        clock,
      ).current,
    ).toBe("120000000");
    validateGoalBook(s.book);
  });
  it("keeps paused allocations and checks capacity again on reopen", () => {
    const s = fixture();
    const links = [
        { kind: "savings" as const, sourceId: s.source, share: 10000 },
      ],
      id = s.create({ mode: "linked", links });
    s.act({ type: "setStatus", goalId: id, status: "paused", reason: "" });
    expect(() => s.create({ mode: "linked", links })).toThrow(/100%/);
    s.act({ type: "setStatus", goalId: id, status: "archived", reason: "" });
    s.create({ mode: "linked", links });
    expect(() =>
      s.act({ type: "setStatus", goalId: id, status: "active", reason: "" }),
    ).toThrow(/100%/);
  });
  it("keeps completion snapshot after source changes and releases allocation", () => {
    const s = fixture();
    const links = [
        { kind: "savings" as const, sourceId: s.source, share: 10000 },
      ],
      id = s.create({ mode: "linked", links });
    s.act({ type: "setStatus", goalId: id, status: "completed", reason: "" });
    s.sources.items[0].value = "1";
    expect(goalState(s.book.goals[0], s.book, s.sources, clock).current).toBe(
      "120000000",
    );
    s.create({ mode: "linked", links });
    validateGoalBook(s.book);
  });
  it("does not replace missing valuations with zero or complete from missing data", () => {
    const s = fixture();
    const id = s.create({
      mode: "linked",
      links: [{ kind: "savings", sourceId: s.source, share: 10000 }],
    });
    s.sources.items[0].value = null;
    expect(view(s.book, s.sources, clock).states[0].current).toBeNull();
    expect(() =>
      s.act({ type: "setStatus", goalId: id, status: "completed", reason: "" }),
    ).toThrow(/thiếu dữ liệu/);
    s.sources.items = [];
    expect(view(s.book, s.sources, clock).states[0].remaining).toBeNull();
  });
  it("restricts safety funds to milestones and rejects duplicate and inactive sources", () => {
    const s = fixture();
    s.sources.items[0].kind = "funds";
    s.sources.items[0].sourceId = "emergency";
    expect(() =>
      s.create({
        mode: "linked",
        links: [{ kind: "funds", sourceId: "emergency", share: 10000 }],
      }),
    ).toThrow(/cột mốc/);
    s.sources.items[0].active = false;
    expect(() =>
      s.create({
        mode: "linked",
        purpose: "milestone",
        links: [{ kind: "funds", sourceId: "emergency", share: 10000 }],
      }),
    ).toThrow(/ngừng/);
  });
  it("moves money atomically without creating contributions and replays historical edits", () => {
    const s = fixture(),
      a = s.create(),
      b = s.create();
    const first = s.post(a, "opening", "9007199254740993");
    s.post(a, "transfer", "100", b);
    expect(balances(s.book)[a]).toBe("9007199254740893");
    expect(balances(s.book)[b]).toBe("100");
    expect(() =>
      s.act(
        actionSchema.parse({
          type: "reviseTransaction",
          transactionId: first.id,
          replacement: { ...first, amount: "99" },
          reason: "Sửa",
        }),
      ),
    ).toThrow(/không âm/);
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: first.id,
        replacement: null,
        reason: "Nhầm",
      }),
    ).toThrow(/không âm/);
    validateGoalBook(s.book);
  });
  it("preserves completed ledger balance, permits outflows, and archives only at zero", () => {
    const s = fixture(),
      id = s.create({ target: "100" });
    s.post(id, "deposit", "100");
    s.act({ type: "setStatus", goalId: id, status: "completed", reason: "" });
    expect(() => s.post(id, "deposit", "1")).toThrow(/Mở lại/);
    expect(() =>
      s.act({ type: "setStatus", goalId: id, status: "archived", reason: "" }),
    ).toThrow(/hết số dư/);
    s.post(id, "withdraw", "100");
    expect(view(s.book, s.sources, clock).states[0]).toMatchObject({
      current: "100",
      balance: "0",
    });
    s.act({ type: "setStatus", goalId: id, status: "archived", reason: "" });
    validateGoalBook(s.book);
  });
  it("rejects future entries, a second opening, changes in mode and invalid reorder", () => {
    const s = fixture(),
      id = s.create();
    s.post(id);
    expect(() => s.post(id, "opening")).toThrow(/đầu tiên/);
    expect(() =>
      s.act({
        type: "saveGoal",
        goal: { ...s.book.goals[0], mode: "linked" } as never,
      }),
    ).toThrow();
    expect(() => s.act({ type: "reorder", ids: [id, id] })).toThrow();
    expect(() =>
      s.act(
        actionSchema.parse({
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            goalId: id,
            kind: "deposit",
            toGoalId: null,
            amount: "1",
            note: "",
            occurredAt: "2027-01-01T00:00:00Z",
          },
        }),
      ),
    ).toThrow(/tương lai/);
  });
  it("computes inclusive months and upward rounding without assuming interest", () => {
    const s = fixture(),
      id = s.create({ target: "100", monthly: "34" });
    const state = goalState(
      s.book.goals.find((g) => g.id === id)!,
      s.book,
      s.sources,
      clock,
    );
    expect(state).toMatchObject({
      requiredMonthly: "34",
      estimatedMonth: "2026-12",
      remaining: "100",
    });
    expect(
      goalState(s.book.goals[0], s.book, s.sources, {
        ...clock,
        today: "2027-01-01",
      }),
    ).toMatchObject({ overdue: true, requiredMonthly: null });
    s.book.goals[0].deadline = null;
    expect(
      goalState(s.book.goals[0], s.book, s.sources, clock).requiredMonthly,
    ).toBeNull();
  });
  it("rejects tampered ledger and definition snapshots", () => {
    const s = fixture(),
      id = s.create();
    s.post(id);
    const bad = structuredClone(s.book);
    bad.goals[0].target = "1";
    expect(() => validateGoalBook(bad)).toThrow(/lịch sử/);
    const bad2 = structuredClone(s.book);
    bad2.revisions[0].transaction!.amount = "1";
    expect(() => validateGoalBook(bad2)).toThrow(/lịch sử/);
  });
});
describe("Goals backup versions", () => {
  it.each([1, 2, 3])("normalizes V%s with its original allowlist", (v) => {
    const tables = backupTables.filter(
      (t) =>
        v === 3 ||
        (!t.startsWith("goals_") && (v === 2 || !t.startsWith("funds_"))),
    );
    const raw = {
      format: "financial-manager-full-backup",
      schemaVersion: v,
      exportedAt: clock.now,
      profile: { full_name: "", birth_date: "", gender: "" },
      tables: Object.fromEntries(tables.map((t) => [t, []])),
    };
    const b = parseBackup(raw);
    expect(b.schemaVersion).toBe(3);
    expect(b.tables.goals_books).toEqual([]);
    if (v !== 3)
      expect(() =>
        parseBackup({ ...raw, tables: { ...raw.tables, goals_books: [] } }),
      ).toThrow();
  });
});
