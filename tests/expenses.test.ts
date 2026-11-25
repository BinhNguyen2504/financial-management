import { describe, expect, it } from "vitest";
import {
  applyAction,
  changes,
  materialize,
  toView,
  vietnamClock,
} from "../src/domain/expenses/engine";
import {
  commandSchema,
  expenseActionSchema,
} from "../src/domain/expenses/schema";
import { buildReport } from "../src/domain/expenses/reports";
import type { Clock, ExpenseBook } from "../src/domain/expenses/types";

const clock: Clock = { today: "2026-10-15", now: "2026-10-15T09:00:00.000Z" };
const id = "10000000-0000-4000-8000-000000000001";
const spendId = "20000000-0000-4000-8000-000000000001";
const labelId = "30000000-0000-4000-8000-000000000001";
function book(
  kind: "monthly" | "accumulation" = "monthly",
  opening = "0",
  start = "2026-09",
  time = clock,
) {
  const initial = applyAction(null, { type: "initialize", start }, time);
  return applyAction(
    initial,
    {
      type: "createJar",
      id,
      kind,
      start,
      opening,
      name: "Sinh hoạt",
      description: "Ăn uống",
      method: "Tiền mặt",
      group: "Bản thân",
      amount: "2000000",
    },
    time,
  );
}
function fund(value: ExpenseBook, month: string, time = clock, funded = true) {
  return applyAction(
    value,
    { type: "setJarFunded", jarId: id, month, funded },
    time,
  );
}
function edit(
  value: ExpenseBook,
  month: string,
  patch: Record<string, string | null> = {},
  time = clock,
) {
  return applyAction(
    value,
    {
      type: "editMonth",
      jarId: id,
      month,
      target: null,
      funding: null,
      extra: "0",
      closing: null,
      ...patch,
    },
    time,
  );
}
const row = (value: ExpenseBook, month = "2026-10", time = clock) =>
  materialize(value, time).find((r) => r.month === month)!;
describe("Monthly jars and exact VND arithmetic", () => {
  it("defaults to exhausting monthly funds and refills automatically", () => {
    const r = row(book());
    expect(r.required).toBe("2000000");
    expect(r.spent).toBe("2000000");
    expect(r.closing).toBe("0");
  });
  it("implements the approved 300k carry / 400k extra / 100k closing example", () => {
    let b = edit(book(), "2026-09", { closing: "300000" });
    expect(row(b).opening).toBe("300000");
    expect(row(b).required).toBe("1700000");
    b = edit(b, "2026-10", { extra: "400000", closing: "100000" });
    expect(row(b).spent).toBe("2300000");
    expect(row(b).over).toBe("300000");
    expect(row(b, "2026-11").required).toBe("1900000");
  });
  it("never asks for negative funding when opening exceeds target", () => {
    const r = row(book("monthly", "3000000", "2026-10"));
    expect(r.required).toBe("0");
    expect(r.available).toBe("3000000");
  });
  it("supports explicit funding including zero", () => {
    const r = row(edit(book(), "2026-10", { funding: "0" }));
    expect(r.funding).toBe("0");
    expect(r.spent).toBe("0");
  });
  it("rejects a closing balance larger than the available money", () => {
    expect(() => edit(book(), "2026-10", { closing: "2000001" })).toThrow(
      /số dư lớn hơn/,
    );
  });
  it("supports one-month target changes without changing later defaults", () => {
    const b = edit(book(), "2026-10", { target: "3000000" });
    expect(row(b).target).toBe("3000000");
    expect(row(b, "2026-11").target).toBe("2000000");
  });
  it("supports new effective defaults without altering previous months or labels", () => {
    const b = applyAction(
      book(),
      {
        type: "configureJar",
        jarId: id,
        month: "2026-10",
        amount: "4000000",
        name: "Sinh hoạt mới",
        description: "Mới",
        method: "Ví",
        group: "Gia đình",
      },
      clock,
    );
    expect(row(b, "2026-09").target).toBe("2000000");
    expect(row(b, "2026-09").method).toBe("Tiền mặt");
    expect(row(b).target).toBe("4000000");
    expect(row(b, "2026-11").name).toBe("Sinh hoạt mới");
  });
  it("replaces the selected month's exception with a new default but retains later exceptions", () => {
    let b = edit(book(), "2026-10", { target: "3000000" });
    b = edit(b, "2026-11", { target: "5000000" });
    b = applyAction(
      b,
      {
        type: "configureJar",
        jarId: id,
        month: "2026-10",
        amount: "4000000",
        name: "Sinh hoạt",
        description: "",
        method: "Tiền mặt",
        group: "",
      },
      clock,
    );
    expect(row(b).target).toBe("4000000");
    expect(row(b, "2026-11").target).toBe("5000000");
  });
  it("marks current inferred expenses provisional and future expenses zero", () => {
    const b = book();
    expect(row(b).status).toBe("provisional");
    expect(row(b, "2026-09").status).toBe("actual");
    expect(row(b, "2026-11").spent).toBe("0");
    expect(row(b, "2026-11").status).toBe("planned");
  });
  it("only allows planning overrides for future months", () => {
    expect(() => edit(book(), "2026-11", { extra: "1" })).toThrow(/tương lai/);
    expect(
      row(edit(book(), "2026-11", { target: "5000000" }), "2026-11").target,
    ).toBe("5000000");
  });
  it("does not invent months before the selected start", () => {
    expect(materialize(book(), clock).some((r) => r.month < "2026-09")).toBe(
      false,
    );
    expect(() => edit(book(), "2026-08")).toThrow();
  });
  it("preserves 24-digit precision and rejects overflowing monthly totals", () => {
    const b = edit(book(), "2026-10", { funding: "999999999999999999999999" });
    expect(row(b).spent).toBe("999999999999999999999999");
    expect(() =>
      edit(b, "2026-10", { funding: "999999999999999999999999", extra: "1" }),
    ).toThrow(/giới hạn/);
  });
  it("stopping never silently consumes a retained balance", () => {
    let b = edit(book(), "2026-09", { closing: "300000" });
    b = applyAction(b, { type: "stopJar", jarId: id, month: "2026-10" }, clock);
    expect(row(b).required).toBe("0");
    expect(row(b).closing).toBe("300000");
    expect(row(b).spent).toBe("0");
    expect(row(b, "2026-11").opening).toBe("300000");
  });
  it("shows all downstream changes before saving and does not mutate input", () => {
    const b = book();
    const original = JSON.stringify(b);
    const next = edit(b, "2026-09", { closing: "300000" });
    expect(changes(b, next, clock).map((c) => c.month)).toEqual([
      "2026-09",
      "2026-10",
    ]);
    expect(JSON.stringify(b)).toBe(original);
  });
});
describe("Deleting a jar", () => {
  const deleteJar = (value: ExpenseBook, time = clock) =>
    applyAction(value, { type: "deleteJar", jarId: id }, time);
  it("hides the jar from every month, keeps the record and audits the command", () => {
    const b = book("accumulation", "500000");
    const next = deleteJar(b);
    expect(materialize(next, clock)).toEqual([]);
    expect(next.jars).toHaveLength(1);
    expect(next.jars[0].deleted).toBe(true);
    expect(next.version).toBe(b.version + 1);
    expect(next.audit.at(-1)?.action).toBe("deleteJar");
    expect(materialize(b, clock).length).toBeGreaterThan(0);
  });
  it("previews every removed month as a removed row without mutating the input", () => {
    const b = book();
    const original = JSON.stringify(b);
    const removed = changes(b, deleteJar(b), clock);
    expect(removed.map((c) => c.month)).toEqual(
      materialize(b, clock).map((r) => r.month),
    );
    expect(removed.every((c) => c.before !== null && c.after === null)).toBe(
      true,
    );
    expect(JSON.stringify(b)).toBe(original);
  });
  it("rejects further actions on a deleted jar and double deletion", () => {
    const next = deleteJar(book("accumulation"));
    expect(() => deleteJar(next)).toThrow(/Không tìm thấy hũ/);
    expect(() => edit(next, "2026-10")).toThrow(/Không tìm thấy hũ/);
    expect(() =>
      applyAction(
        next,
        {
          type: "upsertSpend",
          id: spendId,
          jarId: id,
          date: clock.today,
          amount: "1",
          note: "",
        },
        clock,
      ),
    ).toThrow(/Không tìm thấy hũ/);
  });
  it("hides a deleted jar's usages with it instead of letting them be changed", () => {
    const withSpend = applyAction(
      book("accumulation", "500000"),
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: clock.today,
        amount: "1000",
        note: "",
      },
      clock,
    );
    const next = deleteJar(withSpend);
    expect(() =>
      applyAction(next, { type: "deleteSpend", id: spendId }, clock),
    ).toThrow(/Không tìm thấy hũ/);
    expect(next.spends).toHaveLength(1);
    expect(next.spends[0].deleted).toBeFalsy();
  });
  it("excludes a deleted jar from reports", () => {
    const next = deleteJar(book());
    const report = buildReport(
      materialize(next, clock),
      { year: 2026, from: 1, to: 12 },
      2026,
    );
    expect(report.totals).toBeNull();
  });
  it("is refused when the jar has rows in a closed year, and the book is unchanged", () => {
    const december = {
      today: "2026-12-15",
      now: "2026-12-15T09:00:00.000Z",
    };
    const january = { today: "2027-01-05", now: "2027-01-05T09:00:00.000Z" };
    const sealed = applyAction(
      book("accumulation", "0", "2026-12", december),
      { type: "closeYear", year: 2026 },
      january,
    );
    const before = JSON.stringify(sealed);
    try {
      deleteJar(sealed, january);
      throw new Error("expected deleteJar to be refused");
    } catch (error) {
      expect(error).toMatchObject({ code: "JAR_IN_CLOSED_YEAR", status: 409 });
    }
    expect(JSON.stringify(sealed)).toBe(before);
  });
  it("is refused once the current year itself is closed", () => {
    const closed = book();
    closed.years.find((y) => y.year === 2026)!.closedAt = clock.now;
    expect(() => deleteJar(closed)).toThrow(/Năm đã chốt/);
  });
  it("strict schema rejects extra fields", () => {
    expect(() =>
      expenseActionSchema.parse({ type: "deleteJar", jarId: id, month: "x" }),
    ).toThrow();
  });
});
describe("Accumulation", () => {
  it("contributes the full default every month rather than topping up to the target", () => {
    const r = row(book("accumulation", "300000"));
    expect(r.opening).toBe("2300000");
    expect(r.required).toBe("2000000");
    expect(r.closing).toBe("4300000");
    expect(r.spent).toBe("0");
  });
  it("records multiple uses, with balances checked in chronological order", () => {
    let b = applyAction(
      book("accumulation"),
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-09-10",
        amount: "1500000",
        note: "Học phí",
      },
      clock,
    );
    b = applyAction(
      b,
      {
        type: "upsertSpend",
        id: "20000000-0000-4000-8000-000000000002",
        jarId: id,
        date: "2026-10-01",
        amount: "1000000",
        note: "Đợt 2",
      },
      clock,
    );
    expect(row(b).opening).toBe("500000");
    expect(row(b).spent).toBe("1000000");
    expect(row(b).closing).toBe("1500000");
    expect(() =>
      applyAction(
        b,
        {
          type: "upsertSpend",
          id: spendId,
          jarId: id,
          date: "2026-09-10",
          amount: "2500000",
          note: "Vượt",
        },
        clock,
      ),
    ).toThrow(/không đủ/);
  });
  it("rejects retroactive reductions that make a later spend impossible", () => {
    const b = applyAction(
      book("accumulation"),
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-10-10",
        amount: "3500000",
        note: "Đợt đóng",
      },
      clock,
    );
    expect(() => edit(b, "2026-09", { funding: "0" })).toThrow(/không đủ/);
  });
  it("allows editing and deleting uses with an audit trail", () => {
    let b = applyAction(
      book("accumulation"),
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-10-10",
        amount: "1000000",
        note: "Đợt đóng",
      },
      clock,
    );
    b = applyAction(
      b,
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-10-11",
        amount: "500000",
        note: "Sửa",
      },
      clock,
    );
    expect(row(b).closing).toBe("3500000");
    b = applyAction(b, { type: "deleteSpend", id: spendId }, clock);
    expect(row(b).closing).toBe("4000000");
    expect(b.spends[0].deleted).toBe(true);
    expect(b.audit.at(-1)?.action).toBe("deleteSpend");
  });
  it("rejects future dates, dates before start, and manual accumulated closing", () => {
    const b = book("accumulation");
    for (const date of ["2026-08-30", "2026-10-16"])
      expect(() =>
        applyAction(
          b,
          {
            type: "upsertSpend",
            id: spendId,
            jarId: id,
            date,
            amount: "1",
            note: "",
          },
          clock,
        ),
      ).toThrow();
    expect(() => edit(b, "2026-10", { closing: "1" })).toThrow(/được tính/);
  });
  it("does not allow a per-use transaction on a monthly jar", () => {
    expect(() =>
      applyAction(
        book(),
        {
          type: "upsertSpend",
          id: spendId,
          jarId: id,
          date: clock.today,
          amount: "1",
          note: "",
        },
        clock,
      ),
    ).toThrow(/Chỉ hũ tích lũy/);
  });
});
describe("Funded mark", () => {
  const november = { today: "2026-11-20", now: "2026-11-20T09:00:00.000Z" };
  const setFunded = (
    value: ExpenseBook,
    month: string,
    funded: boolean,
    time = november,
  ) =>
    applyAction(
      value,
      { type: "setJarFunded", jarId: id, month, funded },
      time,
    );
  const monthly = (opening = "0") =>
    book("monthly", opening, "2026-10", november);
  it("keeps months before November 2026 funded by default", () => {
    const r = row(monthly(), "2026-10", november);
    expect(r.funded).toBe(true);
    expect(r.funding).toBe("2000000");
    expect(r.spent).toBe("2000000");
  });
  it("starts the current month unfunded: nothing contributed and nothing spent", () => {
    const r = row(monthly(), "2026-11", november);
    expect(r.funded).toBe(false);
    expect(r.required).toBe("2000000");
    expect(r.funding).toBe("0");
    expect(r.extra).toBe("0");
    expect(r.spent).toBe("0");
    expect(r.closing).toBe("0");
  });
  it("matches the previous figures once marked, and reverts when unmarked", () => {
    const marked = setFunded(monthly(), "2026-11", true);
    const r = row(marked, "2026-11", november);
    expect(r.funded).toBe(true);
    expect(r.funding).toBe("2000000");
    expect(r.spent).toBe("2000000");
    expect(r.closing).toBe("0");
    const reverted = row(
      setFunded(marked, "2026-11", false),
      "2026-11",
      november,
    );
    expect(reverted.funding).toBe("0");
    expect(reverted.spent).toBe("0");
  });
  it("carries the unspent opening forward so next month needs more money", () => {
    const b = book("monthly", "500000", "2026-11", november);
    const r = row(b, "2026-11", november);
    expect(r.opening).toBe("500000");
    expect(r.funding).toBe("0");
    expect(r.spent).toBe("0");
    expect(r.closing).toBe("500000");
    expect(row(b, "2026-12", november).required).toBe("1500000");
  });
  it("counts an explicit extra deposit even while the jar is unfunded", () => {
    const b = edit(monthly(), "2026-11", { extra: "100000" }, november);
    const r = row(b, "2026-11", november);
    expect(r.funding).toBe("0");
    expect(r.extra).toBe("100000");
    expect(r.spent).toBe("0");
    expect(r.closing).toBe("100000");
  });
  it("remembers a custom funding amount across unmark and remark", () => {
    let b = edit(monthly(), "2026-11", { funding: "1000000" }, november);
    b = setFunded(b, "2026-11", true);
    expect(row(b, "2026-11", november).funding).toBe("1000000");
    b = setFunded(b, "2026-11", false);
    expect(row(b, "2026-11", november).funding).toBe("0");
    b = setFunded(b, "2026-11", true);
    expect(row(b, "2026-11", november).funding).toBe("1000000");
  });
  it("editing a month keeps the mark", () => {
    const b = edit(
      setFunded(monthly(), "2026-11", true),
      "2026-11",
      { extra: "50000" },
      november,
    );
    expect(row(b, "2026-11", november).funded).toBe(true);
    expect(b.inputs.find((i) => i.month === "2026-11")?.funded).toBe(true);
  });
  it("does not break an unfunded month that already has a typed closing balance", () => {
    let b = setFunded(monthly(), "2026-11", true);
    b = edit(b, "2026-11", { closing: "300000" }, november);
    b = setFunded(b, "2026-11", false);
    const r = row(b, "2026-11", november);
    expect(r.closing).toBe("0");
    expect(r.spent).toBe("0");
  });
  it("previews the change and records an audit entry", () => {
    const b = monthly();
    const next = setFunded(b, "2026-11", true);
    const change = changes(b, next, november).find(
      (c) => c.month === "2026-11",
    );
    expect(change?.before?.funding).toBe("0");
    expect(change?.after?.funding).toBe("2000000");
    expect(next.audit.at(-1)?.action).toBe("setJarFunded");
    expect(next.version).toBe(b.version + 1);
  });
  it("rejects future months, stopped jars, months before the jar and hidden jars", () => {
    const b = monthly();
    expect(() => setFunded(b, "2026-12", true)).toThrow(/hiện tại hoặc đã qua/);
    const late = applyAction(
      applyAction(null, { type: "initialize", start: "2026-09" }, november),
      {
        type: "createJar",
        id,
        kind: "monthly",
        start: "2026-10",
        opening: "0",
        name: "Sinh hoạt",
        description: "",
        method: "Tiền mặt",
        group: "",
        amount: "2000000",
      },
      november,
    );
    expect(() => setFunded(late, "2026-09", true)).toThrow(/chưa bắt đầu/);
    const stopped = applyAction(
      b,
      { type: "stopJar", jarId: id, month: "2026-11" },
      november,
    );
    expect(() => setFunded(stopped, "2026-11", true)).toThrow(/đã ngừng/);
    expect(row(stopped, "2026-11", november).funded).toBe(true);
    const deleted = applyAction(b, { type: "deleteJar", jarId: id }, november);
    expect(() => setFunded(deleted, "2026-11", true)).toThrow(/Không tìm thấy/);
  });
  it("rejects years that are already closed", () => {
    const december = { today: "2026-12-31", now: "2026-12-31T12:00:00.000Z" };
    const january = { today: "2027-01-05", now: "2027-01-05T12:00:00.000Z" };
    const sealed = applyAction(
      book("monthly", "0", "2026-12", december),
      { type: "closeYear", year: 2026 },
      january,
    );
    expect(() => setFunded(sealed, "2026-12", true, january)).toThrow(
      /đã chốt/,
    );
  });
  it("accepts only the strict action shape", () => {
    const base = { type: "setJarFunded", jarId: id, month: "2026-11" };
    expect(() =>
      expenseActionSchema.parse({ ...base, funded: true }),
    ).not.toThrow();
    expect(() => expenseActionSchema.parse({ ...base })).toThrow();
    expect(() =>
      expenseActionSchema.parse({ ...base, funded: true, extra: 1 }),
    ).toThrow();
  });
  it("treats an accumulation jar with recorded usage as funded, and protects it", () => {
    const base = book("accumulation", "0", "2026-11", november);
    expect(row(base, "2026-11", november).funded).toBe(false);
    expect(row(base, "2026-11", november).closing).toBe("0");
    const marked = setFunded(base, "2026-11", true);
    const used = applyAction(
      marked,
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-11-10",
        amount: "500000",
        note: "",
      },
      november,
    );
    expect(row(used, "2026-11", november).spent).toBe("500000");
    expect(row(used, "2026-11", november).closing).toBe("1500000");
    expect(() => setFunded(used, "2026-11", false)).toThrow(/không đủ tiền/);
    // Without an explicit mark, a month that already has usage counts as funded.
    const unmarkedUsed = { ...used, inputs: [] };
    expect(row(unmarkedUsed, "2026-11", november).funded).toBe(true);
  });
});
describe("Years, archives, and labels", () => {
  const december = { today: "2026-12-31", now: "2026-12-31T12:00:00.000Z" };
  const january = { today: "2027-01-05", now: "2027-01-05T12:00:00.000Z" };
  it("carries monthly balances into January, once, with no extra income", () => {
    const b = fund(
      edit(
        fund(book("monthly", "0", "2026-12", december), "2026-12", december),
        "2026-12",
        { closing: "300000" },
        december,
      ),
      "2027-01",
      january,
    );
    expect(row(b, "2027-01", january).opening).toBe("300000");
    expect(row(b, "2027-01", january).funding).toBe("1700000");
    expect(toView(b, january).book?.years.map((y) => y.year)).toEqual([
      2026, 2027,
    ]);
    expect(toView(b, january).book?.years).toHaveLength(2);
  });
  it("carries accumulated funds and permits December completion before sealing", () => {
    let b = fund(
      book("accumulation", "500000", "2026-12", december),
      "2026-12",
      december,
    );
    expect(row(b, "2027-01", january).opening).toBe("2500000");
    b = applyAction(
      b,
      {
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-12-30",
        amount: "1000000",
        note: "Đóng phí",
      },
      january,
    );
    b = fund(b, "2027-01", january);
    expect(row(b, "2027-01", january).opening).toBe("1500000");
    expect(row(b, "2027-01", january).funding).toBe("2000000");
  });
  it("seals an immutable snapshot and rejects old-year inputs, uses, and configuration", () => {
    let b = fund(
      book("accumulation", "0", "2026-12", december),
      "2026-12",
      december,
    );
    b = applyAction(b, { type: "closeYear", year: 2026 }, january);
    const snapshot = JSON.stringify(b.years[0].snapshot);
    expect(() => edit(b, "2026-12", { funding: "1" }, january)).toThrow(
      /đã chốt/,
    );
    expect(() =>
      applyAction(
        b,
        {
          type: "configureJar",
          jarId: id,
          month: "2026-12",
          name: "Sai",
          description: "",
          amount: "1",
          method: "X",
          group: "",
        },
        january,
      ),
    ).toThrow(/đã chốt/);
    b = edit(b, "2027-01", { extra: "100000" }, january);
    expect(JSON.stringify(b.years[0].snapshot)).toBe(snapshot);
    expect(row(b, "2027-01", january).opening).toBe("2000000");
  });
  it("requires chronological sealing and prevents sealing the active year", () => {
    const b = book("monthly", "0", "2025-12");
    expect(() =>
      applyAction(b, { type: "closeYear", year: 2026 }, january),
    ).toThrow(/thứ tự/);
    expect(() =>
      applyAction(b, { type: "closeYear", year: 2026 }, clock),
    ).toThrow(/đã kết thúc/);
  });
  it("renaming or deleting label suggestions does not rewrite historical classifications", () => {
    let b = applyAction(
      book(),
      { type: "upsertLabel", id: labelId, kind: "method", name: "Tiền mặt" },
      clock,
    );
    b = applyAction(
      b,
      { type: "upsertLabel", id: labelId, kind: "method", name: "Ví mới" },
      clock,
    );
    b = applyAction(b, { type: "deleteLabel", id: labelId }, clock);
    expect(row(b).method).toBe("Tiền mặt");
    expect(b.labels).toHaveLength(0);
  });
  it("rejects duplicate labels, invalid dates, negative and floating-point money, and type edits", () => {
    expect(
      expenseActionSchema.safeParse({
        type: "upsertSpend",
        id: spendId,
        jarId: id,
        date: "2026-02-30",
        amount: "1",
        note: "",
      }).success,
    ).toBe(false);
    for (const amount of ["-1", "1.2", "01", 100])
      expect(
        expenseActionSchema.safeParse({
          type: "editMonth",
          jarId: id,
          month: "2026-10",
          target: null,
          funding: null,
          extra: amount,
          closing: null,
        }).success,
      ).toBe(false);
    expect(
      commandSchema.safeParse({
        id: spendId,
        expectedVersion: 0,
        action: {
          type: "configureJar",
          jarId: id,
          month: "2026-10",
          name: "X",
          description: "",
          method: "X",
          group: "",
          amount: "0",
          kind: "accumulation",
        },
      }).success,
    ).toBe(false);
    const b = applyAction(
      book(),
      { type: "upsertLabel", id: labelId, kind: "group", name: "Gia đình" },
      clock,
    );
    expect(() =>
      applyAction(
        b,
        { type: "upsertLabel", id: spendId, kind: "group", name: "gia đình" },
        clock,
      ),
    ).toThrow(/đã tồn tại/);
  });
  it("uses the Vietnamese date across UTC midnight boundaries", () => {
    expect(vietnamClock(new Date("2026-12-31T17:00:00Z")).today).toBe(
      "2027-01-01",
    );
  });
});
describe("Jar names", () => {
  const second = "20000000-0000-4000-8000-000000000002";
  const jar = (name: string, jarId = second) =>
    ({
      type: "createJar",
      id: jarId,
      kind: "monthly",
      start: "2026-09",
      opening: "0",
      name,
      description: "",
      method: "Tiền mặt",
      group: "",
      amount: "1000000",
    }) as const;
  const configure = (jarId: string, name: string) =>
    ({
      type: "configureJar",
      jarId,
      month: "2026-10",
      name,
      description: "",
      method: "Tiền mặt",
      group: "",
      amount: "1000000",
    }) as const;
  it("rejects a new jar that reuses a name and reports it on the name field", () => {
    for (const name of ["sinh hoạt", "  SINH   HOẠT "])
      expect(() => applyAction(book(), jar(name), clock)).toThrow(
        expect.objectContaining({
          code: "DUPLICATE_NAME",
          fieldErrors: { name: "Tên hũ đã tồn tại." },
        }),
      );
    expect(() => applyAction(book(), jar("Sinh hoat"), clock)).not.toThrow();
  });
  it("rejects renaming onto another jar, allows keeping or re-casing its own name, and counts stopped jars", () => {
    const two = applyAction(book(), jar("Đi lại"), clock);
    expect(() =>
      applyAction(two, configure(second, "sinh hoạt"), clock),
    ).toThrow(/Tên hũ đã tồn tại/);
    expect(() =>
      applyAction(two, configure(id, "SINH HOẠT"), clock),
    ).not.toThrow();
    const stopped = applyAction(
      book(),
      { type: "stopJar", jarId: id, month: "2026-10" },
      clock,
    );
    expect(() => applyAction(stopped, jar("Sinh hoạt"), clock)).toThrow(
      /Tên hũ đã tồn tại/,
    );
  });
  it("lets jars that already share a name be edited while the name stays the same", () => {
    const legacy = structuredClone(applyAction(book(), jar("Đi lại"), clock));
    legacy.jars.find((j) => j.id === second)!.rules[0].name = "Sinh hoạt";
    expect(() =>
      applyAction(
        legacy,
        { ...configure(second, "Sinh hoạt"), amount: "1500000" },
        clock,
      ),
    ).not.toThrow();
  });
});
describe("Reports reconcile without double counting", () => {
  it("separates accumulation contributions from consumption and excludes future funding", () => {
    const b = book("accumulation");
    const rows = materialize(b, clock);
    const report = buildReport(rows, { year: 2026, from: 1, to: 12 }, 2026);
    expect(report.totals?.funding).toBe("4000000");
    expect(report.totals?.spent).toBe("0");
    expect(report.accumulation[0].opening).toBe("0");
    expect(report.accumulation[0].closing).toBe("4000000");
    expect(report.byMonth.find((r) => r.key === "2026-11")?.spent).toBe("0");
  });
  it("reconciles grouped spending, filters and table/chart data from one result", () => {
    const rows = materialize(book(), clock);
    const filter = { year: 2026, from: 9, to: 10 };
    const report = buildReport(rows, filter, 2026);
    expect(report.totals?.spent).toBe("4000000");
    for (const grouped of [
      report.byMonth,
      report.byMethod,
      report.byGroup,
      report.byJar,
    ])
      expect(grouped.reduce((n, r) => n + BigInt(r.spent), 0n).toString()).toBe(
        report.totals?.spent,
      );
    expect(
      buildReport(rows, { ...filter, method: "Không có" }, 2026).totals,
    ).toBe(null);
  });
  it("accepts several kinds, methods and groups and treats an empty list as no filter", () => {
    const rows = materialize(book(), clock);
    const filter = { year: 2026, from: 9, to: 10 };
    const all = buildReport(rows, filter, 2026);
    const methods = [...new Set(rows.map((r) => r.method))];
    const kinds = [...new Set(rows.map((r) => r.kind))];
    expect(
      buildReport(rows, { ...filter, kind: [], method: [], group: [] }, 2026)
        .totals,
    ).toEqual(all.totals);
    expect(
      buildReport(rows, { ...filter, kind: kinds, method: methods }, 2026)
        .totals,
    ).toEqual(all.totals);
    expect(
      buildReport(rows, { ...filter, method: [...methods, "Không có"] }, 2026)
        .totals,
    ).toEqual(all.totals);
    expect(
      buildReport(rows, { ...filter, method: ["Không có", "Cũng không"] }, 2026)
        .totals,
    ).toBe(null);
  });
  it("does not merge same-named jars or offset overspending with another month's underspending", () => {
    let b = edit(book(), "2026-09", { extra: "400000" });
    b = edit(b, "2026-10", { closing: "500000" });
    b = applyAction(
      b,
      {
        type: "createJar",
        id: spendId,
        kind: "accumulation",
        start: "2026-10",
        opening: "4000000",
        name: "Sinh hoạt 2",
        description: "",
        amount: "2000000",
        method: "Ví",
        group: "",
      },
      clock,
    );
    // New jars can no longer share a name, but older data may already hold two.
    b = structuredClone(b);
    b.jars.find((j) => j.id === spendId)!.rules[0].name = "Sinh hoạt";
    b = applyAction(
      b,
      {
        type: "upsertSpend",
        id: labelId,
        jarId: spendId,
        date: clock.today,
        amount: "5000000",
        note: "",
      },
      clock,
    );
    const report = buildReport(
      materialize(b, clock),
      { year: 2026, from: 9, to: 10 },
      2026,
    );
    expect(report.byJar).toHaveLength(2);
    expect(report.totals?.over).toBe("400000");
  });
  it("rejects cross-year reports and invalid ranges", () => {
    expect(() =>
      buildReport([], { year: 2025, from: 1, to: 12 }, 2026),
    ).toThrow(/năm hiện tại/);
    expect(() =>
      buildReport([], { year: 2026, from: 12, to: 1 }, 2026),
    ).toThrow(/Khoảng tháng/);
  });
});

it("projects only the overview month while preserving cross-year carry and sealed snapshots", () => {
  const december = { today: "2026-12-29", now: "2026-12-29T00:00:00Z" };
  const january = { today: "2027-01-15", now: "2027-01-15T00:00:00Z" };
  for (const kind of ["monthly", "accumulation"] as const) {
    const original = book(kind, "350000", "2026-12", december);
    const sealed = applyAction(
      original,
      { type: "closeYear", year: 2026 },
      january,
    );
    for (const ledger of [original, sealed]) {
      const snapshot = JSON.stringify(ledger);
      expect(materialize(ledger, january, "2027-01")).toEqual(
        toView(ledger, january).rows.filter((r) => r.month === "2027-01"),
      );
      expect(JSON.stringify(ledger)).toBe(snapshot);
    }
  }
});
