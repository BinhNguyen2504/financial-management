import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildGoalReviewData } from "../scripts/lib/goal-review-data";
import {
  activeTransactions,
  validateGoalBook,
} from "../src/domain/goals/engine";
import type { GoalSources } from "../src/domain/goals/schema";

const sources: GoalSources = {
  versions: { savings: 1, investments: 2, funds: 3 },
  items: [
    {
      kind: "savings",
      sourceId: randomUUID(),
      name: "Ví",
      active: true,
      capital: "20000000",
      value: "20000000",
      valueDate: null,
      stale: false,
    },
    {
      kind: "investments",
      sourceId: randomUUID(),
      name: "Cổ phiếu",
      active: true,
      capital: "140000000",
      value: null,
      valueDate: null,
      stale: true,
    },
    {
      kind: "funds",
      sourceId: "emergency",
      name: "Emergency",
      active: true,
      capital: "85000000",
      value: "85000000",
      valueDate: null,
      stale: false,
    },
  ],
};
const clock = { today: "2026-11-05", now: "2026-11-05T10:00:00.000Z" };
describe("Goal review dataset", () => {
  it("replays diverse states without changing source balances or hiding missing values", () => {
    const before = structuredClone(sources),
      data = buildGoalReviewData({ ownerId: randomUUID(), sources, clock }),
      result = data.expected,
      state = (key: string) =>
        result.states.find((s) => s.id === data.ids[key])!;
    expect(result.book!.goals).toHaveLength(13);
    expect(sources).toEqual(before);
    expect(() => validateGoalBook(result.book!)).not.toThrow();
    expect(state("safety").percent).toBe("100.00");
    expect(state("investment")).toMatchObject({ current: null, stale: true });
    expect(state("investment-capital").percent).toBe("28.00");
    expect(state("car")).toMatchObject({
      current: "40000000",
      percent: "40.00",
    });
    expect(
      activeTransactions(result.book!).filter(
        ({ transaction: t }) =>
          t.goalId === data.ids.car || t.toGoalId === data.ids.car,
      ).length,
    ).toBeGreaterThan(20);
    expect(state("tuition").ready).toBe(true);
    expect(state("holiday").percent).toBe("112.50");
    expect(state("laptop")).toMatchObject({
      overdue: true,
      requiredMonthly: null,
    });
    expect(state("study").estimatedMonth).toBeNull();
    expect(state("health")).toMatchObject({
      current: "5000000",
      balance: "2000000",
    });
    expect(state("phone").balance).toBe("0");
    expect(state("studio")).toMatchObject({
      current: "0",
      estimatedMonth: null,
      requiredMonthly: null,
    });
    expect(
      result
        .book!.goals.filter((g) => g.purpose === "spending")
        .flatMap((g) => g.links)
        .reduce((sum, l) => sum + l.share, 0),
    ).toBe(10000);
    expect(
      result.book!.audit.some(
        (a) =>
          a.action.type === "reviseTransaction" &&
          a.action.replacement === null,
      ),
    ).toBe(true);
  });
  it("supports an empty account without fabricating source balances or links", () => {
    const data = buildGoalReviewData({
      ownerId: randomUUID(),
      clock,
      sources: {
        versions: { savings: 0, investments: 0, funds: 0 },
        items: [],
      },
    });
    expect(data.expected.book!.goals).toHaveLength(8);
    expect(data.expected.book!.goals.every((g) => g.mode === "ledger")).toBe(
      true,
    );
    expect(() => validateGoalBook(data.expected.book!)).not.toThrow();
  });
});
