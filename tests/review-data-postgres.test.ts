import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  buildReviewData,
  buildReviewSQL,
  reviewTables,
} from "../scripts/lib/review-data.mjs";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { postgresIncomeRepository } from "../src/server/income-repository";
import {
  readExpenseView,
  runExpenseCommand,
} from "../src/application/expenses";
import { readIncomeView, runIncomeCommand } from "../src/application/income";

const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
  max: 1,
  onnotice: () => {},
});
const runtime = postgres(process.env.TEST_DATABASE_URL!, {
  max: 1,
  prepare: false,
});
const clock = { today: "2026-10-16", now: "2026-10-16T09:00:00Z" };
const expenses = postgresExpenseRepository(runtime),
  income = postgresIncomeRepository(runtime);
afterAll(async () => {
  await admin.end();
  await runtime.end();
});

// SQL files contain their own transactions. Explicit rollback recovers the same
// test connection after intentionally rejected scripts.
async function execute(script: string) {
  try {
    return await admin.unsafe(script);
  } catch (error) {
    await admin.unsafe("rollback");
    throw error;
  }
}
async function fixture(seed = true) {
  const data = buildReviewData({ ownerId: randomUUID(), today: clock.today });
  await admin`insert into auth.users(id) values(${data.ownerId})`;
  const sql = buildReviewSQL(data);
  if (seed) await execute(sql.seed);
  return { data, sql };
}
function confirmed(script: string, ownerId: string) {
  return script.replace("'NOT_CONFIRMED'", `'RESET REVIEW ${ownerId}'`);
}
async function triggersEnabled() {
  const rows =
    await admin`select tgenabled from pg_trigger where not tgisinternal
    and tgname in ('expense_year_sealed','expense_audit_immutable','expense_commands_immutable','income_audit_immutable','income_commands_immutable')`;
  expect(rows).toHaveLength(5);
  expect(rows.every((r) => r.tgenabled === "O")).toBe(true);
}

describe("UI review import/backup/reset on isolated PostgreSQL", () => {
  it("imports data visible through normal RLS repositories and supports app edits", async () => {
    const { data, sql } = await fixture();
    const view = await readExpenseView(expenses, data.ownerId, clock);
    expect(view.book?.jars).toHaveLength(18);
    expect(
      view.rows.some((r) => r.month === "2026-10" && BigInt(r.over) > 0n),
    ).toBe(true);
    expect(
      (await readIncomeView(income, data.ownerId, 2026, clock)).book?.monthly,
    ).toHaveLength(20);
    await runExpenseCommand(
      expenses,
      data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 1,
        action: {
          type: "setJarEmoji",
          jarId: data.expenses.jars[0].id,
          month: "2026-10",
          emoji: "🌱",
        },
      },
      clock,
    );
    await execute(sql.seed);
    expect(
      (await readExpenseView(expenses, data.ownerId, clock)).book?.version,
    ).toBe(2);
    await expect(
      execute(
        buildReviewSQL(
          buildReviewData({ ownerId: data.ownerId, today: clock.today }),
        ).seed,
      ),
    ).rejects.toThrow(/already has financial data/);
  });
  it("rejects unknown owners and nonempty accounts without partial writes", async () => {
    const data = buildReviewData({ ownerId: randomUUID(), today: clock.today });
    await expect(execute(buildReviewSQL(data).seed)).rejects.toThrow(
      /does not exist/,
    );
    const f = await fixture(false);
    await runExpenseCommand(
      expenses,
      f.data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: { type: "initialize", start: "2026-10" },
      },
      clock,
    );
    await runExpenseCommand(
      expenses,
      f.data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 1,
        action: {
          type: "createJar",
          id: randomUUID(),
          kind: "monthly",
          start: "2026-10",
          opening: "0",
          name: "Existing",
          description: "",
          method: "Cash",
          group: "",
          amount: "1",
        },
      },
      clock,
    );
    await expect(execute(f.sql.seed)).rejects.toThrow(
      /already has financial data/,
    );
    expect(
      (await readIncomeView(income, f.data.ownerId, 2026, clock)).book,
    ).toBeNull();
    expect(
      (await readExpenseView(expenses, f.data.ownerId, clock)).book?.version,
    ).toBe(2);
  });
  it("imports through the runtime role into a pristine initialized book without deleting history", async () => {
    const { data, sql } = await fixture(false);
    const initializeId = randomUUID();
    await runExpenseCommand(
      expenses,
      data.ownerId,
      {
        id: initializeId,
        expectedVersion: 0,
        action: { type: "initialize", start: "2026-10" },
      },
      clock,
    );
    const seed = buildReviewSQL(data, { runtime: true }).seed;
    await runtime.unsafe(seed);
    const view = await readExpenseView(expenses, data.ownerId, clock);
    expect(view.book?.start).toBe("2026-01");
    expect(view.book?.audit.map((a) => a.action)).toEqual([
      "initialize",
      "seedReviewData",
    ]);
    expect(view.book?.version).toBe(2);
    expect(
      await admin`select id from public.expense_commands where owner_id=${data.ownerId} and id=${initializeId}`,
    ).toHaveLength(1);
    await runtime.unsafe(seed);
    expect(
      (await readExpenseView(expenses, data.ownerId, clock)).book?.version,
    ).toBe(2);
    await execute(confirmed(sql.reset, data.ownerId));
    expect(
      (await readExpenseView(expenses, data.ownerId, clock)).book,
    ).toBeNull();
  });
  it("exports a consistent owner-only snapshot and repeatable inspection results", async () => {
    const { data, sql } = await fixture();
    await execute(sql.backup);
    await execute(sql.backup);
    const [{ backup }] =
      await admin`select backup from pg_temp.fm_review_backup`;
    expect(backup.ownerId).toBe(data.ownerId);
    expect(Object.keys(backup.tables)).toHaveLength(14);
    expect(backup.tables.expense_jars).toHaveLength(18);
    for (const rows of Object.values(backup.tables) as { owner_id: string }[][])
      expect(rows.every((r) => r.owner_id === data.ownerId)).toBe(true);
    await execute(sql.inspect);
    await execute(sql.inspect);
    const [inspection] = await admin`select * from pg_temp.fm_review_inspect`;
    expect(inspection.user_exists).toBe(true);
    expect(inspection.matching_review_dataset).toBe(true);
    expect(inspection.counts.income_monthly).toBe(20);
  });
  it("requires reset confirmation and matching markers on both modules", async () => {
    const { data, sql } = await fixture();
    await expect(execute(sql.reset)).rejects.toThrow(/not confirmed/);
    const otherDataset = buildReviewSQL(
      buildReviewData({ ownerId: data.ownerId, today: clock.today }),
    );
    await expect(
      execute(confirmed(otherDataset.reset, data.ownerId)),
    ).rejects.toThrow(/markers missing/);
    const ordinary = await fixture(false);
    await runIncomeCommand(
      income,
      ordinary.data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: {
          type: "createCategory",
          id: randomUUID(),
          start: "2026-01",
          name: "Real salary",
          description: "",
        },
      },
      clock,
    );
    await expect(
      execute(confirmed(ordinary.sql.reset, ordinary.data.ownerId)),
    ).rejects.toThrow(/markers missing/);
    expect(
      (await readExpenseView(expenses, data.ownerId, clock)).book?.jars,
    ).toHaveLength(18);
    await triggersEnabled();
  });
  it("resets review changes and sealed years while preserving identity, other owners and RLS", async () => {
    const a = await fixture(),
      b = await fixture();
    const nextYear = { today: "2027-01-02", now: "2027-01-02T01:00:00Z" };
    await runExpenseCommand(
      expenses,
      a.data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 1,
        action: { type: "closeYear", year: 2026 },
      },
      nextYear,
    );
    await runIncomeCommand(
      income,
      a.data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: a.data.income.version,
        action: {
          type: "upsertOneOff",
          id: randomUUID(),
          month: "2026-10",
          name: "Review edit",
          description: "",
          amount: "42",
        },
      },
      clock,
    );
    await execute(confirmed(a.sql.reset, a.data.ownerId));
    for (const table of reviewTables) {
      const [{ count }] = await admin.unsafe(
        `select count(*)::int as count from public.${table} where owner_id=$1`,
        [a.data.ownerId],
      );
      expect(count).toBe(0);
    }
    expect(
      await admin`select id from auth.users where id=${a.data.ownerId}`,
    ).toHaveLength(1);
    expect(
      (await readExpenseView(expenses, b.data.ownerId, clock)).book?.jars,
    ).toHaveLength(18);
    expect(
      (await readIncomeView(income, b.data.ownerId, 2026, clock)).book?.monthly,
    ).toHaveLength(20);
    const [{ backup }] =
      await admin`select backup from pg_temp.fm_review_reset_backup`;
    expect(backup.tables.expense_years[0].closed_at).not.toBeNull();
    expect(
      backup.tables.income_oneoffs.some(
        (r: { name: string }) => r.name === "Review edit",
      ),
    ).toBe(true);
    const rls =
      await admin`select relrowsecurity,relforcerowsecurity from pg_class
      where relnamespace='public'::regnamespace and relname=any(${reviewTables})`;
    expect(rls.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(
      true,
    );
    await triggersEnabled();
    await expect(
      runtime.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: b.data.ownerId })},true)`;
        await tx`delete from public.income_audit where owner_id=${b.data.ownerId}`;
      }),
    ).rejects.toThrow(/append only/);
    await expect(
      execute(confirmed(a.sql.reset, a.data.ownerId)),
    ).rejects.toThrow(/markers missing/);
  });
  it("rolls back all deletions and trigger changes on a late reset failure", async () => {
    const { data, sql } = await fixture();
    const broken = confirmed(sql.reset, data.ownerId).replace(
      "delete from public.income_books where owner_id=review_owner;",
      "raise exception 'injected failure after deletions';",
    );
    await expect(execute(broken)).rejects.toThrow(/injected failure/);
    expect(
      (await readExpenseView(expenses, data.ownerId, clock)).book?.jars,
    ).toHaveLength(18);
    expect(
      (await readIncomeView(income, data.ownerId, 2026, clock)).book?.monthly,
    ).toHaveLength(20);
    await triggersEnabled();
  });
});
