import { describe, expect, it } from "vitest";
import { applyAction, materialize } from "../src/domain/expenses/engine";
import { expenseActionSchema } from "../src/domain/expenses/schema";
import { jarEmoji } from "../src/domain/expenses/emoji";
import { donutSlices } from "../src/features/expenses/chart-data";
const clock = { today: "2027-02-15", now: "2027-02-15T09:00:00Z" };
const id = "10000000-0000-4000-8000-000000000001";
function initial() {
  const b = applyAction(null, { type: "initialize", start: "2026-12" }, clock);
  return applyAction(
    b,
    {
      type: "createJar",
      id,
      kind: "monthly",
      start: "2026-12",
      opening: "200000",
      name: "Ăn uống",
      description: "",
      method: "Ví",
      group: "Sinh hoạt",
      amount: "1000000",
      emoji: "🍜",
    },
    clock,
  );
}
describe("Jar emoji metadata", () => {
  it("uses Vietnamese names, respects explicit selection, and handles unknown legacy values", () => {
    expect(jarEmoji("ĂN UỐNG")).toBe("🍜");
    expect(jarEmoji("Di chuyển")).toBe("🚲");
    expect(jarEmoji("Chưa đặt tên", "accumulation")).toBe("🌱");
    expect(jarEmoji("Ăn uống", "monthly", "🎁")).toBe("🎁");
    expect(jarEmoji("Ăn uống", "monthly", "<script>")).toBe("🍜");
  });
  it("changes only metadata, preserving month overrides and inactive status", () => {
    let b = applyAction(
      initial(),
      {
        type: "editMonth",
        jarId: id,
        month: "2027-01",
        target: "1200000",
        funding: "1400000",
        extra: "100000",
        closing: "300000",
      },
      clock,
    );
    b = applyAction(b, { type: "stopJar", jarId: id, month: "2027-01" }, clock);
    const before = materialize(b, clock);
    const after = applyAction(
      b,
      { type: "setJarEmoji", jarId: id, month: "2027-01", emoji: "🎁" },
      clock,
    );
    expect(after.inputs).toEqual(b.inputs);
    expect(
      materialize(after, clock).map(({ emoji: _emoji, ...r }) => r),
    ).toEqual(before.map(({ emoji: _emoji, ...r }) => r));
    expect(
      materialize(after, clock).find((r) => r.month === "2026-12")?.emoji,
    ).toBe("🍜");
    expect(
      materialize(after, clock).find((r) => r.month === "2027-01")?.emoji,
    ).toBe("🎁");
    expect(after.version).toBe(b.version + 1);
    expect(after.audit.at(-1)?.action).toBe("setJarEmoji");
  });
  it("preserves emoji on financial configuration and can reset to automatic", () => {
    const b = applyAction(
      initial(),
      {
        type: "configureJar",
        jarId: id,
        month: "2027-01",
        name: "Nhà ở",
        description: "",
        method: "Ví",
        group: "",
        amount: "2000000",
      },
      clock,
    );
    expect(
      materialize(b, clock).find((r) => r.month === "2027-01")?.emoji,
    ).toBe("🍜");
    const reset = applyAction(
      b,
      { type: "setJarEmoji", jarId: id, month: "2027-01", emoji: null },
      clock,
    );
    expect(
      materialize(reset, clock).find((r) => r.month === "2027-01")?.emoji,
    ).toBeNull();
  });
  it("leaves closed snapshots unchanged and rejects closed-year edits", () => {
    const closed = applyAction(
      initial(),
      { type: "closeYear", year: 2026 },
      clock,
    );
    const after = applyAction(
      closed,
      { type: "setJarEmoji", jarId: id, month: "2027-01", emoji: "🏡" },
      clock,
    );
    expect(after.years.find((y) => y.year === 2026)).toEqual(
      closed.years.find((y) => y.year === 2026),
    );
    expect(() =>
      applyAction(
        closed,
        { type: "setJarEmoji", jarId: id, month: "2026-12", emoji: null },
        clock,
      ),
    ).toThrow(/Năm đã chốt/);
  });
  it("rejects unsupported emoji at the API boundary", () => {
    expect(
      expenseActionSchema.safeParse({
        type: "setJarEmoji",
        jarId: id,
        month: "2027-01",
        emoji: "arbitrary",
      }).success,
    ).toBe(false);
  });
});
describe("Donut data", () => {
  it("keeps distinct keys when a user group matches the synthetic group name", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      key: i === 0 ? "__other__" : String(i),
      label: String(i),
      spent: String(10 - i),
    }));
    const slices = donutSlices(items);
    expect(new Set(slices.map((r) => r.key)).size).toBe(slices.length);
  });
  it("returns empty for zero values and a complete ring for one value", () => {
    expect(donutSlices([{ key: "a", label: "A", spent: "0" }])).toEqual([]);
    expect(
      donutSlices([
        { key: "a", label: "A", spent: "999999999999999999999999" },
      ])[0].percent,
    ).toBe(100);
  });
  it("limits segments to five and preserves exact large totals when grouping", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      key: String(i),
      label: `Hũ ${i}`,
      spent: (999999999999999999999991n + BigInt(i)).toString(),
    }));
    const slices = donutSlices(items);
    expect(slices).toHaveLength(5);
    expect(slices.at(-1)?.label).toBe("Khác");
    expect(slices.reduce((n, r) => n + BigInt(r.value), 0n)).toBe(
      items.reduce((n, r) => n + BigInt(r.spent), 0n),
    );
    expect(slices.every((r) => r.percent >= 0 && r.percent <= 100)).toBe(true);
  });
});
