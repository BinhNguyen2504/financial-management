import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildReviewData } from "../scripts/lib/review-data.mjs";
import { addSavingsReviewData } from "../scripts/lib/savings-review-data.mjs";
import { addInvestmentReviewData } from "../scripts/lib/investment-cloud-review.mjs";
import {
  buildFundReviewData,
  buildFundReviewSQL,
  fullReviewTables,
} from "../scripts/lib/fund-review-data";
import { validateFundBook } from "../src/domain/funds/validate";
import { vietnamClock } from "../src/domain/expenses/engine";
const clock = vietnamClock();
const fixture = () =>
  addInvestmentReviewData(
    addSavingsReviewData(
      buildReviewData({ ownerId: randomUUID(), today: clock.today }),
      { today: clock.today },
    ),
    { today: clock.today },
  );
it("builds a valid diverse Fund garden without changing existing modules", () => {
  const base = fixture(),
    before = JSON.stringify(base),
    data = buildFundReviewData(base, { clock });
  validateFundBook(data.funds);
  expect(JSON.stringify(base)).toBe(before);
  expect(data.funds.configurations[0].living.total).toBe("6000000");
  expect(
    data.expected.funds.map((f) => [f.balance, f.target, f.percent]),
  ).toEqual([
    ["27000000", "54000000", "50.00"],
    ["44100000", "42000000", "105.00"],
    ["13500000", "54000000", "25.00"],
  ]);
  expect(data.expected.emergencyMonths).toBe("4.50");
  expect(data.funds.revisions).toHaveLength(39);
  expect(data.funds.configurations).toHaveLength(2);
  expect(data.funds.locations.filter((l) => !l.active)).toHaveLength(1);
  expect(
    data.funds.revisions.filter(
      (r) =>
        r.transaction &&
        new Date(r.transaction.occurredAt) > new Date(clock.now),
    ),
  ).toHaveLength(0);
  expect(new Set(data.funds.revisions.map((r) => r.transaction?.kind))).toEqual(
    new Set(["opening", "deposit", "withdraw", "transfer", undefined]),
  );
});
it("uses live monthly rules and version instead of monthly overrides or screenshot amounts", () => {
  const base = fixture();
  base.expenses.version = 19;
  const jar = base.expenses.jars.find((j) =>
    j.rules.some((r) => r.name === "Ăn uống & cà phê"),
  )!;
  jar.rules = [{ ...jar.rules[0], amount: "2100000" }];
  base.expenses.inputs.push({
    jarId: jar.id,
    month: clock.today.slice(0, 7),
    target: "999999999",
    funding: "99999999",
    extra: "0",
    closing: null,
  });
  const data = buildFundReviewData(base, { clock });
  expect(data.funds.configurations[0].living.total).toBe("6100000");
  expect(data.source.expenseVersion).toBe(19);
  expect(data.expected.funds[0].target).toBe("54900000");
});
it("builds an owner-guarded five-module reset and read-only inspection; no automatic reset", () => {
  const data = buildFundReviewData(fixture(), { clock }),
    sql = buildFundReviewSQL(data, {
      runtime: true,
      migrationSQL: "select 1;",
    });
  expect(fullReviewTables).toHaveLength(35);
  expect(sql.seed).not.toMatch(/delete from|disable trigger|truncate /i);
  expect(sql.seed).toContain("Expected expense_api");
  expect(sql.seed).toContain("preserving review edits");
  expect(sql.reset).toContain("confirmation constant text := 'NOT_CONFIRMED'");
  expect(sql.reset).toContain("Matching markers in all five modules");
  expect(sql.reset).toContain("data_imports_immutable");
  expect(sql.reset).not.toMatch(
    /delete from auth|disable row level|truncate /i,
  );
  for (const t of fullReviewTables)
    expect(sql.reset).toContain(
      `delete from public.${t} where owner_id=review_owner;`,
    );
});
