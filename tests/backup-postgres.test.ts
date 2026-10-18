import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresDataRepository } from "../src/server/data-repository";
import { backupTables } from "../src/domain/backup/format";
import { backupBooks } from "../src/domain/backup/validate";
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
  runExpenseCommand,
  readExpenseView,
} from "../src/application/expenses";
import { runIncomeCommand, readIncomeView } from "../src/application/income";
import { readSavingsView } from "../src/application/savings";
import { readInvestmentView } from "../src/application/investments";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { postgresIncomeRepository } from "../src/server/income-repository";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
  max: 1,
  onnotice: () => {},
});
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 6,
  prepare: false,
  onnotice: () => {},
});
const repo = postgresDataRepository(sql);
const profile = {
  full_name: "Nguyễn Văn Bình",
  birth_date: "1994-05-20",
  gender: "male" as const,
};
const clock = { today: "2026-10-18", now: "2026-10-18T00:00:00.000Z" };
afterAll(async () => {
  await sql.end();
  await admin.end();
});
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
async function fixture() {
  const id = await owner();
  const base = addSavingsReviewData(
    buildReviewData({ ownerId: id, today: "2025-12-31" }),
    { today: clock.today },
  );
  const data = addInvestmentReviewData(base, { today: clock.today });
  for (const seed of [
    buildReviewSQL(base).seed,
    buildSavingsReviewSQL(base).seed,
    buildInvestmentCloudReviewSQL(data).seed,
  ])
    await admin.unsafe(seed);
  await runExpenseCommand(
    postgresExpenseRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: base.expenses.version,
      action: { type: "closeYear", year: 2025 },
    },
    clock,
  );
  await runIncomeCommand(
    postgresIncomeRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: base.income.version,
      action: {
        type: "upsertOneOff",
        id: randomUUID(),
        month: "2026-10",
        name: "Giá trị lớn",
        description: "",
        amount: "999999999999999999999999",
      },
    },
    clock,
  );
  return { id, backup: await repo.backup(id, profile) };
}
describe("full-account transfer via runtime RLS", () => {
  it("exports all financial data when only the import receipt migration is missing", async () => {
    const { id, backup } = await fixture(),
      target = await owner();
    await admin.unsafe(
      "alter table public.data_imports rename to test_unconfigured_imports",
    );
    try {
      expect(await repo.status(id)).toMatchObject({
        empty: false,
        importReady: false,
      });
      expect((await repo.backup(id, profile)).tables).toEqual(backup.tables);
      await expect(
        repo.import(target, randomUUID(), backup),
      ).rejects.toMatchObject({ code: "IMPORT_NOT_READY" });
    } finally {
      await admin.unsafe(
        "alter table public.test_unconfigured_imports rename to data_imports",
      );
    }
  });
  it("round trips every table, immutable history, closed years, large money and all module views", async () => {
    const { id, backup } = await fixture(),
      target = await owner();
    expect((await repo.status(target)).empty).toBe(true);
    expect((await repo.status(target)).empty).toBe(true);
    await repo.import(target, randomUUID(), backup);
    const copy = await repo.backup(target, profile);
    expect(copy.tables).toEqual(backup.tables);
    expect(copy.profile).toEqual(profile);
    expect(backupBooks(copy)).toEqual(backupBooks(backup));
    expect(
      copy.tables.income_oneoffs.some(
        (r) => r.amount === "999999999999999999999999",
      ),
    ).toBe(true);
    expect(copy.tables.expense_years.some((r) => r.closed_at !== null)).toBe(
      true,
    );
    for (const t of backupTables)
      expect((await repo.status(target)).counts[t]).toBe(
        backup.tables[t].length,
      );
    const er = postgresExpenseRepository(sql),
      ir = postgresIncomeRepository(sql),
      sr = postgresSavingsRepository(sql),
      vr = postgresInvestmentRepository(sql);
    expect((await readExpenseView(er, target, clock)).rows).toEqual(
      (await readExpenseView(er, id, clock)).rows,
    );
    expect((await readIncomeView(ir, target, 2025, clock)).rows).toEqual(
      (await readIncomeView(ir, id, 2025, clock)).rows,
    );
    expect(
      (await readSavingsView(sr, target, clock.today, clock)).state,
    ).toEqual((await readSavingsView(sr, id, clock.today, clock)).state);
    expect(
      (await readInvestmentView(vr, target, clock.today, clock)).state,
    ).toEqual((await readInvestmentView(vr, id, clock.today, clock)).state);
    const sealed =
      await admin`select year from expense_years where owner_id=${target} and closed_at is not null`;
    await expect(
      admin`update expense_years set snapshot='[]'::jsonb where owner_id=${target} and year=${sealed[0].year}`,
    ).rejects.toThrow(/immutable/);
  });
  it("serializes competing imports, replays a lost response, and rejects a reused request id with different contents", async () => {
    const { backup } = await fixture(),
      target = await owner(),
      requestId = randomUUID();
    const results = await Promise.allSettled([
      repo.import(target, requestId, backup),
      repo.import(target, randomUUID(), backup),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const winner =
      await admin`select id from data_imports where owner_id=${target}`;
    const first = await repo.import(target, winner[0].id, backup);
    expect(await repo.import(target, winner[0].id, backup)).toEqual(first);
    await expect(
      repo.import(target, winner[0].id, {
        ...backup,
        profile: { ...profile, full_name: "Khác" },
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect((await repo.backup(target, profile)).tables).toEqual(backup.tables);
  });
  it("blocks a target with data in only one module and preserves unrelated owners", async () => {
    const { id, backup } = await fixture(),
      target = await owner();
    await runIncomeCommand(
      postgresIncomeRepository(sql),
      target,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: {
          type: "upsertOneOff",
          id: randomUUID(),
          month: "2026-10",
          name: "Có dữ liệu",
          description: "",
          amount: "1",
        },
      },
      clock,
    );
    await expect(
      repo.import(target, randomUUID(), backup),
    ).rejects.toMatchObject({ code: "ACCOUNT_NOT_EMPTY" });
    expect((await repo.backup(id, profile)).tables).toEqual(backup.tables);
    expect((await repo.status(target)).counts.expense_books).toBe(0);
    await expect(sql`select * from public.income_books`).rejects.toThrow();
  });
  it("rolls back all module writes and the receipt when a late insert fails", async () => {
    const { backup } = await fixture(),
      target = await owner();
    await admin.unsafe(
      `create function public.test_restore_failure() returns trigger language plpgsql as $$ begin if new.owner_id='${target}'::uuid then raise exception 'injected late failure'; end if; return new; end $$; create trigger test_restore_failure before insert on public.investments_audit for each row execute function public.test_restore_failure();`,
    );
    try {
      await expect(repo.import(target, randomUUID(), backup)).rejects.toThrow(
        /injected/,
      );
    } finally {
      await admin.unsafe(
        "drop trigger test_restore_failure on public.investments_audit; drop function public.test_restore_failure();",
      );
    }
    expect((await repo.status(target)).empty).toBe(true);
    expect(
      await admin`select * from data_imports where owner_id=${target}`,
    ).toHaveLength(0);
  });
  it("rechecks emptiness after a concurrent normal write holding the same module lock", async () => {
    const { backup } = await fixture(),
      target = await owner();
    let release!: () => void, locked!: () => void;
    const gate = new Promise<void>((r) => {
        release = r;
      }),
      acquired = new Promise<void>((r) => {
        locked = r;
      });
    const writing = admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`income:${target}`},0))`;
      await tx`insert into income_books(owner_id,version) values(${target},1)`;
      locked();
      await gate;
    });
    await acquired;
    const importing = repo.import(target, randomUUID(), backup);
    release();
    await writing;
    await expect(importing).rejects.toMatchObject({
      code: "ACCOUNT_NOT_EMPTY",
    });
    expect((await repo.status(target)).counts.investments_books).toBe(0);
  });
  it("rolls back a read-back mismatch and rejects missing module schema", async () => {
    const { backup } = await fixture(),
      target = await owner();
    await admin.unsafe(
      `create function public.test_restore_mismatch() returns trigger language plpgsql as $$ begin if new.owner_id='${target}'::uuid then new.name=new.name||'!'; end if; return new; end $$; create trigger test_restore_mismatch before insert on public.expense_labels for each row execute function public.test_restore_mismatch();`,
    );
    try {
      await expect(
        repo.import(target, randomUUID(), backup),
      ).rejects.toMatchObject({ code: "RESTORE_MISMATCH" });
    } finally {
      await admin.unsafe(
        "drop trigger test_restore_mismatch on public.expense_labels; drop function public.test_restore_mismatch();",
      );
    }
    expect((await repo.status(target)).empty).toBe(true);
    await admin.unsafe(
      "alter table public.investments_valuations rename to test_missing_valuations",
    );
    try {
      await expect(repo.backup(target, profile)).rejects.toMatchObject({
        code: "SCHEMA_NOT_READY",
      });
      await expect(repo.status(target)).rejects.toMatchObject({
        code: "SCHEMA_NOT_READY",
      });
    } finally {
      await admin.unsafe(
        "alter table public.test_missing_valuations rename to investments_valuations",
      );
    }
  });
  it("rejects forged mirrors, corrupted history and foreign references without writing", async () => {
    const { backup } = await fixture(),
      target = await owner();
    const changed = structuredClone(backup);
    changed.tables.investments_transactions[0].data.rootId = randomUUID();
    await expect(repo.import(target, randomUUID(), changed)).rejects.toThrow(
      /khớp/,
    );
    const incomplete = structuredClone(backup);
    incomplete.tables.savings_audit.pop();
    await expect(repo.import(target, randomUUID(), incomplete)).rejects.toThrow(
      /phiên bản/,
    );
    expect((await repo.status(target)).empty).toBe(true);
    await sql.begin(async (tx) => {
      await tx.unsafe("set local role authenticated");
      await tx.unsafe("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: target, role: "authenticated" }),
      ]);
      expect(
        await tx`select * from public.investments_books where owner_id<>${target}`,
      ).toHaveLength(0);
    });
  });
});
