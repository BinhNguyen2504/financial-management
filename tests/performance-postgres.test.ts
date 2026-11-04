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
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { postgresIncomeRepository } from "../src/server/income-repository";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import { postgresFundRepository } from "../src/server/fund-repository";
import { postgresGoalRepository } from "../src/server/goal-repository";
import { postgresReportRepository } from "../src/server/report-repository";
import {
  readExpenseView,
  runExpenseCommand,
} from "../src/application/expenses";
import { readIncomeView, runIncomeCommand } from "../src/application/income";
import { readSavingsView, runSavingsCommand } from "../src/application/savings";
import {
  readInvestmentView,
  runInvestmentCommand,
} from "../src/application/investments";
import { readFundView, runFundCommand } from "../src/application/funds";
import { readGoalView, runGoalCommand } from "../src/application/goals";
import { readReport, readReportDetails } from "../src/application/reports";
import { commandSchema as expenseCommand } from "../src/domain/expenses/schema";
import { commandSchema as incomeCommand } from "../src/domain/income/schema";
import { commandSchema as savingsCommand } from "../src/domain/savings/schema";
import { commandSchema as investmentCommand } from "../src/domain/investments/schema";
import { commandSchema as fundCommand } from "../src/domain/funds/schema";
import { commandSchema as goalCommand } from "../src/domain/goals/schema";
import { parseQuery, tabs } from "../src/domain/reports/model";
import { reportDetails } from "../src/domain/reports/build";

const clock = { today: "2026-11-04", now: "2026-11-04T10:00:00.000Z" };
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
let queries: string[] = [],
  bytes = 0;
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 4,
  prepare: false,
  debug: (_connection, query) => queries.push(query),
  transform: {
    row: (row) => {
      bytes += Buffer.byteLength(JSON.stringify(row));
      return row;
    },
  },
});
const expenses = postgresExpenseRepository(sql),
  income = postgresIncomeRepository(sql),
  savings = postgresSavingsRepository(sql),
  investments = postgresInvestmentRepository(sql),
  funds = postgresFundRepository(sql),
  goals = postgresGoalRepository(sql),
  reports = postgresReportRepository(sql);
afterAll(async () => {
  await sql.end();
  await admin.end();
});

async function seed() {
  const owner = randomUUID();
  await admin`insert into auth.users(id) values(${owner})`;
  const data = addInvestmentReviewData(
    addSavingsReviewData(
      buildReviewData({ ownerId: owner, today: clock.today }),
      { today: clock.today },
    ),
    { today: clock.today },
  );
  await admin.unsafe(buildReviewSQL(data).seed);
  await admin.unsafe(buildSavingsReviewSQL(data).seed);
  await admin.unsafe(buildInvestmentCloudReviewSQL(data).seed);
  await admin.unsafe(
    buildFundReviewSQL(buildFundReviewData(data, { clock })).seed,
  );
  const initial = await readGoalView(goals, owner, clock);
  await runGoalCommand(
    goals,
    owner,
    goalCommand.parse({
      id: randomUUID(),
      expectedVersion: 0,
      expectedSources: initial.sources.versions,
      action: {
        type: "saveGoal",
        goal: {
          id: randomUUID(),
          name: "Performance test",
          note: "",
          purpose: "spending",
          mode: "ledger",
          basis: "value",
          target: "100000000",
          deadline: null,
          monthly: "0",
          links: [],
        },
      },
    }),
    clock,
  );
  return owner;
}

it("halves Goals/Funds statements, keeps snapshots and omits unrelated source history", async () => {
  const owner = await seed();
  const cases = [
    ["expenses", () => readExpenseView(expenses, owner, clock), 14],
    ["income", () => readIncomeView(income, owner, 2026, clock), 12],
    ["savings", () => readSavingsView(savings, owner, clock.today, clock), 13],
    [
      "investments",
      () => readInvestmentView(investments, owner, clock.today, clock),
      12,
    ],
    ["funds", () => readFundView(funds, owner, clock), 22],
    ["goals", () => readGoalView(goals, owner, clock), 34],
  ] as const;
  const evidence = [];
  for (const [module, read, baselineStatements] of cases) {
    await read();
    queries = [];
    bytes = 0;
    const started = performance.now();
    const view = await read();
    evidence.push({
      module,
      baselineStatements,
      statements: queries.length,
      dbBytes: bytes,
      responseBytes: Buffer.byteLength(JSON.stringify(view)),
      localMs: performance.now() - started,
    });
    expect(queries.join("\n")).toMatch(/repeatable read read only/);
    expect(queries.join("\n")).not.toMatch(
      /pg_advisory|\binsert\b|\bupdate\b|\bdelete\b/i,
    );
    expect(queries.length).toBeLessThanOrEqual(
      Math.floor(baselineStatements / 2) +
        (module === "income" || module === "savings" || module === "investments"
          ? 1
          : 0),
    );
    if (module === "goals")
      expect(queries.join("\n")).not.toMatch(
        /(?:savings|investments|funds)_(?:audit|closes)/,
      );
    if (module === "funds")
      expect(queries.join("\n")).not.toMatch(
        /expense_(?:spends|audit|month_inputs|years)/,
      );
  }
  await mkdir("artifacts/performance", { recursive: true });
  await writeFile(
    "artifacts/performance/database.json",
    JSON.stringify(
      {
        environment:
          "Isolated local PostgreSQL, synthetic fixtures; excludes HTTP/Auth",
        evidence,
      },
      null,
      2,
    ),
  );
});

it("returns committed views for all six modules and keeps receipts and legacy responses compact", async () => {
  const owner = await seed();
  await admin`insert into public.data_generations(owner_id,generation) values(${owner},7)`;
  const e = await readExpenseView(expenses, owner, clock),
    i = await readIncomeView(income, owner, 2026, clock),
    s = await readSavingsView(savings, owner, clock.today, clock),
    v = await readInvestmentView(investments, owner, clock.today, clock),
    f = await readFundView(funds, owner, clock),
    g = await readGoalView(goals, owner, clock);
  const base = (version: number, action: unknown) => ({
    id: randomUUID(),
    expectedVersion: version,
    action,
  });
  const ec = expenseCommand.parse(
    base(e.book!.version, {
      type: "upsertLabel",
      id: randomUUID(),
      kind: "method",
      name: "Test response",
    }),
  );
  const ic = incomeCommand.parse(
    base(i.book!.version, {
      type: "createCategory",
      id: randomUUID(),
      start: "2026-11",
      name: "Test response",
      description: "",
    }),
  );
  const sc = savingsCommand.parse(
    base(s.book!.version, {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "deposit",
        date: clock.today,
        categoryId: s.book!.categories.find((c) => c.kind === "cash")!.id,
        amount: "1",
      },
    }),
  );
  const vc = investmentCommand.parse(
    base(v.book!.version, {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "deposit",
        date: clock.today,
        categoryId: v.book!.categories.find((c) => c.kind === "cash")!.id,
        amount: "1",
      },
    }),
  );
  const fc = fundCommand.parse(
    base(f.book!.version, {
      type: "saveLocation",
      id: randomUUID(),
      name: "Test response",
      active: true,
    }),
  );
  const gc = goalCommand.parse({
    ...base(g.book?.version ?? 0, {
      type: "saveGoal",
      goal: {
        id: randomUUID(),
        name: "Test response",
        note: "",
        purpose: "spending",
        mode: "ledger",
        basis: "value",
        target: "100",
        deadline: null,
        monthly: "0",
        links: [],
      },
    }),
    expectedSources: g.sources.versions,
  });
  const cases = [
    [
      "expense",
      ec,
      (include: boolean) =>
        runExpenseCommand(expenses, owner, ec, clock, false, { view: include }),
      () => readExpenseView(expenses, owner, clock),
    ],
    [
      "income",
      ic,
      (include: boolean) =>
        runIncomeCommand(income, owner, ic, clock, false, {
          view: include,
          year: 2025,
        }),
      () => readIncomeView(income, owner, 2025, clock),
    ],
    [
      "savings",
      sc,
      (include: boolean) =>
        runSavingsCommand(savings, owner, sc, clock, false, {
          view: include,
          asOf: "2026-10-31",
        }),
      () => readSavingsView(savings, owner, "2026-10-31", clock),
    ],
    [
      "investments",
      vc,
      (include: boolean) =>
        runInvestmentCommand(investments, owner, vc, clock, false, {
          view: include,
          asOf: "2026-10-31",
        }),
      () => readInvestmentView(investments, owner, "2026-10-31", clock),
    ],
    [
      "funds",
      fc,
      (include: boolean) =>
        runFundCommand(funds, owner, fc, clock, false, { view: include }),
      () => readFundView(funds, owner, clock),
    ],
    [
      "goals",
      gc,
      (include: boolean) =>
        runGoalCommand(goals, owner, gc, clock, false, { view: include }),
      () => readGoalView(goals, owner, clock),
    ],
  ] as const;
  for (const [prefix, command, run, read] of cases) {
    const result = await run(true);
    expect(result.view, prefix).toEqual(await read());
    expect(result.view).toHaveProperty("dataGeneration", 7);
    const [receipt] = await admin.unsafe<{ result: unknown }[]>(
      `select result from public.${prefix}_commands where owner_id=$1 and id=$2`,
      [owner, command.id],
    );
    expect(receipt.result).not.toHaveProperty("view");
    expect(await run(false)).toEqual(receipt.result);
    expect(await run(true)).toEqual(result);
  }
});

it("does not wait for module write locks when opening a read-only Goals/Funds view", async () => {
  const owner = await seed();
  let release!: () => void, acquired!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    acquired = resolve;
  });
  const blocker = admin.begin(async (tx) => {
    for (const key of [
      owner,
      `savings:${owner}`,
      `investments:${owner}`,
      `funds:${owner}`,
      `goals:${owner}`,
    ])
      await tx.unsafe("select pg_advisory_xact_lock(hashtextextended($1,0))", [
        key,
      ]);
    acquired();
    await gate;
  });
  await ready;
  try {
    const result = await Promise.race([
      Promise.all([
        readGoalView(goals, owner, clock),
        readFundView(funds, owner, clock),
      ]).then(() => "read"),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("blocked"), 1500).unref();
      }),
    ]);
    expect(result).toBe("read");
  } finally {
    release();
    await blocker;
  }
});

it("keeps canonical report summaries and paged details while reading only the requested ledger", async () => {
  const owner = await seed();
  for (const tab of tabs)
    for (const period of ["month", "quarter", "year"] as const) {
      const query = parseQuery({ tab, period }, clock);
      const canonical = await readReport(reports, owner, query, clock);
      const summary = await readReport(reports, owner, query, clock, {
        details: false,
      });
      expect(summary.report, `${tab}/${period}`).toEqual(canonical.report);
      for (const metric of canonical.report.metrics)
        for (const page of [1, 2]) {
          const actual = await readReportDetails(
            reports,
            owner,
            query,
            clock,
            metric.id,
            canonical.report.versions,
            page,
          );
          expect(actual, `${tab}/${period}/${metric.id}/${page}`).toEqual(
            reportDetails(
              canonical,
              metric.id,
              canonical.report.versions,
              page,
            ),
          );
        }
    }
  const query = parseQuery({}, clock),
    full = await readReport(reports, owner, query, clock);
  queries = [];
  await readReportDetails(
    reports,
    owner,
    query,
    clock,
    "income.total",
    full.report.versions,
    1,
  );
  expect(queries.join("\n")).not.toMatch(
    /from public\.(?:savings|investments|funds|goals)_(?:transactions|prices|valuations|configurations|definitions)/,
  );
  await admin`update public.investments_books set version=version+1 where owner_id=${owner}`;
  await expect(
    readReportDetails(
      reports,
      owner,
      query,
      clock,
      "income.total",
      full.report.versions,
      1,
    ),
  ).rejects.toMatchObject({ code: "REPORT_CHANGED" });
}, 30000);

it("detects schema and reset changes outside the selected detail source", async () => {
  const owner = await seed(),
    query = parseQuery({}, clock);
  const full = await readReport(reports, owner, query, clock);
  await admin`alter table public.savings_prices rename to performance_savings_prices`;
  try {
    await expect(
      readReportDetails(
        reports,
        owner,
        query,
        clock,
        "income.total",
        full.report.versions,
        1,
      ),
    ).rejects.toMatchObject({ code: "REPORT_CHANGED" });
    const degraded = await readReport(reports, owner, query, clock);
    expect(
      await readReportDetails(
        reports,
        owner,
        query,
        clock,
        "income.total",
        degraded.report.versions,
        1,
      ),
    ).toEqual(
      reportDetails(degraded, "income.total", degraded.report.versions, 1),
    );
  } finally {
    await admin`alter table public.performance_savings_prices rename to savings_prices`;
  }
  await admin`insert into public.data_generations(owner_id,generation) values(${owner},1)`;
  await expect(
    readReportDetails(
      reports,
      owner,
      query,
      clock,
      "income.total",
      full.report.versions,
      1,
    ),
  ).rejects.toMatchObject({ code: "REPORT_CHANGED" });
});

it("keeps a book and its generation in one snapshot during a concurrent generation change", async () => {
  const owner = await seed();
  await admin`insert into public.data_generations(owner_id,generation) values(${owner},3)`;
  const initial = await readExpenseView(expenses, owner, clock);
  const snapshot = await expenses.transaction(
    owner,
    async (tx) => {
      const first = await tx.read();
      await admin.begin(async (write) => {
        await write`update public.expense_books set version=version+1 where owner_id=${owner}`;
        await write`update public.data_generations set generation=4 where owner_id=${owner}`;
      });
      const second = await tx.read();
      expect(second).toEqual(first);
      return { book: second };
    },
    true,
  );
  expect(snapshot).toHaveProperty("dataGeneration", 3);
  expect(snapshot.book?.version).toBe(initial.book!.version);
  const current = await readExpenseView(expenses, owner, clock);
  expect(current).toHaveProperty("dataGeneration", 4);
  expect(current.book?.version).toBe(initial.book!.version + 1);
});

it("returns the current view on a late retry while preserving the original command result", async () => {
  const owner = await seed(),
    before = await readGoalView(goals, owner, clock);
  const command = goalCommand.parse({
    id: randomUUID(),
    expectedVersion: before.book!.version,
    expectedSources: before.sources.versions,
    action: {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        goalId: before.book!.goals[0].id,
        toGoalId: null,
        kind: "deposit",
        amount: "1",
        occurredAt: clock.now,
        note: "Retry test",
      },
    },
  });
  queries = [];
  await runGoalCommand(goals, owner, command, clock, true);
  const previewStatements = queries.length;
  queries = [];
  const first = await runGoalCommand(goals, owner, command, clock, false, {
    view: true,
  });
  const saveStatements = queries.length;
  expect(previewStatements + saveStatements).toBeLessThan(54);
  await runGoalCommand(
    goals,
    owner,
    {
      ...command,
      id: randomUUID(),
      expectedVersion: first.version,
      action: {
        ...command.action,
        ...(command.action.type === "postTransaction"
          ? { transaction: { ...command.action.transaction, id: randomUUID() } }
          : {}),
      },
    },
    clock,
  );
  const retry = await runGoalCommand(goals, owner, command, clock, false, {
    view: true,
  });
  expect(retry.version).toBe(first.version);
  expect(retry.view?.book?.version).toBe(first.version + 1);
  expect(retry.view?.book?.revisions).toHaveLength(2);
  await mkdir("artifacts/performance", { recursive: true });
  await writeFile(
    "artifacts/performance/goal-save.json",
    JSON.stringify(
      {
        baselineStatements: 108,
        previewStatements,
        saveStatements,
        combinedStatements: previewStatements + saveStatements,
        httpRequests: 2,
        environment: "Isolated local PostgreSQL; no HTTP/Auth latency",
      },
      null,
      2,
    ),
  );
});
