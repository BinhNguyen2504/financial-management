import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
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
import { postgresOverviewDataRepository } from "../src/server/overview-data-repository";
import { postgresOverviewRepository } from "../src/server/overview-repository";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { postgresIncomeRepository } from "../src/server/income-repository";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import { postgresFundRepository } from "../src/server/fund-repository";
import { readExpenseView } from "../src/application/expenses";
import { readIncomeView } from "../src/application/income";
import { readSavingsView } from "../src/application/savings";
import { readInvestmentView } from "../src/application/investments";
import { readFundView } from "../src/application/funds";
import { readOverview } from "../src/application/overview";
import {
  defaultLayout,
  widgetIds,
  type WidgetId,
} from "../src/domain/overview/layout";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
} from "../src/domain/overview/summary";
import * as before from "./helpers/overview-baseline";

const clock = { today: "2026-10-29", now: "2026-10-29T00:00:00.000Z" };
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
let queries: string[] = [],
  rowCount = 0,
  rowBytes = 0;
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 4,
  prepare: false,
  debug: (_connection, query) => {
    queries.push(query);
  },
  transform: {
    row: (row) => {
      rowCount++;
      rowBytes += Buffer.byteLength(JSON.stringify(row));
      return row;
    },
  },
});
const repo = postgresOverviewDataRepository(sql);
afterAll(async () => {
  await sql.end();
  await admin.end();
});
async function seed() {
  const owner = randomUUID();
  await admin`insert into auth.users(id) values(${owner})`;
  const base = addInvestmentReviewData(
    addSavingsReviewData(
      buildReviewData({ ownerId: owner, today: clock.today }),
      { today: clock.today },
    ),
    { today: clock.today },
  );
  await admin.unsafe(buildReviewSQL(base).seed);
  await admin.unsafe(buildSavingsReviewSQL(base).seed);
  await admin.unsafe(buildInvestmentCloudReviewSQL(base).seed);
  await admin.unsafe(
    buildFundReviewSQL(buildFundReviewData(base, { clock })).seed,
  );
  return owner;
}
async function views(owner: string) {
  const [expenses, income, savings, investments, funds] = await Promise.all([
    readExpenseView(postgresExpenseRepository(sql), owner, clock),
    readIncomeView(postgresIncomeRepository(sql), owner, 2026, clock),
    readSavingsView(postgresSavingsRepository(sql), owner, clock.today, clock),
    readInvestmentView(
      postgresInvestmentRepository(sql),
      owner,
      clock.today,
      clock,
    ),
    readFundView(postgresFundRepository(sql), owner, clock),
  ]);
  return { expenses, income, savings, investments, funds };
}
it("matches full module readers across historical balances, corrections, cancellations and optional lists", async () => {
  const owner = await seed(),
    full = await views(owner);
  const result = await readOverview(
    [...widgetIds],
    repo.loaders(owner, clock, widgetIds),
    clock,
  );
  expect(result.sources).toEqual({
    expenses: { status: "ready", data: expenseSummary(full.expenses) },
    income: { status: "ready", data: incomeSummary(full.income) },
    savings: { status: "ready", data: savingsSummary(full.savings) },
    investments: { status: "ready", data: investmentSummary(full.investments) },
    funds: { status: "ready", data: fundSummary(full.funds) },
  });
  const other = randomUUID();
  await admin`insert into auth.users(id) values(${other})`;
  const empty = await readOverview(
    [...widgetIds],
    repo.loaders(other, clock, widgetIds),
    clock,
  );
  for (const source of Object.values(empty.sources))
    expect(source).toMatchObject({ status: "ready", data: { empty: true } });
  expect(JSON.stringify(result)).not.toMatch(/"audit"|"book"|"revisions"/);
});
it("shares Spending with Funds and reads only jar configuration when Spending is hidden", async () => {
  const owner = await seed();
  queries = [];
  const both: WidgetId[] = ["expenses", "funds", "attention"];
  const result = await readOverview(
    both,
    repo.loaders(owner, clock, both),
    clock,
  );
  expect(result.sources.expenses?.status).toBe("ready");
  expect(result.sources.funds?.status).toBe("ready");
  expect(
    queries.filter((q) => q.includes("from public.expense_books")),
  ).toHaveLength(1);
  expect(queries.join("\n")).not.toMatch(
    /public\.\w+_audit|pg_advisory|public\.expense_labels/,
  );
  queries = [];
  const only: WidgetId[] = ["funds", "attention"];
  const funds = await readOverview(
    only,
    repo.loaders(owner, clock, only),
    clock,
  );
  expect(Object.keys(funds.sources)).toEqual(["funds"]);
  expect(funds.sources.funds).toEqual(result.sources.funds);
  expect(queries.join("\n")).not.toMatch(
    /expense_month_inputs|expense_spends|expense_years|income_|savings_|investments_/,
  );
  queries = [];
  expect(
    (
      await readOverview(
        ["attention", "peace"],
        repo.loaders(owner, clock, ["attention", "peace"]),
        clock,
      )
    ).sources,
  ).toEqual({});
  expect(queries).toEqual([]);
});
it("omits optional details by default and measures fewer queries, returned bytes and smaller DTOs", async () => {
  const owner = await seed(),
    layouts = postgresOverviewRepository(sql);
  const oldRead = async () => {
    const layout = await layouts.read(owner);
    const full = await views(owner);
    return {
      today: clock.today,
      fetchedAt: clock.now,
      layout,
      sources: {
        expenses: {
          status: "ready",
          data: before.expenseSummary(full.expenses),
        },
        income: { status: "ready", data: before.incomeSummary(full.income) },
        savings: { status: "ready", data: before.savingsSummary(full.savings) },
        investments: {
          status: "ready",
          data: before.investmentSummary(full.investments),
        },
        funds: { status: "ready", data: before.fundSummary(full.funds) },
      },
    };
  };
  const newRead = async () => {
    const layout = await layouts.read(owner);
    return {
      ...(await readOverview(
        layout.widgets,
        repo.loaders(owner, clock, layout.widgets),
        clock,
      )),
      layout,
    };
  };
  const measure = async (read: () => Promise<unknown>) => {
    queries = [];
    rowCount = 0;
    rowBytes = 0;
    const started = performance.now();
    const value = await read();
    return {
      milliseconds: performance.now() - started,
      queries: queries.length,
      returnedRows: rowCount,
      returnedBytes: rowBytes,
      responseBytes: Buffer.byteLength(JSON.stringify(value)),
    };
  };
  // Warm both paths, then alternate to reduce connection/cache ordering bias.
  await oldRead();
  await newRead();
  type Sample = Awaited<ReturnType<typeof measure>>;
  const baseline: Sample[] = [],
    optimized: Sample[] = [];
  for (let i = 0; i < 12; i++) {
    baseline.push(await measure(oldRead));
    optimized.push(await measure(newRead));
  }
  const report = (samples: Sample[]) => {
    const times = samples.map((s) => s.milliseconds).sort((a, b) => a - b);
    return {
      ...samples[0],
      milliseconds: undefined,
      medianMs: times[Math.floor(times.length / 2)],
      p95Ms: times[Math.ceil(times.length * 0.95) - 1],
    };
  };
  const evidence = {
    environment:
      "Isolated local PostgreSQL; service reads only, excludes HTTP/Auth; synthetic five-module data; 12 warm samples per path",
    baseline: report(baseline),
    optimized: report(optimized),
  };
  expect(evidence.optimized.queries).toBeLessThan(evidence.baseline.queries);
  expect(evidence.optimized.returnedBytes).toBeLessThan(
    evidence.baseline.returnedBytes,
  );
  expect(evidence.optimized.responseBytes).toBeLessThan(
    evidence.baseline.responseBytes,
  );
  const result = await newRead();
  expect(result.layout.widgets).toEqual(defaultLayout().widgets);
  expect(result.sources.expenses).not.toHaveProperty("data.jars");
  expect(result.sources.expenses).not.toHaveProperty("data.groups");
  expect(result.sources.savings).not.toHaveProperty("data.due");
  await mkdir("artifacts/overview-performance", { recursive: true });
  await writeFile(
    "artifacts/overview-performance/database.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("Overview performance:", JSON.stringify(evidence));
});
