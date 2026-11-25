import { afterEach, describe, expect, it, vi } from "vitest";
import { incomeJSON } from "../src/features/income/api";
import {
  applyAction,
  hasMonthlyIncome,
  incomeDueDay,
  isIncomeDue,
  toView,
} from "../src/domain/income/engine";
import type { IncomeBook } from "../src/domain/income/types";
import { buildReport } from "../src/domain/income/reports";
import { reportCSV } from "../src/i18n/report-exports/income";
import type { IncomeAction } from "../src/domain/income/schema";
import {
  runIncomeCommand,
  type IncomeRepository,
  type StoredCommand,
} from "../src/application/income";
import { safeReturnPath } from "../src/lib/auth-return";
const id = "10000000-0000-4000-8000-000000000001";
const once = "10000000-0000-4000-8000-000000000002";
const request = "10000000-0000-4000-8000-000000000003";
const clock = { today: "2027-03-15", now: "2027-03-15T01:00:00.000Z" };
const create: IncomeAction = {
  type: "createCategory",
  id,
  start: "2026-12",
  name: "Lương",
  description: "Công việc",
};
const set = (month: string, amount: string): IncomeAction => ({
  type: "setMonthly",
  categoryId: id,
  month,
  amount,
  note: "",
});
function book(...actions: IncomeAction[]) {
  return [create, ...actions].reduce<IncomeBook | null>(
    (b, a) => applyAction(b, a, clock),
    null,
  )!;
}
const report = (b: IncomeBook, year = 2027, extra = {}) =>
  buildReport(toView(b, year, clock), {
    year,
    from: 1,
    to: 12,
    kind: "all",
    ...extra,
  });
describe("Income monthly domain and reports", () => {
  it("continues categories across years without copying money", () => {
    const b = book(set("2026-12", "100"));
    const next = toView(b, 2027, clock);
    expect(next.rows).toHaveLength(12);
    expect(next.rows.every((r) => r.amount === null)).toBe(true);
    expect(report(b).total).toBeNull();
    expect(report(b).missing).toBe(3);
  });
  it("replaces a monthly amount and distinguishes explicit zero from absent", () => {
    const b = book(
      set("2027-01", "10"),
      set("2027-01", "20"),
      set("2027-02", "0"),
    );
    const r = report(b);
    expect(r.total).toBe("20");
    expect(b.monthly).toHaveLength(2);
    expect(r.months.map((m) => m.total).slice(0, 3)).toEqual(["20", "0", null]);
    expect(r.missing).toBe(1);
  });
  it("clears amounts, preserves audit and can record again", () => {
    const b = book(set("2027-01", "12"), {
      type: "clearMonthly",
      categoryId: id,
      month: "2027-01",
    });
    expect(report(b).total).toBeNull();
    expect(b.audit.at(-1)!.detail).toMatchObject({
      before: { monthly: [{ amount: "12" }] },
    });
    expect(applyAction(b, set("2027-01", "9"), clock).monthly[0].amount).toBe(
      "9",
    );
  });
  it("handles money beyond JS precision and sums beyond column precision", () => {
    const b = book(
      set("2027-01", "999999999999999999999999"),
      set("2027-02", "999999999999999999999999"),
    );
    expect(report(b).total).toBe("1999999999999999999999998");
    expect(() =>
      applyAction(b, set("2027-03", "1000000000000000000000000"), clock),
    ).toThrow();
  });
  it("keeps historical names and aggregates rename by stable ID", () => {
    const b = book(
      set("2027-01", "10"),
      {
        type: "configureCategory",
        categoryId: id,
        month: "2027-02",
        name: "Lương mới",
        description: "Thay đổi",
      },
      set("2027-02", "20"),
    );
    const r = report(b);
    expect(r.categories).toHaveLength(1);
    expect(r.categories[0].total).toBe("30");
    expect(r.categories[0].months.slice(0, 2).map((m) => m.name)).toEqual([
      "Lương",
      "Lương mới",
    ]);
  });
  it("stops empty prompts without dropping receipts and keeps receipts editable", () => {
    const b = book(
      set("2027-03", "10"),
      {
        type: "configureCategory",
        categoryId: id,
        month: "2027-06",
        name: "Scheduled",
        description: "",
      },
      { type: "stopCategory", categoryId: id, month: "2027-02" },
    );
    expect(toView(b, 2027, clock).rows.map((r) => r.month)).toEqual([
      "2027-01",
      "2027-03",
    ]);
    expect(toView(b, 2028, clock).rows).toEqual([]);
    expect(report(b).total).toBe("10");
    expect(() => applyAction(b, set("2027-02", "2"), clock)).toThrow(/ngừng/);
    expect(report(applyAction(b, set("2027-03", "20"), clock)).total).toBe(
      "20",
    );
  });
  it("deletes unused categories and prevents deleting categories with zero receipts", () => {
    expect(
      toView(
        applyAction(book(), { type: "deleteCategory", categoryId: id }, clock),
        2027,
        clock,
      ).rows,
    ).toEqual([]);
    expect(() =>
      applyAction(
        book(set("2027-01", "0")),
        { type: "deleteCategory", categoryId: id },
        clock,
      ),
    ).toThrow(/Ngừng/);
    const cleared = book(set("2027-01", "10"), {
      type: "clearMonthly",
      categoryId: id,
      month: "2027-01",
    });
    const deleted = applyAction(
      cleared,
      { type: "deleteCategory", categoryId: id },
      clock,
    );
    expect(deleted.categories[0].deleted).toBe(true);
    expect(deleted.audit.slice(0, -1)).toEqual(cleared.audit);
    expect(deleted.audit.at(-1)?.action).toBe("deleteCategory");
    expect(toView(deleted, 2027, clock).rows).toEqual([]);
  });
  it("checks every year and other categories without treating a cleared receipt as current data", () => {
    const other = "10000000-0000-4000-8000-000000000009";
    const b = book(set("2026-12", "0"), set("2027-01", "10"), {
      ...create,
      id: other,
      name: "Lương khác",
    });
    expect(hasMonthlyIncome(b, id)).toBe(true);
    expect(hasMonthlyIncome(b, other)).toBe(false);
    const partial = applyAction(
      b,
      { type: "clearMonthly", categoryId: id, month: "2027-01" },
      clock,
    );
    expect(() =>
      applyAction(partial, { type: "deleteCategory", categoryId: id }, clock),
    ).toThrow(/Ngừng/);
    const empty = applyAction(
      partial,
      { type: "clearMonthly", categoryId: id, month: "2026-12" },
      clock,
    );
    expect(hasMonthlyIncome(empty, id)).toBe(false);
    const stopped = applyAction(
      empty,
      { type: "stopCategory", categoryId: id, month: "2027-01" },
      clock,
    );
    expect(
      applyAction(stopped, { type: "deleteCategory", categoryId: id }, clock)
        .categories[0].deleted,
    ).toBe(true);
    const future = applyAction(null, { ...create, start: "2028-01" }, clock);
    expect(
      applyAction(future, { type: "deleteCategory", categoryId: id }, clock)
        .categories[0].deleted,
    ).toBe(true);
  });
  it("keeps later historical names when backdating a stop", () => {
    const b = book(
      {
        type: "configureCategory",
        categoryId: id,
        month: "2027-02",
        name: "Tên lịch sử",
        description: "",
      },
      set("2027-03", "3"),
      { type: "stopCategory", categoryId: id, month: "2027-01" },
    );
    expect(
      toView(b, 2027, clock).rows.map((r) => [r.month, r.name, r.amount]),
    ).toEqual([["2027-03", "Tên lịch sử", "3"]]);
  });
  it("separates category and one-off identifiers even when UUIDs coincide", () => {
    const b = book(set("2027-01", "10"), {
      type: "upsertOneOff",
      id,
      month: "2027-01",
      name: "Phát sinh",
      description: "",
      amount: "5",
    });
    const r = report(b);
    expect(r.total).toBe("15");
    expect(r.categories[0].total).toBe("10");
    expect(r.oneoff).toBe("5");
  });
  it("one-offs never create categories and edit/delete recalculate totals", () => {
    const action: IncomeAction = {
      type: "upsertOneOff",
      id: once,
      month: "2027-01",
      name: "Thưởng",
      description: "Một lần",
      amount: "5",
    };
    let b = applyAction(null, action, clock);
    expect(b.categories).toEqual([]);
    b = applyAction(b, { ...action, amount: "7", month: "2027-02" }, clock);
    expect(
      report(b)
        .months.slice(0, 2)
        .map((m) => m.total),
    ).toEqual([null, "7"]);
    b = applyAction(b, { type: "deleteOneOff", id: once }, clock);
    expect(report(b).total).toBeNull();
    expect(() => applyAction(b, action, clock)).toThrow(/đã bị xóa/);
  });
  it("rejects future actuals, negatives, decimals and invalid periods", () => {
    const b = book();
    for (const amount of ["-1", "1.5", "01", "1,000"])
      expect(() => applyAction(b, set("2027-01", amount), clock)).toThrow();
    expect(() => applyAction(b, set("2027-04", "1"), clock)).toThrow(
      /thực nhận/,
    );
    expect(() => applyAction(b, set("2026-11", "1"), clock)).toThrow(/bắt đầu/);
    expect(() => applyAction(b, set("2027-13", "1"), clock)).toThrow();
    expect(() => report(b, 2027, { from: 4, to: 1 })).toThrow();
  });
  it("uses the same totals across filters, quarters, categories and CSV", () => {
    const b = book(set("2027-01", "10"), set("2027-03", "30"), {
      type: "upsertOneOff",
      id: once,
      month: "2027-02",
      name: '=SUM(A1) "test"',
      description: "a,b\nline",
      amount: "5",
    });
    const r = report(b);
    expect(r.total).toBe("45");
    expect(r.quarters[0].total).toBe("45");
    expect(report(b, 2027, { kind: "fixed" }).total).toBe("40");
    expect(report(b, 2027, { kind: "oneoff" }).total).toBe("5");
    expect(report(b, 2027, { categoryId: id }).total).toBe("40");
    expect(report(b, 2027, { from: 2, to: 2 }).total).toBe("5");
    const csv = reportCSV(r);
    expect(csv).toContain("\uFEFF");
    expect(csv).toContain('"45"');
    expect(csv).toContain('"\'=SUM(A1) ""test"""');
  });
  it("does not mutate the original book and cannot accept client owners", () => {
    const b = book();
    const copy = structuredClone(b);
    applyAction(b, set("2027-01", "1"), clock);
    expect(b).toEqual(copy);
    expect(() =>
      applyAction(
        b,
        { ...set("2027-01", "1"), ownerId: id } as unknown as IncomeAction,
        clock,
      ),
    ).toThrow();
  });
  it("limits return destinations to known application routes", () => {
    expect(safeReturnPath("/income")).toBe("/income");
    expect(safeReturnPath("/profile")).toBe("/profile");
    for (const s of [
      "https://evil.test",
      "//evil.test",
      "/income?next=evil",
      undefined,
    ])
      expect(safeReturnPath(s)).toBe("/overview");
  });
});
describe("Income receive day", () => {
  const fixedRows = (b: IncomeBook, year = 2027) =>
    toView(b, year, clock).rows.filter((r) => r.kind === "fixed");
  const withDay = (receiveDay: number): IncomeAction => ({
    ...create,
    receiveDay,
  });
  const configure = (month: string, receiveDay?: number): IncomeAction => ({
    type: "configureCategory",
    categoryId: id,
    month,
    name: "Lương",
    description: "Công việc",
    ...(receiveDay === undefined ? {} : { receiveDay }),
  });
  it("treats rules without a receive day as day 1 and stores nothing for them", () => {
    const legacy = book();
    expect(legacy.categories[0].rules[0]).not.toHaveProperty("receiveDay");
    expect(fixedRows(legacy).every((r) => r.receiveDay === 1)).toBe(true);
  });
  it("stores the day, applies a change only from its effective month and survives stop", () => {
    const b = [withDay(10), configure("2027-02", 20)].reduce<IncomeBook | null>(
      (acc, a) => applyAction(acc, a, clock),
      null,
    )!;
    const days = Object.fromEntries(
      fixedRows(b).map((r) => [r.month, r.receiveDay]),
    );
    expect(days).toMatchObject({
      "2027-01": 10,
      "2027-02": 20,
      "2027-03": 20,
    });
    const stopped = applyAction(
      b,
      { type: "stopCategory", categoryId: id, month: "2027-03" },
      clock,
    );
    expect(
      stopped.categories[0].rules.find((r) => r.month === "2027-03"),
    ).toMatchObject({ active: false, receiveDay: 20 });
    // Renaming without a day keeps the previous one.
    const renamed = applyAction(b, configure("2027-03"), clock);
    expect(
      fixedRows(renamed).find((r) => r.month === "2027-04")?.receiveDay,
    ).toBe(20);
  });
  it("rejects days outside 1-31", () => {
    for (const day of [0, 32, 1.5, -1])
      expect(() => applyAction(null, withDay(day), clock)).toThrow();
  });
  it("only prompts from the receive day in the current month and clamps to short months", () => {
    expect(incomeDueDay("2027-02", 31)).toBe(28);
    expect(incomeDueDay("2028-02", 31)).toBe(29);
    expect(incomeDueDay("2027-04", 31)).toBe(30);
    const row = (month: string, receiveDay: number) => ({ month, receiveDay });
    expect(isIncomeDue(row("2027-03", 15), "2027-03-15")).toBe(true);
    expect(isIncomeDue(row("2027-03", 16), "2027-03-15")).toBe(false);
    expect(isIncomeDue(row("2027-02", 31), "2027-03-01")).toBe(true);
    expect(isIncomeDue(row("2027-04", 1), "2027-03-31")).toBe(false);
    // Day 31 in February is due on the 28th.
    expect(isIncomeDue(row("2027-02", 31), "2027-02-27")).toBe(false);
    expect(isIncomeDue(row("2027-02", 31), "2027-02-28")).toBe(true);
  });
  it("keeps not-yet-due rows out of the missing counts but still lists past months", () => {
    const month = (b: IncomeBook, m: string) =>
      report(b).months.find((x) => x.month === m)!.missing;
    const early = book();
    expect(month(early, "2027-03")).toBe(1);
    const late = [withDay(20)].reduce<IncomeBook | null>(
      (acc, a) => applyAction(acc, a, clock),
      null,
    )!;
    expect(month(late, "2027-03")).toBe(0);
    expect(month(late, "2027-02")).toBe(1);
    expect(
      isIncomeDue(
        fixedRows(late).find((r) => r.month === "2027-03")!,
        clock.today,
      ),
    ).toBe(false);
  });
  it("shows the receive day in command previews", async () => {
    const stored = new Map<string, StoredCommand>();
    let value: IncomeBook | null = applyAction(null, create, clock);
    const repository: IncomeRepository = {
      async transaction(_owner, fn) {
        return fn({
          read: async () => structuredClone(value),
          command: async (key) => stored.get(key) ?? null,
          save: async (b) => {
            value = structuredClone(b);
          },
          remember: async (key, result) => {
            stored.set(key, result);
          },
        });
      },
    };
    const preview = await runIncomeCommand(
      repository,
      id,
      { id: request, expectedVersion: 1, action: configure("2027-02", 25) },
      clock,
      true,
    );
    expect(preview.changes).toContainEqual(
      expect.objectContaining({
        month: "2027-02",
        beforeReceiveDay: 1,
        afterReceiveDay: 25,
      }),
    );
  });
});
describe("Income source names", () => {
  const other = "10000000-0000-4000-8000-000000000009";
  const named = (name: string, categoryId = other): IncomeAction => ({
    ...create,
    id: categoryId,
    name,
  });
  const rename = (categoryId: string, name: string): IncomeAction => ({
    type: "configureCategory",
    categoryId,
    month: "2027-01",
    name,
    description: "Công việc",
  });
  it("rejects a new source whose name only differs by case or spacing, with a field error", () => {
    for (const name of ["lương", "  LƯƠNG  ", "Lương"])
      expect(() => applyAction(book(), named(name), clock)).toThrow(
        expect.objectContaining({
          code: "DUPLICATE_NAME",
          fieldErrors: { name: "Tên nguồn thu đã tồn tại." },
        }),
      );
    expect(() => applyAction(book(), named("Lương 2"), clock)).not.toThrow();
  });
  it("keeps diacritics significant", () => {
    expect(() => applyAction(book(), named("Luong"), clock)).not.toThrow();
  });
  it("rejects renaming onto another source but allows keeping or re-casing its own name", () => {
    const two = applyAction(book(), named("Tiền nhà"), clock);
    expect(() => applyAction(two, rename(other, "lương"), clock)).toThrow(
      /đã tồn tại/,
    );
    expect(() => applyAction(two, rename(id, "LƯƠNG"), clock)).not.toThrow();
    expect(() =>
      applyAction(two, rename(other, "Tiền nhà mới"), clock),
    ).not.toThrow();
  });
  it("still counts a stopped source but not a deleted one", () => {
    const stopped = applyAction(
      book(),
      { type: "stopCategory", categoryId: id, month: "2027-01" },
      clock,
    );
    expect(() => applyAction(stopped, named("Lương"), clock)).toThrow(
      /đã tồn tại/,
    );
    const deleted = applyAction(
      book(),
      { type: "deleteCategory", categoryId: id },
      clock,
    );
    expect(() => applyAction(deleted, named("Lương"), clock)).not.toThrow();
  });
  it("lets sources that already share a name keep being edited when the name is unchanged", () => {
    const legacy = structuredClone(book());
    legacy.categories.push({
      ...structuredClone(legacy.categories[0]),
      id: other,
    });
    expect(() =>
      applyAction(
        legacy,
        {
          type: "configureCategory",
          categoryId: other,
          month: "2027-01",
          name: "Lương",
          description: "Mô tả mới",
          receiveDay: 20,
        },
        clock,
      ),
    ).not.toThrow();
    expect(() => applyAction(legacy, set("2027-01", "5"), clock)).not.toThrow();
  });
  it("allows one-off income to repeat a name", () => {
    const oneOff = (oneOffId: string): IncomeAction => ({
      type: "upsertOneOff",
      id: oneOffId,
      month: "2027-01",
      name: "Thưởng",
      description: "",
      amount: "100",
    });
    const b = applyAction(
      applyAction(null, oneOff(id), clock),
      oneOff(other),
      clock,
    );
    expect(b.oneOffs).toHaveLength(2);
  });
});
describe("Income command transaction contract", () => {
  function memory() {
    let value: IncomeBook | null = null;
    const commands = new Map<string, StoredCommand>();
    const repository: IncomeRepository = {
      async transaction(_owner, fn) {
        return fn({
          read: async () => structuredClone(value),
          command: async (id) => commands.get(id) ?? null,
          save: async (b) => {
            value = structuredClone(b);
          },
          remember: async (id, result) => {
            commands.set(id, result);
          },
        });
      },
    };
    return { repository, read: () => value };
  }
  it("previews without mutation, commits once, detects idempotency and version conflicts", async () => {
    const m = memory();
    const cmd = { id: request, expectedVersion: 0, action: create };
    await runIncomeCommand(m.repository, id, cmd, clock, true);
    expect(m.read()).toBeNull();
    const first = await runIncomeCommand(m.repository, id, cmd, clock);
    expect(await runIncomeCommand(m.repository, id, cmd, clock)).toEqual(first);
    expect(m.read()?.version).toBe(1);
    await expect(
      runIncomeCommand(
        m.repository,
        id,
        { ...cmd, action: { ...create, name: "Other" } },
        clock,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(
      runIncomeCommand(m.repository, id, { ...cmd, id: once }, clock),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
});
describe("Income client error handling", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("localizes network failures and keeps retry distinguishable from auth errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(incomeJSON("")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
      message: expect.stringContaining("giữ lại"),
    });
  });
  it("handles malformed server responses and preserves structured conflicts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("<html>error</html>", { status: 503 })),
    );
    await expect(incomeJSON("")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      status: 503,
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Dữ liệu đã thay đổi", code: "VERSION_CONFLICT" },
            { status: 409 },
          ),
        ),
    );
    await expect(incomeJSON("")).rejects.toMatchObject({
      code: "VERSION_CONFLICT",
      status: 409,
    });
  });
});
