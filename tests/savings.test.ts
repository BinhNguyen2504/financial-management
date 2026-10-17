import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  activeTransactions,
  applyAction,
  closedMonths,
  replay,
  toView,
} from "../src/domain/savings/engine";
import {
  actionSchema,
  dateSchema,
  transactionSchema,
} from "../src/domain/savings/schema";
import { buildReport, reportCSV } from "../src/domain/savings/reports";
import type { SavingsBook } from "../src/domain/savings/types";
import { safeReturnPath } from "../src/lib/auth-return";
const clock = { today: "2027-03-15", now: "2027-03-15T00:00:00Z" };
const cash = randomUUID(),
  other = randomUUID(),
  gold = randomUUID(),
  deposit = randomUUID();
function add(b: SavingsBook | null, a: unknown) {
  return applyAction(b, actionSchema.parse(a), clock);
}
function category(id: string, kind = "cash", name = "Ví", start = "2026-12") {
  return {
    type: "createCategory",
    id,
    kind,
    name,
    start,
    description: "",
    emoji: "🌱",
    unit: kind === "gold" ? "chỉ" : null,
  };
}
function setup() {
  let b = add(null, category(cash));
  b = add(b, category(other));
  b = add(b, category(gold, "gold", "Vàng"));
  return add(b, category(deposit, "deposit", "Ngân hàng"));
}
const tx = (
  kind: string,
  categoryId: string,
  data: object = {},
  date = "2026-12-01",
  id = randomUUID(),
) => ({
  type: "postTransaction",
  transaction: { id, kind, categoryId, date, note: "", ...data },
});
const report = (b: SavingsBook, extra = {}) =>
  buildReport(b, { from: "2026-12-01", to: "2027-03-15", ...extra }, clock);
describe("Savings accounting", () => {
  it("conserves transfers, separates opening capital and contributions, handles > Number.MAX_SAFE_INTEGER", () => {
    let b = setup();
    b = add(b, tx("openingCash", cash, { amount: "9007199254740993" }));
    b = add(
      b,
      tx("transfer", cash, { amount: "100000000", cashCategoryId: other }),
    );
    expect(replay(b, clock.today).total).toBe("9007199254740993");
    expect(report(b).result).toBe("0");
    b = add(b, tx("deposit", cash, { amount: "123" }));
    expect(report(b).activity.external).toBe("123");
    expect(report(b).result).toBe("0");
    expect(report(b, { categoryId: other }).result).toBe("0");
  });
  it("sells the selected gold lot and computes net proceeds, allocated cost and realized P&L", () => {
    let b = setup();
    const lot = randomUUID();
    b = add(
      b,
      tx(
        "openingGold",
        gold,
        { amount: "100000000", quantity: "1", unitPrice: "100000000" },
        "2026-12-01",
        lot,
      ),
    );
    b = add(
      b,
      tx(
        "sellGold",
        gold,
        {
          unitPrice: "130000000",
          fee: "1000000",
          allocations: [{ lotId: lot, quantity: "0.5" }],
          cashCategoryId: cash,
        },
        "2027-01-02",
      ),
    );
    const state = replay(b, clock.today),
      e = state.effects.at(-1)!;
    expect(e.net).toBe("64000000");
    expect(e.costSold).toBe("50000000");
    expect(e.realized).toBe("14000000");
    expect(state.lots[0]).toMatchObject({ quantity: "0.5", cost: "50000000" });
    expect(state.positions.find((p) => p.id === cash)?.value).toBe("64000000");
  });
  it("capitalizes purchase fees and absorbs rounding remainder on final sale", () => {
    let b = setup();
    b = add(b, tx("openingCash", cash, { amount: "1000" }));
    const lot = randomUUID();
    b = add(
      b,
      tx(
        "buyGold",
        gold,
        { quantity: "3", unitPrice: "33", fee: "1", cashCategoryId: cash },
        "2026-12-02",
        lot,
      ),
    );
    b = add(b, {
      type: "setPrice",
      id: randomUUID(),
      categoryId: gold,
      date: "2026-12-02",
      price: "33",
    });
    expect(report(b).result).toBe("-1");
    for (const q of ["1", "1", "1"])
      b = add(
        b,
        tx(
          "sellGold",
          gold,
          {
            unitPrice: "40",
            allocations: [{ lotId: lot, quantity: q }],
            cashCategoryId: cash,
          },
          "2026-12-03",
        ),
      );
    expect(replay(b, clock.today).lots[0]).toMatchObject({
      quantity: "0",
      cost: "0",
    });
    expect(
      replay(b, clock.today)
        .effects.filter((e) => e.kind === "sellGold")
        .reduce((n, e) => n + BigInt(e.costSold), 0n),
    ).toBe(100n);
    expect(report(b).activity.realized).toBe("20");
  });
  it("handles opening deposits, both interest destinations, partial withdrawals and rollover atomically", () => {
    let b = setup();
    const c = randomUUID(),
      rolled = randomUUID();
    b = add(
      b,
      tx(
        "openingDeposit",
        deposit,
        { amount: "1000", name: "Sổ cũ", maturity: "2027-01-01" },
        "2026-12-01",
        c,
      ),
    );
    b = add(
      b,
      tx(
        "interest",
        deposit,
        { contractId: c, amount: "100", capitalize: true },
        "2026-12-02",
      ),
    );
    b = add(
      b,
      tx(
        "interest",
        deposit,
        {
          contractId: c,
          amount: "50",
          capitalize: false,
          cashCategoryId: cash,
        },
        "2026-12-03",
      ),
    );
    b = add(
      b,
      tx(
        "withdrawDeposit",
        deposit,
        {
          contractId: c,
          amount: "100",
          interest: "10",
          fee: "2",
          cashCategoryId: cash,
        },
        "2026-12-04",
      ),
    );
    b = add(
      b,
      tx(
        "rollover",
        deposit,
        {
          contractId: c,
          interest: "20",
          reinvestInterest: "10",
          fee: "1",
          name: "Sổ mới",
          maturity: "2027-03-20",
          cashCategoryId: cash,
        },
        "2027-01-01",
        rolled,
      ),
    );
    const state = replay(b, clock.today);
    expect(state.contracts.find((c) => c.id === rolled)).toMatchObject({
      principal: "1010",
      previousId: c,
    });
    expect(state.contracts.find((x) => x.id === c)?.principal).toBe("0");
    expect(state.positions.find((p) => p.id === cash)?.value).toBe("167");
    expect(report(b).activity.external).toBe("0");
    expect(report(b).result).toBe("177");
    expect(toView(b, clock.today, clock).due.map((c) => c.id)).toContain(
      rolled,
    );
  });
  it("rejects oversells, repeated allocations, wrong category links and historical negative balances", () => {
    let b = setup();
    const opening = randomUUID(),
      purchase = randomUUID();
    b = add(
      b,
      tx("openingCash", cash, { amount: "100" }, "2026-12-01", opening),
    );
    b = add(
      b,
      tx(
        "buyGold",
        gold,
        { quantity: "1", unitPrice: "100", cashCategoryId: cash },
        "2026-12-02",
        purchase,
      ),
    );
    expect(() =>
      add(b, {
        type: "reviseTransaction",
        transactionId: opening,
        replacement: transactionSchema.parse(
          tx("openingCash", cash, { amount: "99" }, "2026-12-01", opening)
            .transaction,
        ),
        reason: "sửa",
      }),
    ).toThrow(/Không đủ tiền/);
    expect(() =>
      add(
        b,
        tx("sellGold", gold, {
          unitPrice: "100",
          allocations: [{ lotId: purchase, quantity: "2" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      add(
        b,
        tx("sellGold", gold, {
          unitPrice: "100",
          allocations: [
            { lotId: purchase, quantity: "0.5" },
            { lotId: purchase, quantity: "0.5" },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      add(
        b,
        tx("openDeposit", deposit, {
          amount: "1",
          name: "Sai nguồn",
          maturity: "2027-01-01",
          cashCategoryId: gold,
        }),
      ),
    ).toThrow();
  });
});
describe("Savings history, valuation, reports", () => {
  it("accepts only the exact savings return destination", () => {
    expect(safeReturnPath("/savings")).toBe("/savings");
    expect(safeReturnPath("/savings?next=//evil.test")).toBe("/overview");
  });
  it("rejects backdated activity before an existing opening and cannot close missing valuations", () => {
    let b = setup();
    b = add(b, tx("openingCash", cash, { amount: "100" }, "2027-01-01"));
    expect(() =>
      add(b, tx("deposit", cash, { amount: "1" }, "2026-12-01")),
    ).toThrow(/Số mở đầu/);
    b = add(
      b,
      tx("buyGold", gold, { quantity: "1", unitPrice: "10" }, "2026-12-01"),
    );
    expect(() => add(b, { type: "closeMonth", month: "2026-12" })).toThrow(
      /nhập giá/,
    );
    expect(() => report(b, { from: "2027-04-01", to: "2027-04-30" })).toThrow(
      /chưa diễn ra/,
    );
  });
  it("keeps dated prices, never uses future quotes, and reports missing valuations explicitly", () => {
    let b = setup();
    b = add(b, tx("buyGold", gold, { quantity: "1", unitPrice: "100" }));
    expect(replay(b, "2026-12-01").total).toBeNull();
    expect(report(b).after.missing).toContain(gold);
    b = add(b, {
      type: "setPrice",
      id: randomUUID(),
      categoryId: gold,
      date: "2027-01-01",
      price: "110",
    });
    expect(replay(b, "2026-12-31").total).toBeNull();
    expect(
      replay(b, clock.today).positions.find((p) => p.id === gold),
    ).toMatchObject({ value: "110", stale: true, priceDate: "2027-01-01" });
    expect(report(b, { categoryId: cash }).after.total).toBe("0");
  });
  it("preserves historical names and archived records, blocks residual assets and supports restore", () => {
    let b = setup();
    b = add(b, tx("openingCash", cash, { amount: "100" }));
    expect(() =>
      add(b, { type: "archiveCategory", categoryId: cash, month: "2027-01" }),
    ).toThrow();
    b = add(b, tx("withdraw", cash, { amount: "100" }, "2026-12-02"));
    b = add(b, {
      type: "configureCategory",
      categoryId: cash,
      month: "2027-01",
      name: "Tên mới",
      emoji: "💰",
      description: "",
    });
    b = add(b, { type: "archiveCategory", categoryId: cash, month: "2027-02" });
    expect(
      replay(b, "2026-12-31").positions.find((p) => p.id === cash)?.name,
    ).toBe("Ví");
    expect(
      replay(b, clock.today).positions.find((p) => p.id === cash)?.active,
    ).toBe(false);
    expect(b.revisions).toHaveLength(2);
    b = add(b, { type: "restoreCategory", categoryId: cash, month: "2027-03" });
    b = add(b, tx("deposit", cash, { amount: "1" }, "2027-03-01"));
    expect(replay(b, clock.today).total).toBe("1");
  });
  it("closes in order, retains snapshots and invalidates all later closes on reopening", () => {
    let b = setup();
    b = add(
      b,
      tx("openingGold", gold, {
        quantity: "1",
        amount: "100",
        unitPrice: "100",
      }),
    );
    expect(() => add(b, { type: "closeMonth", month: "2027-01" })).toThrow(
      /2026-12/,
    );
    b = add(b, { type: "closeMonth", month: "2026-12" });
    expect(() =>
      add(b, {
        type: "setPrice",
        id: randomUUID(),
        categoryId: gold,
        date: "2026-12-10",
        price: "110",
      }),
    ).toThrow(/đã chốt/);
    expect(() => add(b, { type: "closeMonth", month: "2027-01" })).toThrow(
      /xác nhận/,
    );
    b = add(b, {
      type: "closeMonth",
      month: "2027-01",
      acceptStalePrices: true,
    });
    b = add(b, { type: "reopenMonth", month: "2026-12", reason: "Sửa giá" });
    expect(closedMonths(b)).toEqual([]);
    expect(b.closes.filter((c) => c.snapshot)).toHaveLength(2);
    b = add(b, {
      type: "setPrice",
      id: randomUUID(),
      categoryId: gold,
      date: "2026-12-10",
      price: "110",
    });
    expect(b.closes[0].snapshot?.total).toBe("100");
  });
  it("keeps revisions and voids without mutating original transactions", () => {
    let b = setup();
    const id = randomUUID();
    b = add(b, tx("deposit", cash, { amount: "100" }, "2027-01-01", id));
    b = add(b, {
      type: "reviseTransaction",
      transactionId: id,
      replacement: transactionSchema.parse(
        tx("deposit", cash, { amount: "200" }, "2027-01-01", id).transaction,
      ),
      reason: "Đúng số",
    });
    expect(replay(b, clock.today).total).toBe("200");
    expect(b.revisions[0].transaction).toMatchObject({ amount: "100" });
    b = add(b, {
      type: "reviseTransaction",
      transactionId: id,
      replacement: null,
      reason: "Nhập nhầm",
    });
    expect(replay(b, clock.today).total).toBe("0");
    expect(activeTransactions(b)).toEqual([]);
    expect(b.revisions).toHaveLength(3);
  });
  it("reports multi-year closing balances instead of summing stocks; CSV is safe and filters reconcile", () => {
    let b = setup();
    b = add(b, tx("openingCash", cash, { amount: "100" }));
    b = add(
      b,
      tx("deposit", cash, { amount: "50", note: "=SUM(A1)" }, "2027-01-02"),
    );
    b = add(
      b,
      tx(
        "transfer",
        cash,
        { amount: "20", cashCategoryId: other },
        "2027-02-01",
      ),
    );
    const r = report(b, { to: "2027-12-31" });
    expect(r.after.total).toBe("150");
    expect(r.months[0].value).toBe("100");
    expect(r.months[1].value).toBe("150");
    expect(r.months.at(-1)?.value).toBeNull();
    expect(r.result).toBe("0");
    expect(reportCSV(r)).toContain("'=SUM(A1)");
    const filtered = report(b, {
      categoryId: other,
      transactionKind: "transfer",
    });
    expect(filtered.after.total).toBe("20");
    expect(filtered.result).toBe("0");
    expect(filtered.effects).toHaveLength(1);
    expect(report(b, { transactionKind: "withdraw" }).after.total).toBe("150");
  });
  it("validates real dates, decimal quantity precision and required gold unit", () => {
    expect(dateSchema.safeParse("2027-02-29").success).toBe(false);
    expect(dateSchema.safeParse("2028-02-29").success).toBe(true);
    expect(() =>
      add(null, { ...category(gold, "gold"), unit: null }),
    ).toThrow();
    expect(() =>
      add(
        setup(),
        tx("buyGold", gold, { quantity: "0.0000001", unitPrice: "100" }),
      ),
    ).toThrow();
    expect(() =>
      add(setup(), tx("deposit", cash, { amount: "1" }, "2027-04-01")),
    ).toThrow(/tương lai/);
  });
});
