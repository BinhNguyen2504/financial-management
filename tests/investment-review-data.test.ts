import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildInvestmentReviewData } from "../scripts/lib/investment-review-data.mjs";
import {
  applyAction,
  emptyBook,
  replay,
} from "../src/domain/investments/engine";
import { actionSchema } from "../src/domain/investments/schema";
it.each(["2026-01-01", "2026-02-01", "2026-10-18", "2026-12-31", "2027-01-01"])(
  "local investment fixture matches real domain replay at %s",
  (today) => {
    const data = buildInvestmentReviewData({ ownerId: randomUUID(), today }),
      clock = { today, now: `${today}T00:00:00.000Z` };
    let book = emptyBook();
    for (const action of data.actions)
      book = applyAction(book, actionSchema.parse(action), clock);
    expect(book).toEqual(data.book);
    const state = replay(book, today);
    expect(state.missing).toEqual([]);
    expect(state.positions.find((p) => p.id === data.ids.stock)).toMatchObject({
      cost: "85010000",
      realized: "4800000",
    });
    expect(state.positions.find((p) => p.id === data.ids.closed)).toMatchObject(
      { active: false, cost: "0", value: "0" },
    );
    expect(state.positions.find((p) => p.id === data.ids.cash)?.cash).toBe(
      "49090000",
    );
  },
);
