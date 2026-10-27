import { afterEach, describe, expect, it, vi } from "vitest";
import { incomeJSON } from "../src/features/income/api";
import { applyAction, toView } from "../src/domain/income/engine";
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
    expect(() =>
      applyAction(cleared, { type: "deleteCategory", categoryId: id }, clock),
    ).toThrow(/Ngừng/);
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
