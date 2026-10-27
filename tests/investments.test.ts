import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  actionSchema,
  transactionSchema,
} from "../src/domain/investments/schema";
import {
  applyAction,
  replay,
  activeTransactions,
  emptyBook,
  toView,
} from "../src/domain/investments/engine";
import { buildReport } from "../src/domain/investments/reports";
import { reportCSV } from "../src/i18n/report-exports/investments";

const clock = { today: "2027-03-15", now: "2027-03-15T12:00:00Z" },
  start = "2026-12-01";
function setup() {
  let book = emptyBook();
  const wallet = randomUUID(),
    asset = randomUUID();
  const act = (a: unknown) => {
    book = applyAction(book, actionSchema.parse(a), clock);
    return book;
  };
  const tx = (kind: string, fields: Record<string, unknown> = {}) => {
    const t = transactionSchema.parse({
      id: randomUUID(),
      date: start,
      categoryId: ["openingCash", "deposit", "withdraw", "transfer"].includes(
        kind,
      )
        ? wallet
        : asset,
      kind,
      ...fields,
    });
    act({ type: "postTransaction", transaction: t });
    return t;
  };
  act({
    type: "createCategory",
    id: wallet,
    start,
    kind: "cash",
    name: "TCBS",
  });
  act({
    type: "createCategory",
    id: asset,
    start,
    kind: "investment",
    name: "Cổ phiếu",
  });
  return {
    get book() {
      return book;
    },
    wallet,
    asset,
    act,
    tx,
    position: (id = asset, date = clock.today) =>
      replay(book, date).positions.find((p) => p.id === id)!,
  };
}
describe("Investment aggregate accounting", () => {
  it("capitalizes purchase charges and settles both sides atomically", () => {
    const s = setup();
    s.tx("openingCash", { amount: "100000000" });
    s.tx("buy", {
      amount: "30000000",
      fee: "200000",
      tax: "100000",
      value: "31000000",
      cashCategoryId: s.wallet,
      date: "2026-12-02",
    });
    expect(s.position().cost).toBe("30300000");
    expect(s.position().unrealized).toBe("700000");
    expect(s.position(s.wallet).cash).toBe("69700000");
    expect(replay(s.book, clock.today).total).toBe("100700000");
  });
  it("matches 30m sale less 200k charges and 25m basis = 4.8m realized", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "100000000", value: "110000000" });
    s.tx("sell", {
      amount: "30000000",
      cost: "25000000",
      fee: "100000",
      tax: "100000",
      value: "85000000",
      cashCategoryId: s.wallet,
      date: "2026-12-02",
    });
    expect(s.position()).toMatchObject({
      cost: "75000000",
      value: "85000000",
      realized: "4800000",
      unrealized: "10000000",
    });
    expect(s.position(s.wallet).cash).toBe("29800000");
    expect(replay(s.book, clock.today).effects.at(-1)).toMatchObject({
      net: "29800000",
      costSold: "25000000",
      realized: "4800000",
      external: "0",
    });
  });
  it("allows a zero-proceeds total loss and archive despite a realized loss", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "50000000", value: "0" });
    expect(() =>
      s.act({ type: "archiveCategory", categoryId: s.asset, date: start }),
    ).toThrow(/hết giá vốn/);
    s.tx("sell", {
      amount: "0",
      cost: "50000000",
      value: "0",
      date: "2026-12-02",
    });
    s.act({ type: "archiveCategory", categoryId: s.asset, date: "2026-12-02" });
    expect(s.position()).toMatchObject({
      active: false,
      cost: "0",
      value: "0",
      realized: "-50000000",
    });
    s.act({ type: "restoreCategory", categoryId: s.asset, date: "2027-01-01" });
    s.tx("buy", { amount: "10", value: "12", date: "2027-01-01" });
    expect(s.position()).toMatchObject({
      active: true,
      cost: "10",
      value: "12",
    });
  });
  it("blocks archiving with missing valuation, residual value, or wallet cash", () => {
    const s = setup();
    expect(() =>
      s.act({ type: "archiveCategory", categoryId: s.asset, date: start }),
    ).toThrow(/hết giá vốn/);
    s.tx("valuation", { value: "100" });
    expect(() =>
      s.act({ type: "archiveCategory", categoryId: s.asset, date: start }),
    ).toThrow(/hết giá vốn/);
    s.tx("deposit", { amount: "1" });
    expect(() =>
      s.act({ type: "archiveCategory", categoryId: s.wallet, date: start }),
    ).toThrow(/hết tiền ví/);
  });
  it("revalidates an archive boundary after backdated valuation correction", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "0", value: "100" });
    const v = s.tx("valuation", { value: "0", date: "2026-12-02" });
    s.act({ type: "archiveCategory", categoryId: s.asset, date: "2026-12-03" });
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: v.id,
        replacement: { ...v, value: "1" },
        reason: "Sửa",
      }),
    ).toThrow(/hết giá vốn/);
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: v.id,
        replacement: null,
        reason: "Hủy",
      }),
    ).toThrow(/hết giá vốn/);
  });
  it("rejects overdrafts, overselling, charges exceeding proceeds and invalid settlement accounts", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "10", value: "12" });
    expect(() =>
      s.tx("buy", { amount: "1", value: "13", cashCategoryId: s.wallet }),
    ).toThrow(/Không đủ tiền/);
    expect(() => s.tx("sell", { amount: "5", cost: "11", value: "0" })).toThrow(
      /vượt vốn/,
    );
    expect(() =>
      s.tx("sell", { amount: "1", cost: "1", fee: "2", value: "11" }),
    ).toThrow(/vượt tiền bán/);
    expect(() =>
      s.tx("sell", {
        amount: "1",
        cost: "1",
        value: "11",
        cashCategoryId: s.asset,
      }),
    ).toThrow(/khác nhau/);
  });
  it("retains original ordering for same-day revisions and rejects downstream shortfalls", () => {
    const s = setup();
    const d = s.tx("deposit", { amount: "100" });
    s.tx("buy", { amount: "90", value: "90", cashCategoryId: s.wallet });
    s.act({
      type: "reviseTransaction",
      transactionId: d.id,
      replacement: { ...d, amount: "120" },
      reason: "Đối soát",
    });
    expect(s.position(s.wallet).cash).toBe("30");
    expect(activeTransactions(s.book)[0].transaction.id).toBe(d.id);
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: d.id,
        replacement: { ...d, amount: "80" },
        reason: "Sửa",
      }),
    ).toThrow(/Không đủ tiền/);
    expect(() =>
      s.act({
        type: "reviseTransaction",
        transactionId: d.id,
        replacement: null,
        reason: "Hủy",
      }),
    ).toThrow(/Không đủ tiền/);
  });
  it("does not change later declared valuations after a historical edit", () => {
    const s = setup();
    const b = s.tx("buy", { amount: "100", value: "110" });
    s.tx("valuation", { value: "130", date: "2027-01-01" });
    s.act({
      type: "reviseTransaction",
      transactionId: b.id,
      replacement: { ...b, amount: "105", value: "120" },
      reason: "Phí thiếu",
    });
    expect(s.position()).toMatchObject({
      cost: "105",
      value: "130",
      unrealized: "25",
    });
    expect(s.book.revisions).toHaveLength(3);
  });
  it("keeps valuation revisions and cancellation while restoring the previous dated observation", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "100", value: "110" });
    const v = s.tx("valuation", { value: "150", date: "2027-01-01" });
    s.act({
      type: "reviseTransaction",
      transactionId: v.id,
      replacement: { ...v, value: "160" },
      reason: "Đối soát",
    });
    expect(s.position().value).toBe("160");
    s.act({
      type: "reviseTransaction",
      transactionId: v.id,
      replacement: null,
      reason: "Hủy",
    });
    expect(s.position().value).toBe("110");
    expect(s.book.revisions.filter((r) => r.rootId === v.id)).toHaveLength(3);
  });
  it("allows exactly one opening per category, before its transactions at its start", () => {
    const s = setup();
    s.tx("deposit", { amount: "10" });
    expect(() => s.tx("openingCash", { amount: "20" })).toThrow(/trước mọi/);
    expect(() =>
      s.tx("openingInvestment", { cost: "1", value: "1", date: "2026-12-02" }),
    ).toThrow(/ngày bắt đầu/);
    s.tx("openingInvestment", { cost: "1", value: "2" });
    expect(() => s.tx("openingInvestment", { cost: "1", value: "2" })).toThrow(
      /một số dư/,
    );
  });
  it("does not change the category kind after any history, including canceled records", () => {
    const s = setup();
    const t = s.tx("deposit", { amount: "1" });
    s.act({
      type: "reviseTransaction",
      transactionId: t.id,
      replacement: null,
      reason: "Hủy",
    });
    expect(() =>
      s.act({
        type: "configureCategory",
        categoryId: s.wallet,
        date: start,
        kind: "investment",
        name: "Đổi",
      }),
    ).toThrow(/đã có phát sinh/);
  });
  it("retains dated metadata without rewriting older reports", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "1", value: "2" });
    s.act({
      type: "configureCategory",
      categoryId: s.asset,
      date: "2027-01-01",
      kind: "investment",
      name: "Tên mới",
    });
    expect(s.position(s.asset, "2026-12-31").name).toBe("Cổ phiếu");
    expect(s.position().name).toBe("Tên mới");
  });
  it("never uses future values and labels stale values, with integer precision", () => {
    const s = setup();
    s.tx("openingInvestment", {
      cost: "9007199254740993",
      value: "9007199254740994",
    });
    s.tx("valuation", { value: "9999999999999999", date: "2027-03-01" });
    expect(s.position(s.asset, "2027-02-01")).toMatchObject({
      value: "9007199254740994",
      valueDate: start,
      stale: true,
      unrealized: "1",
    });
    expect(toView(s.book, "2028-01-01", clock).state.asOf).toBe(clock.today);
    expect(() => s.tx("valuation", { value: "1", date: "2028-01-01" })).toThrow(
      /tương lai/,
    );
  });
  it("treats zero cost ROI and wallet ROI as absent and rejects numeric/negative/missing values", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "0", value: "100" });
    expect(s.position().roi).toBeNull();
    expect(s.position(s.wallet).roi).toBeNull();
    for (const fields of [{ value: undefined }, { value: "-1" }, { value: 10 }])
      expect(() =>
        transactionSchema.parse({
          id: randomUUID(),
          kind: "valuation",
          date: start,
          categoryId: s.asset,
          ...fields,
        }),
      ).toThrow();
  });
});
describe("Investment reports", () => {
  function seeded() {
    const s = setup();
    s.tx("openingCash", { amount: "100000000" });
    s.tx("openingInvestment", { cost: "100000000", value: "110000000" });
    s.tx("sell", {
      amount: "30000000",
      cost: "25000000",
      fee: "200000",
      value: "85000000",
      cashCategoryId: s.wallet,
      date: "2027-01-01",
    });
    return s;
  }
  it("separates period result from cumulative unrealized/realized and external contributions", () => {
    const s = seeded();
    const r = buildReport(
      s.book,
      { from: "2027-01-01", to: "2027-01-31" },
      clock,
    );
    expect(r.result).toBe("4800000");
    expect(r.reconciliation).toMatchObject({
      external: "0",
      internal: "0",
      opening: "0",
    });
    expect(r.after.total).toBe("214800000");
    expect(r.activity.realized).toBe("4800000");
  });
  it("reconciles a category and its settlement wallet individually", () => {
    const s = seeded();
    const asset = buildReport(
        s.book,
        { from: "2027-01-01", to: "2027-01-31", categoryId: s.asset },
        clock,
      ),
      cash = buildReport(
        s.book,
        { from: "2027-01-01", to: "2027-01-31", categoryId: s.wallet },
        clock,
      );
    expect(asset.result).toBe("4800000");
    expect(asset.reconciliation.internal).toBe("-29800000");
    expect(cash.result).toBe("0");
    expect(cash.reconciliation.internal).toBe("29800000");
  });
  it("classifies external buy and sell as contributed/withdrawn capital, not internal flow", () => {
    const s = setup();
    s.tx("buy", { amount: "100", fee: "5", value: "100" });
    s.tx("sell", {
      amount: "70",
      cost: "50",
      tax: "1",
      value: "60",
      date: "2027-01-01",
    });
    const r = buildReport(s.book, { from: start, to: clock.today }, clock);
    expect(r.reconciliation.external).toBe("36");
    expect(r.result).toBe("24");
    expect(r.activity).toMatchObject({
      inflow: "105",
      outflow: "69",
      realized: "19",
      fees: "6",
    });
  });
  it("opening values are not new inflow; transfer conserves full-portfolio value", () => {
    const s = setup();
    s.tx("openingInvestment", { cost: "10", value: "12" });
    s.tx("openingCash", { amount: "100" });
    const other = randomUUID();
    s.act({
      type: "createCategory",
      id: other,
      start,
      kind: "cash",
      name: "Ví khác",
    });
    s.tx("transfer", {
      amount: "25",
      cashCategoryId: other,
      date: "2027-01-01",
    });
    const r = buildReport(s.book, { from: start, to: clock.today }, clock);
    expect(r.result).toBe("0");
    expect(r.reconciliation).toMatchObject({
      opening: "112",
      internal: "0",
      external: "0",
    });
    expect(r.activity.inflow).toBe("0");
  });
  it("transaction filters select activity without erasing holdings or reconciliation", () => {
    const s = seeded();
    const a = buildReport(s.book, { from: start, to: clock.today }, clock),
      b = buildReport(
        s.book,
        { from: start, to: clock.today, transactionKind: "buy" },
        clock,
      );
    expect(b.after.total).toBe(a.after.total);
    expect(b.result).toBe(a.result);
    expect(b.effects).toHaveLength(0);
    expect(b.activity.realized).toBe("0");
  });
  it("uses end-of-period values across years; future months are empty", () => {
    const s = seeded();
    const r = buildReport(s.book, { from: start, to: "2027-12-31" }, clock);
    expect(r.months[0].value).toBe("210000000");
    expect(r.months[1].value).toBe("214800000");
    expect(r.after.total).toBe("214800000");
    expect(r.months.find((m) => m.month === "2027-04")?.value).toBeNull();
    expect(r.months.find((m) => m.month === "2027-03")?.provisional).toBe(true);
  });
  it("exports complete CSV with formula-safe strings and consistent columns", () => {
    const s = seeded();
    s.tx("valuation", {
      value: "85000000",
      note: '=HYPERLINK("bad")',
      date: "2027-02-01",
    });
    const csv = reportCSV(
      buildReport(s.book, { from: start, to: clock.today }, clock),
    );
    expect(csv).toContain("29800000");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Lãi/lỗ chưa chốt");
    expect(
      csv.split("\r\n").map((l) => (l.match(/","/g) ?? []).length),
    ).toEqual(expect.arrayContaining([15]));
    expect(
      new Set(csv.split("\r\n").map((l) => (l.match(/","/g) ?? []).length))
        .size,
    ).toBe(1);
  });
});

it("does not fabricate chart history before the tracking start", () => {
  const book = applyAction(
    null,
    actionSchema.parse({
      type: "createCategory",
      id: randomUUID(),
      kind: "cash",
      name: "Ví",
      start: "2027-03-01",
    }),
    clock,
  );
  const r = buildReport(book, { from: "2027-01-01", to: "2027-03-15" }, clock);
  expect(r.months.map((m) => m.value)).toEqual([null, null, "0"]);
});
