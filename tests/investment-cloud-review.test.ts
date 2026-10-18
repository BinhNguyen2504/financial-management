import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildReviewData } from "../scripts/lib/review-data.mjs";
import { addSavingsReviewData } from "../scripts/lib/savings-review-data.mjs";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
  completeReviewTables,
} from "../scripts/lib/investment-cloud-review.mjs";
import {
  applyAction,
  emptyBook,
  replay,
  activeTransactions,
} from "../src/domain/investments/engine";
it.each(["2026-01-01", "2026-02-01", "2026-10-18", "2026-12-31", "2027-01-01"])(
  "Notion-related investment review replays all actions and revisions for %s",
  (today) => {
    const base = addSavingsReviewData(
        buildReviewData({ ownerId: randomUUID(), today }),
        { today },
      ),
      data = addInvestmentReviewData(base, { today });
    let book = emptyBook();
    const clock = { today, now: `${today}T00:00:00.000Z` };
    for (const a of data.investments.audit)
      book = applyAction(book, a.action, clock);
    expect(book).toEqual(data.investments);
    expect(data.income).toEqual(base.income);
    expect(data.expenses).toEqual(base.expenses);
    expect(data.savings).toEqual(base.savings);
    const state = replay(book, today);
    expect(state.positions).toHaveLength(8);
    expect(state.missing).toEqual([]);
    expect(state.positions.filter((p) => !p.active)).toHaveLength(2);
    expect(
      state.positions
        .filter((p) => p.kind === "cash")
        .every((p) => p.roi === null),
    ).toBe(true);
    expect(state.effects.some((e) => BigInt(e.realized) < 0n)).toBe(true);
    expect(state.effects.some((e) => BigInt(e.realized) > 0n)).toBe(true);
    expect(book.revisions.filter((r) => r.reason)).toHaveLength(2);
    expect(
      activeTransactions(book).some((r) =>
        r.transaction.note.includes("nhập thử"),
      ),
    ).toBe(false);
    if (today.slice(5, 7) >= "02")
      expect(state.positions.some((p) => p.stale)).toBe(true);
    const sql = buildInvestmentCloudReviewSQL(data, { runtime: true });
    expect(sql.seed).not.toMatch(/disable trigger|delete from/);
    expect(sql.reset).toContain("'NOT_CONFIRMED'");
    expect(completeReviewTables).toHaveLength(28);
  },
);
