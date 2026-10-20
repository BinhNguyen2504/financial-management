import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAction,
  livingSource,
  selectLiving,
  replay,
  toView,
  targetAmount,
} from "../src/domain/funds/engine";
import {
  actionSchema,
  multiplierSchema,
  fundIds,
  type FundAction,
  type FundTransaction,
} from "../src/domain/funds/schema";
import type { FundBook } from "../src/domain/funds/types";
import type { ExpenseBook } from "../src/domain/expenses/types";
import { validateFundBook } from "../src/domain/funds/validate";
import { parseBackup, backupTables } from "../src/domain/backup/format";
const clock = { today: "2026-10-19", now: "2026-10-19T10:00:00.000Z" };
function expenses(): ExpenseBook {
  return {
    version: 7,
    start: "2026-09",
    jars: [
      {
        id: randomUUID(),
        kind: "monthly",
        start: "2026-09",
        opening: "0",
        rules: [
          {
            month: "2026-09",
            name: "Sinh hoạt",
            description: "",
            method: "Tiền mặt",
            group: "",
            amount: "9000000",
            active: true,
          },
        ],
      },
    ],
    inputs: [],
    spends: [],
    labels: [],
    years: [],
    audit: [],
  };
}
function fixture() {
  const expense = expenses(),
    source = livingSource(expense, "2026-10"),
    location = randomUUID(),
    other = randomUUID();
  const config: FundAction = {
    type: "configure",
    id: randomUUID(),
    jarIds: source.items.map((i) => i.jarId),
    expectedExpenseVersion: 7,
    sourceMonth: "2026-10",
    applyLiving: true,
    multipliers: { emergency: "6", rainy_day: "1", sinking: "2.5" },
    priority: [...fundIds],
  };
  let book = applyAction(null, config, source, clock);
  for (const [id, name] of [
    [location, "Ngân hàng"],
    [other, "Tiền mặt"],
  ])
    book = applyAction(
      book,
      { type: "saveLocation", id, name, active: true },
      source,
      clock,
    );
  const act = (action: FundAction) =>
    (book = applyAction(book, action, source, clock));
  const post = (
    kind: FundTransaction["kind"],
    amount: string,
    extra: Record<string, unknown> = {},
  ) => {
    const transaction = actionSchema.parse({
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind,
        amount,
        fundId: "emergency",
        locationId: location,
        occurredAt: "2026-10-01T00:00:00Z",
        note: "Đối soát",
        ...extra,
      },
    });
    act(transaction);
    return transaction.type === "postTransaction"
      ? transaction.transaction
      : null;
  };
  return {
    get book() {
      return book;
    },
    source,
    expense,
    location,
    other,
    config,
    act,
    post,
  };
}
describe("Fund living expense and target", () => {
  it("reads effective monthly rules only, ignores monthly overrides, funding and accumulation", () => {
    const e = expenses(),
      id = e.jars[0].id;
    e.jars[0].rules.push({
      ...e.jars[0].rules[0],
      month: "2026-11",
      amount: "12000000",
    });
    e.inputs.push({
      jarId: id,
      month: "2026-10",
      target: "1",
      funding: "2",
      extra: "3",
      closing: "4",
    });
    e.jars.push({
      ...structuredClone(e.jars[0]),
      id: randomUUID(),
      kind: "accumulation",
    });
    expect(selectLiving(livingSource(e, "2026-10"), [id]).total).toBe(
      "9000000",
    );
    expect(selectLiving(livingSource(e, "2026-11"), [id]).total).toBe(
      "12000000",
    );
    expect(livingSource(e, "2026-10").items).toHaveLength(1);
    e.jars[0].rules[0].active = false;
    expect(() => selectLiving(livingSource(e, "2026-10"), [id])).toThrow(
      /ngừng/,
    );
  });
  it("rejects empty, zero and missing sources and rounds decimal x upward without float", () => {
    expect(targetAmount("101", "0.01")).toBe("2");
    expect(targetAmount("9007199254740993", "1.01")).toBe("9097271247288403");
    for (const v of ["0", "-1", "1.001", "1e3", ""])
      expect(multiplierSchema.safeParse(v).success).toBe(false);
    const e = expenses();
    e.jars[0].rules[0].amount = "0";
    expect(() =>
      selectLiving(livingSource(e, "2026-10"), [e.jars[0].id]),
    ).toThrow(/lớn hơn 0/);
    expect(() => selectLiving(livingSource(e, "2026-10"), [])).toThrow();
    expect(() => targetAmount("999999999999999999999999", "2")).toThrow(
      /giới hạn/,
    );
  });
  it("proposes source changes without mutating accepted targets and guards preview versions/month", () => {
    const s = fixture(),
      before = replay(s.book);
    const changed = {
      ...s.source,
      expenseVersion: 8,
      items: s.source.items.map((i) => ({ ...i, amount: "10000000" })),
    };
    const view = toView(s.book, changed, clock);
    expect(view.sourceChanged).toBe(true);
    expect(view.state).toEqual(before);
    expect(view.proposedLiving?.total).toBe("10000000");
    expect(() =>
      applyAction(s.book, { ...s.config, id: randomUUID() }, changed, clock),
    ).toThrow(/Chi tiêu/);
    const action = { ...s.config, id: randomUUID(), expectedExpenseVersion: 8 };
    const updated = applyAction(s.book, action, changed, clock);
    expect(updated.configurations).toHaveLength(2);
    expect(replay(updated).funds[0].target).toBe("60000000");
    expect(() =>
      applyAction(
        s.book,
        { ...s.config, id: randomUUID() },
        { ...s.source, month: "2026-11" },
        clock,
      ),
    ).toThrow(/tháng/);
  });
  it("changes x using the accepted baseline and exposes unavailable sources", () => {
    const s = fixture(),
      action = actionSchema.parse({
        ...s.config,
        id: randomUUID(),
        applyLiving: false,
        multipliers: { emergency: "3", rainy_day: "1", sinking: "2" },
      });
    const updated = applyAction(
      s.book,
      action,
      { ...s.source, items: [], expenseVersion: 99 },
      clock,
    );
    expect(replay(updated).funds[0].target).toBe("27000000");
    expect(toView(updated, { ...s.source, items: [] }, clock)).toMatchObject({
      sourceChanged: true,
      sourceUnavailable: true,
      proposedLiving: null,
    });
    expect(toView(null, s.source, clock).book).toBeNull();
  });
});
describe("Fund ledger", () => {
  it("settles internal and cross-fund transfers without counting new contributions", () => {
    const s = fixture();
    s.post("opening", "100");
    s.post("deposit", "200");
    s.post("transfer", "50", {
      toFundId: "rainy_day",
      toLocationId: s.other,
      occurredAt: "2026-10-02T00:00:00Z",
    });
    s.post("transfer", "30", {
      toFundId: "emergency",
      toLocationId: s.other,
      occurredAt: "2026-10-03T00:00:00Z",
    });
    s.post("withdraw", "20", {
      locationId: s.other,
      occurredAt: "2026-10-04T00:00:00Z",
    });
    expect(replay(s.book)).toMatchObject({
      total: "280",
      contributed: "200",
      withdrawn: "20",
    });
    expect(replay(s.book).funds.map((f) => f.balance)).toEqual([
      "230",
      "50",
      "0",
    ]);
    expect(() => validateFundBook(s.book)).not.toThrow();
  });
  it("checks downstream history on revisions, cancellations and backdated withdrawals", () => {
    const s = fixture(),
      deposit = s.post("deposit", "100")!;
    s.post("withdraw", "80", { occurredAt: "2026-10-03T00:00:00Z" });
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: deposit.id,
        replacement: null,
        reason: "Nhập nhầm",
      }),
    ).toThrow(/Không đủ/);
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: deposit.id,
        replacement: { ...deposit, amount: "79" },
        reason: "Nhập nhầm",
      }),
    ).toThrow(/Không đủ/);
    expect(() =>
      s.post("withdraw", "1", { occurredAt: "2026-09-30T00:00:00Z" }),
    ).toThrow(/Không đủ/);
    s.act({
      type: "reviseTransaction",
      transactionId: deposit.id,
      replacement: { ...deposit, amount: "120" },
      reason: "Đối soát",
    });
    expect(s.book.revisions).toHaveLength(3);
    expect(replay(s.book).total).toBe("40");
    expect(() => validateFundBook(s.book)).not.toThrow();
  });
  it("preserves original same-time order when a deposit is revised later", () => {
    const s = fixture(),
      deposit = s.post("deposit", "100")!;
    s.post("withdraw", "80");
    s.act({
      type: "reviseTransaction",
      transactionId: deposit.id,
      replacement: { ...deposit, amount: "110" },
      reason: "Kiểm tra",
    });
    expect(replay(s.book).total).toBe("30");
  });
  it("rejects future transactions, identical endpoints, duplicate ids and invalid opening entries", () => {
    const s = fixture(),
      t = s.post("deposit", "100")!;
    expect(() =>
      s.post("withdraw", "1", { occurredAt: "2026-10-20T00:00:00Z" }),
    ).toThrow(/tương lai/);
    expect(() => s.post("opening", "1")).toThrow(/đầu tiên/);
    expect(() =>
      s.post("transfer", "1", {
        toFundId: "emergency",
        toLocationId: s.location,
      }),
    ).toThrow(/khác/);
    expect(() => s.act({ type: "postTransaction", transaction: t })).toThrow(
      /đã tồn tại/,
    );
    expect(() =>
      actionSchema.parse({
        type: "postTransaction",
        transaction: { ...t, kind: "withdraw", note: " " },
      }),
    ).toThrow();
  });
  it("archives only zero locations, restores and cancels with immutable revision history", () => {
    const s = fixture(),
      t = s.post("deposit", "100")!;
    expect(() =>
      s.act({
        type: "saveLocation",
        id: s.location,
        name: "Ngân hàng",
        active: false,
      }),
    ).toThrow(/bằng 0/);
    s.act({
      type: "reviseTransaction",
      transactionId: t.id,
      replacement: null,
      reason: "Nhầm",
    });
    s.act({
      type: "saveLocation",
      id: s.location,
      name: "Ngân hàng",
      active: false,
    });
    expect(() => s.post("deposit", "1")).toThrow(/ngừng/);
    s.act({
      type: "saveLocation",
      id: s.location,
      name: "Ngân hàng",
      active: true,
    });
    s.post("deposit", "1");
    expect(replay(s.book).total).toBe("1");
    expect(() => validateFundBook(s.book)).not.toThrow();
  });
  it("keeps exact totals and percent above 100, missing funds do not borrow excess", () => {
    const s = fixture();
    s.post("deposit", "108000000");
    const view = replay(s.book);
    expect(view.funds[0].percent).toBe("200.00");
    expect(view.funds[0].excess).toBe("54000000");
    expect(view.emergencyMonths).toBe("12.00");
    expect(view.missing).toBe("31500000");
    s.book.configurations[0].multipliers.emergency = "999";
    expect(() => validateFundBook(s.book)).toThrow();
  });
});
describe("Fund backup compatibility", () => {
  it("normalizes original V1 files to V2 with empty Fund tables, rejects Fund smuggled into V1", () => {
    const legacy = {
      format: "financial-manager-full-backup",
      schemaVersion: 1,
      exportedAt: clock.now,
      profile: { full_name: "", birth_date: "", gender: "" },
      tables: Object.fromEntries(
        backupTables.filter((t) => !t.startsWith("funds_")).map((t) => [t, []]),
      ),
    };
    const parsed = parseBackup(legacy);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.tables.funds_books).toEqual([]);
    expect(() =>
      parseBackup({ ...legacy, tables: { ...legacy.tables, funds_books: [] } }),
    ).toThrow();
  });
});

describe("Fund scenes", () => {
  it("maps real proportions to growth stages and clamps only the drawing", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ProgressScene } =
      await import("../src/features/funds/progress-scene");
    for (const fund of fundIds)
      for (const [percent, stage, progress] of [
        ["0", 0, "0"],
        ["24", 1, "0.24"],
        ["25", 2, "0.25"],
        ["50", 3, "0.5"],
        ["75", 4, "0.75"],
        ["100", 5, "1"],
        ["200", 5, "1"],
      ] as const) {
        const svg = renderToStaticMarkup(
          createElement(ProgressScene, { fund, percent }),
        );
        expect(svg).toContain(`data-stage="${stage}"`);
        expect(svg).toContain(`data-progress="${progress}"`);
        expect(svg).toContain('aria-hidden="true"');
        expect(svg).not.toContain("animation");
      }
  });
  it("invalid numeric inputs return schema issues rather than throwing BigInt errors", async () => {
    const { transactionSchema } = await import("../src/domain/funds/schema");
    for (const amount of ["-1", "1e3", "1.5", "0", ""])
      expect(
        transactionSchema.safeParse({
          id: randomUUID(),
          kind: "deposit",
          fundId: "emergency",
          locationId: randomUUID(),
          amount,
          occurredAt: clock.now,
          note: "",
        }).success,
      ).toBe(false);
  });
});
