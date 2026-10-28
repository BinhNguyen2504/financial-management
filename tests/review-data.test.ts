import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildReviewData,
  buildReviewSQL,
  vietnamToday,
} from "../scripts/lib/review-data.mjs";
import { materialize } from "../src/domain/expenses/engine";
import { applyAction, toView } from "../src/domain/income/engine";

describe("Notion-inspired UI review dataset", () => {
  it.each(["2026-01-01", "2026-10-16", "2026-12-31", "2027-01-01"])(
    "materializes valid balances and avoids future actuals for %s",
    (today) => {
      const data = buildReviewData({ ownerId: randomUUID(), today });
      const clock = { today, now: `${today}T00:00:00Z` };
      const rows = materialize(data.expenses, clock);
      expect(rows).toHaveLength(18 * 12);
      expect(rows.every((r) => BigInt(r.closing) >= 0n)).toBe(true);
      expect(
        rows.some((r) => r.month === today.slice(0, 7) && BigInt(r.over) > 0n),
      ).toBe(true);
      expect(data.expenses.spends.every((s) => s.date <= today)).toBe(true);
      expect(
        data.income.monthly.every((r) => r.month <= today.slice(0, 7)),
      ).toBe(true);
      expect(
        toView(data.income, Number(today.slice(0, 4)), clock).rows.length,
      ).toBeGreaterThan(0);
      expect(
        data.expenses.jars.every((j) => j.rules[0].description.includes("MẪU")),
      ).toBe(true);
    },
  );
  it("retains receipt history when a seeded monthly receipt is cleared", () => {
    const data = buildReviewData({
      ownerId: randomUUID(),
      today: "2026-01-01",
    });
    const clock = { today: data.today, now: `${data.today}T00:00:00Z` };
    const categoryId = data.income.categories[0].id;
    const cleared = applyAction(
      data.income,
      { type: "clearMonthly", categoryId, month: "2026-01" },
      clock,
    );
    const deleted = applyAction(
      cleared,
      { type: "deleteCategory", categoryId },
      clock,
    );
    expect(deleted.categories.find((c) => c.id === categoryId)?.deleted).toBe(
      true,
    );
    expect(deleted.audit.slice(0, -1)).toEqual(cleared.audit);
  });
  it("uses Vietnam dates and rejects invalid dates or injected identifiers", () => {
    expect(vietnamToday(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01-01");
    expect(() =>
      buildReviewData({ ownerId: "'; drop schema public; --" }),
    ).toThrow(/UUID/);
    expect(() =>
      buildReviewData({ ownerId: randomUUID(), today: "2026-02-30" }),
    ).toThrow(/Ngày/);
    const data = buildReviewData({ ownerId: randomUUID() });
    data.ownerId = "invalid";
    expect(() => buildReviewSQL(data)).toThrow(/UUID/);
  });
});
