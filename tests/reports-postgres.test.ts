import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  buildReviewData,
  buildReviewSQL,
} from "../scripts/lib/review-data.mjs";
import {
  addSavingsReviewData,
  buildSavingsReviewSQL,
} from "../scripts/lib/savings-review-data.mjs";
import {
  addInvestmentReviewData,
  buildInvestmentCloudReviewSQL,
} from "../scripts/lib/investment-cloud-review.mjs";
import {
  buildFundReviewData,
  buildFundReviewSQL,
} from "../scripts/lib/fund-review-data";
import { postgresReportRepository } from "../src/server/report-repository";
import { readReport } from "../src/application/reports";
import { buildReport, reportDetails } from "../src/domain/reports/build";
import {
  parseQuery,
  sourceIds,
  tabs,
  type Books,
} from "../src/domain/reports/model";

const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
let queries: string[] = [];
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 2,
  prepare: false,
  debug: (_connection, query) => queries.push(query),
});
const repository = postgresReportRepository(sql);
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const clock = { today, now: `${today}T10:00:00.000Z` };
afterAll(async () => {
  await sql.end();
  await admin.end();
});
async function seed() {
  const owner = randomUUID();
  await admin`insert into auth.users(id) values(${owner})`;
  const data = addInvestmentReviewData(
    addSavingsReviewData(buildReviewData({ ownerId: owner, today }), { today }),
    { today },
  );
  await admin.unsafe(buildReviewSQL(data).seed);
  await admin.unsafe(buildSavingsReviewSQL(data).seed);
  await admin.unsafe(buildInvestmentCloudReviewSQL(data).seed);
  const fundData = buildFundReviewData(data, { clock });
  await admin.unsafe(buildFundReviewSQL(fundData).seed);
  return {
    owner,
    books: {
      income: data.income,
      expenses: data.expenses,
      savings: data.savings,
      investments: data.investments,
      funds: fundData.funds,
      goals: null,
    } as Books,
  };
}
it("reads through runtime RLS and matches canonical reports for every tab without loading audit or acquiring write locks", async () => {
  const { owner, books } = await seed();
  queries = [];
  for (const tab of tabs) {
    const query = parseQuery({ tab, period: "year" }, clock);
    const actual = await readReport(repository, owner, query, clock);
    const expected = buildReport(
      { books, errors: [], generation: 0 },
      query,
      clock,
    );
    expect(actual.report, tab).toEqual(expected.report);
    expect(actual.details, tab).toEqual(expected.details);
    expect(
      Object.values(actual.report.sources).every((s) => s.status === "ready"),
      tab,
    ).toBe(true);
  }
  const statements = queries
    .filter(
      (q) =>
        !/set_config|set local role|begin|savepoint|release|commit/i.test(q),
    )
    .join("\n");
  expect(statements).not.toMatch(
    /public\.\w+_(audit|commands)|pg_advisory|\binsert\b|\bupdate\b|\bdelete\b/i,
  );
  expect(queries.join("\n")).toMatch(/repeatable read read only/i);
});
it("keeps another owner's report empty and does not initialize books on GET", async () => {
  const { owner } = await seed(),
    other = randomUUID();
  await admin`insert into auth.users(id) values(${other})`;
  const before =
    await admin`select count(*)::int as count from public.income_books`;
  const data = await repository.read(other, [...sourceIds]);
  expect(Object.values(data.books).every((b) => b === null)).toBe(true);
  expect(data.errors).toEqual([]);
  expect(
    await admin`select count(*)::int as count from public.income_books`,
  ).toEqual(before);
  const populated = await repository.read(owner, ["income"]);
  expect(populated.books.income).not.toBeNull();
  expect(Object.keys(populated.books)).toEqual(["income"]);
});
it("isolates a missing module schema with a savepoint and preserves other modules", async () => {
  const { owner } = await seed();
  await admin`alter table public.savings_prices rename to report_test_savings_prices`;
  try {
    const result = await readReport(
      repository,
      owner,
      parseQuery({}, clock),
      clock,
    );
    expect(result.report.sources.savings?.status).toBe("error");
    expect(result.report.sources.income?.status).toBe("ready");
    expect(result.report.sources.investments?.status).toBe("ready");
    expect(result.report.metrics.some((m) => m.id === "savings.value")).toBe(
      false,
    );
    expect(result.report.metrics.some((m) => m.id === "income.total")).toBe(
      true,
    );
  } finally {
    await admin`alter table public.report_test_savings_prices rename to savings_prices`;
  }
});
it("rejects details after a normal source edit or a reset generation change", async () => {
  const { owner } = await seed(),
    query = parseQuery({ tab: "cashflow" }, clock);
  const initial = await readReport(repository, owner, query, clock);
  await admin`update public.income_books set version=version+1 where owner_id=${owner}`;
  const changed = await readReport(repository, owner, query, clock);
  expect(() =>
    reportDetails(changed, "income.total", initial.report.versions, 1),
  ).toThrow(/đã thay đổi/);
  await admin`insert into public.data_generations(owner_id,generation) values(${owner},1) on conflict(owner_id) do update set generation=excluded.generation`;
  const reset = await readReport(repository, owner, query, clock);
  expect(() =>
    reportDetails(reset, "income.total", changed.report.versions, 1),
  ).toThrow(/đã thay đổi/);
});
