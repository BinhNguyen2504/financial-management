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
  allReviewTables,
  savingsTables,
} from "../scripts/lib/savings-review-data.mjs";
import { readSavingsView, runSavingsCommand } from "../src/application/savings";
import { postgresSavingsRepository } from "../src/server/savings-repository";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  }),
  runtime = postgres(process.env.TEST_DATABASE_URL!, {
    max: 1,
    prepare: false,
  });
const clock = { today: "2026-10-17", now: "2026-10-17T00:00:00.000Z" };
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
async function fixture() {
  const data = addSavingsReviewData(
    buildReviewData({ ownerId: randomUUID(), today: clock.today }),
    { today: clock.today },
  );
  await admin`insert into auth.users(id) values(${data.ownerId})`;
  await execute(admin, buildReviewSQL(data).seed);
  return { data, sql: buildSavingsReviewSQL(data) };
}
describe("Savings review extension and complete reset (isolated database)", () => {
  it("extends an existing marked review dataset through runtime RLS without changing income/expenses", async () => {
    const { data } = await fixture();
    await admin`update public.expense_books set version=2 where owner_id=${data.ownerId}`;
    await execute(runtime, buildSavingsReviewSQL(data, { runtime: true }).seed);
    const v = await readSavingsView(
      postgresSavingsRepository(runtime),
      data.ownerId,
      clock.today,
      clock,
    );
    expect(v.state.positions).toHaveLength(6);
    expect(v.state.lots).toHaveLength(9);
    expect(v.due).toHaveLength(1);
    const [expense] =
      await admin`select version from public.expense_books where owner_id=${data.ownerId}`;
    expect(expense.version).toBe(2);
    const momo = data.savings.categories.find((c) => c.kind === "cash")!;
    await runSavingsCommand(
      postgresSavingsRepository(runtime),
      data.ownerId,
      {
        id: randomUUID(),
        expectedVersion: v.book!.version,
        action: {
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind: "deposit",
            categoryId: momo.id,
            date: clock.today,
            amount: "123",
            note: "review edit",
          },
        },
      },
      clock,
    );
    await execute(runtime, buildSavingsReviewSQL(data, { runtime: true }).seed);
    expect(
      (
        await readSavingsView(
          postgresSavingsRepository(runtime),
          data.ownerId,
          clock.today,
          clock,
        )
      ).book?.version,
    ).toBe(v.book!.version + 1);
    const mismatch = { ...data, datasetId: randomUUID() };
    await expect(
      execute(runtime, buildSavingsReviewSQL(mismatch, { runtime: true }).seed),
    ).rejects.toThrow(/Matching existing/);
  });
  it("backs up and resets all 22 owner tables only after matching markers and confirmation", async () => {
    const a = await fixture(),
      b = await fixture();
    await execute(admin, a.sql.seed);
    await execute(admin, b.sql.seed);
    await execute(admin, a.sql.backup);
    const [{ backup }] =
      await admin`select backup from pg_temp.fm_review_backup`;
    expect(Object.keys(backup.tables)).toHaveLength(22);
    expect(backup.tables.savings_transactions.length).toBeGreaterThan(30);
    await expect(execute(admin, a.sql.reset)).rejects.toThrow(/not confirmed/);
    await expect(
      execute(
        admin,
        buildSavingsReviewSQL({
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
    for (const t of allReviewTables) {
      const [r] = await admin.unsafe(
        `select count(*)::int as count from public.${t} where owner_id=$1`,
        [a.data.ownerId],
      );
      expect(r.count).toBe(0);
    }
    expect(
      await admin`select id from auth.users where id=${a.data.ownerId}`,
    ).toHaveLength(1);
    expect(
      (
        await readSavingsView(
          postgresSavingsRepository(runtime),
          b.data.ownerId,
          clock.today,
          clock,
        )
      ).book,
    ).not.toBeNull();
    const triggers =
      await admin`select tgenabled from pg_trigger where not tgisinternal and tgname='savings_history_immutable'`;
    expect(triggers).toHaveLength(6);
    expect(triggers.every((t) => t.tgenabled === "O")).toBe(true);
  });
  it("rolls back all data and trigger changes if reset fails late", async () => {
    const { data, sql } = await fixture();
    await execute(admin, sql.seed);
    const broken = sql.reset
      .replace("'NOT_CONFIRMED'", `'RESET REVIEW ${data.ownerId}'`)
      .replace(
        "delete from public.income_books where owner_id=review_owner;",
        "raise exception 'injected late failure';",
      );
    await expect(execute(admin, broken)).rejects.toThrow(
      /injected late failure/,
    );
    expect(
      (
        await readSavingsView(
          postgresSavingsRepository(runtime),
          data.ownerId,
          clock.today,
          clock,
        )
      ).state.positions,
    ).toHaveLength(6);
    const triggers =
      await admin`select tgenabled from pg_trigger where not tgisinternal and tgname='savings_history_immutable'`;
    expect(triggers.every((t) => t.tgenabled === "O")).toBe(true);
  });
  it("enables a missing Savings schema and seeds atomically; repeats preserve edits", async () => {
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
      for (const f of ["202610150001_expenses.sql", "202610150002_income.sql"])
        await isolated.unsafe(
          await readFile(`supabase/migrations/${f}`, "utf8"),
        );
      const data = addSavingsReviewData(
        buildReviewData({ ownerId: randomUUID(), today: clock.today }),
        { today: clock.today },
      );
      await isolated`insert into auth.users(id) values(${data.ownerId})`;
      await execute(isolated, buildReviewSQL(data).seed);
      const sql = buildSavingsReviewSQL(data, {
        migrationSQL: await readFile(
          "supabase/migrations/202610170001_savings.sql",
          "utf8",
        ),
      });
      await execute(isolated, sql.enable!);
      await execute(isolated, sql.enable!);
      expect(
        await isolated`select * from public.savings_categories where owner_id=${data.ownerId}`,
      ).toHaveLength(6);
      for (const t of savingsTables) {
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
