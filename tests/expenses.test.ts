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
describe("Years, archives, and labels", () => {
  const december = { today: "2026-12-31", now: "2026-12-31T12:00:00.000Z" };
  const january = { today: "2027-01-05", now: "2027-01-05T12:00:00.000Z" };
  it("carries monthly balances into January, once, with no extra income", () => {
    const b = edit(
      book("monthly", "0", "2026-12", december),
      "2026-12",
      { closing: "300000" },
      december,
    );
    expect(row(b, "2027-01", january).opening).toBe("300000");
    expect(row(b, "2027-01", january).funding).toBe("1700000");
    expect(toView(b, january).book?.years.map((y) => y.year)).toEqual([
      2026, 2027,
    ]);
    expect(toView(b, january).book?.years).toHaveLength(2);
  });
  it("carries accumulated funds and permits December completion before sealing", () => {
    let b = book("accumulation", "500000", "2026-12", december);
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
    expect(row(b, "2027-01", january).opening).toBe("1500000");
    expect(row(b, "2027-01", january).funding).toBe("2000000");
  });
  it("seals an immutable snapshot and rejects old-year inputs, uses, and configuration", () => {
    let b = book("accumulation", "0", "2026-12", december);
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
        name: "Sinh hoạt",
        description: "",
        amount: "2000000",
        method: "Ví",
        group: "",
      },
      clock,
    );
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
