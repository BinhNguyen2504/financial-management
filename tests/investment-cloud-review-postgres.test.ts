import { afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  completeReviewTables,
  investmentTables,
} from "../scripts/lib/investment-cloud-review.mjs";
import {
  readInvestmentView,
  runInvestmentCommand,
} from "../src/application/investments";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  }),
  runtime = postgres(process.env.TEST_DATABASE_URL!, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  }),
  clock = { today: "2026-10-18", now: "2026-10-18T00:00:00.000Z" };
afterAll(async () => {
  await admin.end();
  await runtime.end();
});
async function execute(db: postgres.Sql, sql: string) {
  try {
    return await db.unsafe(sql);
  } catch (e) {
    await db.unsafe("rollback");
    throw e;
  }
}
async function fixture(db: postgres.Sql = admin) {
  const base = addSavingsReviewData(
      buildReviewData({ ownerId: randomUUID(), today: clock.today }),
      { today: clock.today },
    ),
    data = addInvestmentReviewData(base, { today: clock.today });
  await db`insert into auth.users(id) values(${data.ownerId})`;
  await execute(db, buildReviewSQL(base).seed);
  await execute(db, buildSavingsReviewSQL(base).seed);
  return { data, sql: buildInvestmentCloudReviewSQL(data) };
}
describe("Cloud review preparation and reset, isolated PostgreSQL only", () => {
  it("seeds only Investments through runtime RLS and preserves edits on retry", async () => {
    const { data } = await fixture();
    await execute(
      runtime,
      buildInvestmentCloudReviewSQL(data, { runtime: true }).seed,
    );
    let v = await readInvestmentView(
      postgresInvestmentRepository(runtime),
      data.ownerId,
      clock.today,
      clock,
    );
    expect(v.state.positions).toHaveLength(8);
    expect(v.book?.revisions.filter((r) => r.reason)).toHaveLength(2);
    const cash = v.book!.categories.find((c) => c.kind === "cash")!;
    await runInvestmentCommand(
      postgresInvestmentRepository(runtime),
      data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: v.book!.version,
        action: {
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind: "deposit",
            date: clock.today,
            categoryId: cash.id,
            amount: "123",
            note: "review edit",
            counterparty: "",
          },
        },
      },
      clock,
    );
    await execute(
      runtime,
      buildInvestmentCloudReviewSQL(data, { runtime: true }).seed,
    );
    v = await readInvestmentView(
      postgresInvestmentRepository(runtime),
      data.ownerId,
      clock.today,
      clock,
    );
    expect(v.book?.version).toBe(data.investments.version + 1);
    const [expenses] =
      await admin`select version from public.expense_books where owner_id=${data.ownerId}`;
    expect(expenses.version).toBe(data.expenses.version);
    const [savings] =
      await admin`select version from public.savings_books where owner_id=${data.ownerId}`;
    expect(savings.version).toBe(data.savings.version);
    await expect(
      execute(
        runtime,
        buildInvestmentCloudReviewSQL(
          { ...data, datasetId: randomUUID() },
          { runtime: true },
        ).seed,
      ),
    ).rejects.toThrow(/Matching existing/);
  });
  it("refuses to replace non-review investment data", async () => {
    const { data } = await fixture();
    await runInvestmentCommand(
      postgresInvestmentRepository(runtime),
      data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: {
          type: "createCategory",
          id: randomUUID(),
          name: "Existing ordinary investment",
          start: "2026-01-01",
          kind: "investment",
          emoji: "🌱",
          description: "",
        },
      },
      clock,
    );
    await expect(
      execute(
        runtime,
        buildInvestmentCloudReviewSQL(data, { runtime: true }).seed,
      ),
    ).rejects.toThrow(/already has data/);
    expect(
      (
        await readInvestmentView(
          postgresInvestmentRepository(runtime),
          data.ownerId,
          clock.today,
          clock,
        )
      ).book?.version,
    ).toBe(1);
  });
  it("backs up and resets 28 owner tables only with all four review markers and explicit confirmation", async () => {
    const a = await fixture(),
      b = await fixture();
    await execute(admin, a.sql.seed);
    await execute(admin, b.sql.seed);
    await execute(admin, a.sql.backup);
    const [{ backup }] =
      await admin`select backup from pg_temp.fm_review_backup`;
    expect(Object.keys(backup.tables)).toHaveLength(28);
    expect(backup.tables.investments_transactions.length).toBeGreaterThan(30);
    expect(backup.tables.investments_valuations.length).toBeGreaterThan(10);
    await expect(execute(admin, a.sql.reset)).rejects.toThrow(/not confirmed/);
    await expect(
      execute(
        admin,
        buildInvestmentCloudReviewSQL({
          ...a.data,
          datasetId: randomUUID(),
        }).reset.replace("'NOT_CONFIRMED'", `'RESET REVIEW ${a.data.ownerId}'`),
      ),
    ).rejects.toThrow(/markers missing/);
    await execute(
      admin,
      a.sql.reset.replace(
        "'NOT_CONFIRMED'",
        `'RESET REVIEW ${a.data.ownerId}'`,
      ),
    );
    for (const t of completeReviewTables) {
      const [r] = await admin.unsafe(
        `select count(*)::int as n from public.${t} where owner_id=$1`,
        [a.data.ownerId],
      );
      expect(r.n).toBe(0);
    }
    expect(
      await admin`select id from auth.users where id=${a.data.ownerId}`,
    ).toHaveLength(1);
    expect(
      (
        await readInvestmentView(
          postgresInvestmentRepository(runtime),
          b.data.ownerId,
          clock.today,
          clock,
        )
      ).book,
    ).not.toBeNull();
    const [{ n }] =
      await admin`select count(*)::int as n from pg_trigger where not tgisinternal and tgname in ('savings_history_immutable','investments_history_immutable') and tgenabled<>'O'`;
    expect(n).toBe(0);
  });
  it("rolls back owner deletions and trigger changes when a late reset step fails", async () => {
    const { data, sql } = await fixture();
    await execute(admin, sql.seed);
    const broken = sql.reset
      .replace("'NOT_CONFIRMED'", `'RESET REVIEW ${data.ownerId}'`)
      .replace(
        "delete from public.income_books where owner_id=review_owner;",
        "raise exception 'Injected late failure';",
      );
    await expect(execute(admin, broken)).rejects.toThrow(/Injected/);
    expect(
      (
        await readInvestmentView(
          postgresInvestmentRepository(runtime),
          data.ownerId,
          clock.today,
          clock,
        )
      ).state.positions,
    ).toHaveLength(8);
    const [{ n }] =
      await admin`select count(*)::int as n from pg_trigger where not tgisinternal and tgname in ('savings_history_immutable','investments_history_immutable') and tgenabled<>'O'`;
    expect(n).toBe(0);
  });
  it("rejects partial schema and creates all missing Investment tables plus seed atomically", async () => {
    const name = `review_${randomUUID().replaceAll("-", "")}`;
    await admin.unsafe(`create database ${name}`);
    const isolated = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      max: 1,
      onnotice: () => {},
    });
    try {
      await isolated.unsafe(
        "create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;",
      );
      for (const f of [
        "202610150001_expenses.sql",
        "202610150002_income.sql",
        "202610170001_savings.sql",
      ])
        await isolated.unsafe(
          await readFile(`supabase/migrations/${f}`, "utf8"),
        );
      const { data } = await fixture(isolated),
        sql = buildInvestmentCloudReviewSQL(data, {
          migrationSQL: await readFile(
            "supabase/migrations/202610180001_investments.sql",
            "utf8",
          ),
        });
      await isolated.unsafe(
        "create table public.investments_books(id integer)",
      );
      await expect(execute(isolated, sql.enable!)).rejects.toThrow(
        /Partial investment schema/,
      );
      await isolated.unsafe("drop table public.investments_books");
      await execute(isolated, sql.enable!);
      await execute(isolated, sql.enable!);
      expect(
        await isolated`select * from public.investments_categories where owner_id=${data.ownerId}`,
      ).toHaveLength(8);
      for (const t of investmentTables) {
        const [r] = await isolated.unsafe(
          "select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass",
          [`public.${t}`],
        );
        expect(r.relrowsecurity && r.relforcerowsecurity).toBe(true);
      }
    } finally {
      await isolated.end();
      await admin.unsafe(`drop database ${name}`);
    }
  });
});
