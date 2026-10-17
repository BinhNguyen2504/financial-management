import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildReviewData } from "../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
  allReviewTables,
} from "../scripts/lib/savings-review-data.mjs";
import { applyAction, emptyBook, replay } from "../src/domain/savings/engine";
import { buildReport } from "../src/domain/savings/reports";
import { actionSchema } from "../src/domain/savings/schema";
describe("Savings review fixture", () => {
  it.each([
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-10-17",
    "2026-12-31",
    "2027-01-01",
  ])(
    "replays actual domain commands and keeps future actuals out for %s",
    (today) => {
      const base = buildReviewData({ ownerId: randomUUID(), today });
      const data = addSavingsReviewData(base, { today }),
        clock = { today, now: `${today}T00:00:00.000Z` };
      let book = emptyBook();
      for (const a of data.savings.audit)
        book = applyAction(book, actionSchema.parse(a.action), clock);
      expect(book).toEqual(data.savings);
      const state = replay(book, today);
      expect(state.total).not.toBeNull();
      expect(BigInt(state.total!)).toBeGreaterThan(100000000n);
      expect(book.revisions.every((r) => r.transaction!.date <= today)).toBe(
        true,
      );
      expect(book.prices.every((p) => p.date <= today)).toBe(true);
      expect(state.positions.some((p) => p.stale)).toBe(true);
      expect(data.expenses).toEqual(base.expenses);
      expect(data.income).toEqual(base.income);
      const gold = book.categories.find((c) => c.rules[0].name === "Vàng")!;
      expect(
        book.revisions
          .filter(
            (r) =>
              r.transaction?.kind === "openingGold" &&
              r.transaction.categoryId === gold.id,
          )
          .reduce(
            (s, r) => s + BigInt((r.transaction as { amount: string }).amount),
            0n,
          ),
      ).toBe(62200000n);
      const report = buildReport(
        book,
        { from: `${Number(today.slice(0, 4)) - 1}-12-01`, to: today },
        clock,
      );
      expect(report.categories).toHaveLength(6);
      if (Number(today.slice(5, 7)) >= 5)
        expect(
          report.effects.some(
            (e) => e.kind === "sellGold" && e.realized === "3100000",
          ),
        ).toBe(true);
    },
  );
  it("guards all 22 tables and generates a disabled reset", () => {
    const d = addSavingsReviewData(buildReviewData({ ownerId: randomUUID() }));
    const sql = buildSavingsReviewSQL(d);
    expect(allReviewTables).toHaveLength(22);
    for (const t of allReviewTables) {
      expect(sql.backup).toContain(`public.${t}`);
      expect(sql.reset).toContain(
        `delete from public.${t} where owner_id=review_owner`,
      );
    }
    expect(sql.reset).toContain("NOT_CONFIRMED");
    expect(sql.reset).toContain("Matching review markers");
    expect(sql.reset).not.toContain("truncate");
    expect(sql.seed).not.toContain("update public.expense");
  });
});
