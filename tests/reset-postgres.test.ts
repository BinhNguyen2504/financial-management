import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import postgres from "postgres";
import { postgresDataRepository } from "../src/server/data-repository";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { postgresIncomeRepository } from "../src/server/income-repository";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import { postgresFundRepository } from "../src/server/fund-repository";
import {
  readExpenseView,
  runExpenseCommand,
} from "../src/application/expenses";
import { runIncomeCommand } from "../src/application/income";
import { runFundCommand } from "../src/application/funds";
import { setTransactionOwner } from "../src/server/owner-transaction";
import { backupTables } from "../src/domain/backup/format";
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

const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
  max: 1,
  onnotice: () => {},
});
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 8,
  prepare: false,
});
const repo = postgresDataRepository(sql),
  profile = { full_name: "", birth_date: "", gender: "" as const };
const clock = { today: "2026-10-29", now: "2026-10-29T00:00:00.000Z" };
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
  const expenses = await readExpenseView(
    postgresExpenseRepository(sql),
    id,
    clock,
  );
  const jar = expenses.book!.jars.find((j) => j.kind === "monthly")!;
  await runFundCommand(
    postgresFundRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: 0,
      action: {
        type: "configure",
        id: randomUUID(),
        jarIds: [jar.id],
        sourceMonth: "2026-10",
        expectedExpenseVersion: expenses.book!.version,
        applyLiving: true,
        multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
        priority: ["rainy_day", "emergency", "sinking"],
      },
    },
    clock,
  );
  const location = randomUUID(),
    transactionId = randomUUID();
  await runFundCommand(
    postgresFundRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: 1,
      action: {
        type: "saveLocation",
        id: location,
        name: "Ngân hàng",
        active: true,
      },
    },
    clock,
  );
  await runFundCommand(
    postgresFundRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: 2,
      action: {
        type: "postTransaction",
        transaction: {
          id: transactionId,
          kind: "deposit",
          fundId: "emergency",
          locationId: location,
          amount: "100000",
          occurredAt: clock.now,
          note: "Giữ trong bản sao lưu",
        },
      },
    },
    clock,
  );
  await runFundCommand(
    postgresFundRepository(sql),
    id,
    {
      id: randomUUID(),
      expectedVersion: 3,
      action: {
        type: "reviseTransaction",
        transactionId,
        replacement: null,
        reason: "Giữ lịch sử hủy",
      },
    },
    clock,
  );
  return id;
}
async function runtime<T>(
  id: string,
  run: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await setTransactionOwner(tx, id);
    return run(tx);
  });
}

describe("explicit financial reset through runtime RLS", () => {
  it("repairs hosted Auth access as a non-superuser without granting the reset role access to Auth", async () => {
    const suffix = randomUUID().replaceAll("-", ""),
      name = `reset_auth_${suffix}`,
      actor = `reset_auth_admin_${suffix}`;
    await admin.unsafe(
      `create role ${actor} login nosuperuser nocreatedb createrole noinherit nobypassrls`,
    );
    await admin.unsafe(`create database ${name}`);
    const isolated = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      max: 1,
      onnotice: () => {},
    });
    const runtimeSql = postgres(process.env.TEST_DATABASE_URL!, {
      database: name,
      max: 2,
      prepare: false,
    });
    const migrator = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      username: actor,
      max: 1,
      onnotice: () => {},
    });
    try {
      await isolated.unsafe(
        "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;",
      );
      // Hosted public schemas do not grant CREATE to PUBLIC (PG14's default does).
      await isolated.unsafe("revoke create on schema public from public");
      const repairFile = "202610300001_reset_owner_claims.sql";
      for (const file of (await readdir("supabase/migrations"))
        .filter(
          (file) =>
            file.endsWith(".sql") &&
            file !== repairFile &&
            file !== "202610300002_goals.sql",
        )
        .sort())
        await isolated.unsafe(
          await readFile(`supabase/migrations/${file}`, "utf8"),
        );
      // Keep Goals tables available while deliberately testing the pre-repair reset.
      await isolated.unsafe(
        (await readFile("supabase/migrations/202610300002_goals.sql", "utf8"))
          .split("do $$ declare definition")[0]
          .replaceAll("public.financial_request_owner()", "auth.uid()"),
      );
      await isolated.unsafe(
        "revoke usage on schema auth from financial_data_reset",
      );
      const id = randomUUID();
      await isolated`insert into auth.users(id) values(${id})`;
      await runExpenseCommand(
        postgresExpenseRepository(runtimeSql),
        id,
        {
          id: randomUUID(),
          expectedVersion: 0,
          action: { type: "initialize", start: "2025-01" },
        },
        clock,
      );
      const data = postgresDataRepository(runtimeSql),
        prepared = await data.prepareReset(id, profile),
        request = randomUUID();
      await expect(
        data.reset(id, prepared.operationId, request),
      ).rejects.toMatchObject({
        code: "RESET_PERMISSION_REQUIRED",
        status: 503,
      });
      expect((await data.backup(id, profile)).tables).toEqual(
        prepared.backup.tables,
      );
      expect(
        (
          await isolated`select result from data_resets where owner_id=${id} and id=${prepared.operationId}`
        )[0].result,
      ).toBeNull();
      // The migration role can use Auth but cannot delegate that usage, as on Supabase.
      await isolated.unsafe(
        `grant usage,create on schema public to ${actor} with grant option; grant usage on schema auth to ${actor}`,
      );
      for (const table of [
        ...backupTables,
        "data_imports",
        "data_generations",
        "data_resets",
      ])
        await isolated.unsafe(`alter table public.${table} owner to ${actor}`);
      for (const fn of [
        "expense_protect_history()",
        "expense_immutable_year()",
        "financial_data_fingerprint()",
      ])
        await isolated.unsafe(`alter function public.${fn} owner to ${actor}`);
      const [server] =
        await isolated`select current_setting('server_version_num')::int as version`;
      if (server.version >= 160000) {
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with admin true`,
        );
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with set false`,
        );
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with inherit false`,
        );
      }
      const [auth] =
        await migrator`select has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') as can_grant`;
      expect(auth.can_grant).toBe(false);
      const memberships =
        await isolated`select to_jsonb(m) as membership from pg_auth_members m where roleid='financial_data_reset'::regrole and member=${actor}::regrole order by grantor`;
      const repair = await readFile(
        `supabase/migrations/${repairFile}`,
        "utf8",
      );
      await migrator.unsafe(repair);
      await migrator.unsafe(repair);
      expect(
        await isolated`select to_jsonb(m) as membership from pg_auth_members m where roleid='financial_data_reset'::regrole and member=${actor}::regrole order by grantor`,
      ).toEqual(memberships);
      const [permissions] =
        await isolated`select has_schema_privilege('financial_data_reset','auth','USAGE') as auth_usage,has_schema_privilege('financial_data_reset','public','CREATE') as can_create,has_function_privilege('anon','public.financial_request_owner()','EXECUTE') as anonymous`;
      expect(permissions).toEqual({
        auth_usage: false,
        can_create: false,
        anonymous: false,
      });
      const [helper] =
        await migrator`select public.financial_request_owner() as owner`;
      expect(helper.owner).toBeNull();
      expect(await data.reset(id, prepared.operationId, request)).toMatchObject(
        { empty: true, dataGeneration: 1 },
      );
      expect((await data.status(id)).empty).toBe(true);
      expect(await data.reset(id, prepared.operationId, request)).toMatchObject(
        { empty: true, dataGeneration: 1 },
      );
      await data.import(id, randomUUID(), prepared.backup, 1);
      expect((await data.backup(id, profile)).tables).toEqual(
        prepared.backup.tables,
      );
    } finally {
      await runtimeSql.end();
      await migrator.end();
      await isolated.end();
      await admin.unsafe(`drop database ${name}`);
      await admin.unsafe(`drop role ${actor}`);
    }
  });
  it("reports confirmed rollback on a permission error after earlier deletes", async () => {
    const id = await fixture(),
      prepared = await repo.prepareReset(id, profile),
      request = randomUUID();
    await admin.unsafe(
      "revoke delete on public.income_books from financial_data_reset",
    );
    try {
      await expect(
        repo.reset(id, prepared.operationId, request),
      ).rejects.toMatchObject({
        code: "RESET_PERMISSION_REQUIRED",
        status: 503,
      });
    } finally {
      await admin.unsafe(
        "grant delete on public.income_books to financial_data_reset",
      );
    }
    expect((await repo.backup(id, profile)).tables).toEqual(
      prepared.backup.tables,
    );
    expect((await repo.status(id)).dataGeneration).toBe(0);
    expect(await repo.reset(id, prepared.operationId, request)).toMatchObject({
      empty: true,
      dataGeneration: 1,
    });
  });
  it("transfers function ownership as a non-superuser administrator and removes only its temporary SET access", async () => {
    const suffix = randomUUID().replaceAll("-", ""),
      name = `reset_admin_${suffix}`,
      actor = `reset_migrator_${suffix}`;
    await admin.unsafe(
      `create role ${actor} login nosuperuser nocreatedb createrole noinherit nobypassrls`,
    );
    await admin.unsafe(`create database ${name}`);
    const isolated = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      max: 1,
      onnotice: () => {},
    });
    const migrator = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      username: actor,
      max: 1,
      onnotice: () => {},
    });
    try {
      await isolated.unsafe(
        "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;",
      );
      const fileName = "202610290002_financial_data_reset.sql";
      for (const file of (await readdir("supabase/migrations"))
        .filter(
          (file) =>
            file.endsWith(".sql") &&
            ![
              fileName,
              "202610300001_reset_owner_claims.sql",
              "202610300002_goals.sql",
            ].includes(file),
        )
        .sort())
        await isolated.unsafe(
          await readFile(`supabase/migrations/${file}`, "utf8"),
        );
      await isolated.unsafe(
        `grant usage,create on schema public to ${actor} with grant option; grant usage on schema auth to ${actor} with grant option; grant references on auth.users to ${actor}; grant execute on function auth.uid() to ${actor} with grant option`,
      );
      for (const table of [
        ...backupTables.filter((t) => !t.startsWith("goals_")),
        "data_imports",
      ])
        await isolated.unsafe(`alter table public.${table} owner to ${actor}`);
      for (const fn of ["expense_protect_history", "expense_immutable_year"])
        await isolated.unsafe(
          `alter function public.${fn}() owner to ${actor}`,
        );
      const [server] =
        await isolated`select current_setting('server_version_num')::int as version`;
      const modern = server.version >= 160000;
      if (modern) {
        // Supabase's bootstrap grant has ADMIN but neither SET nor INHERIT.
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with admin true`,
        );
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with set false`,
        );
        await isolated.unsafe(
          `grant financial_data_reset to ${actor} with inherit false`,
        );
      }
      const access = modern ? "SET" : "MEMBER";
      const [identity] = await migrator.unsafe(
        `select current_user as name,(select rolsuper from pg_roles where rolname=current_user) as superuser,pg_has_role(current_user,'financial_data_reset','${access}') as can_set`,
      );
      expect(identity).toEqual({
        name: actor,
        superuser: false,
        can_set: false,
      });
      const ownerId = randomUUID();
      await isolated`insert into auth.users(id) values(${ownerId})`;
      await isolated`insert into expense_books(owner_id,start_month,version) values(${ownerId},'2026-10',1)`;
      const migration = await readFile(
        `supabase/migrations/${fileName}`,
        "utf8",
      );
      const aclStart = migration.indexOf("-- Configure ACL while");
      const legacy =
        migration.slice(0, aclStart) +
        "alter function public.reset_financial_data(uuid,uuid) owner to financial_data_reset;";
      await expect(migrator.unsafe(legacy)).rejects.toMatchObject({
        code: "42501",
        message: expect.stringMatching(
          modern
            ? /must be able to SET ROLE "financial_data_reset"/
            : /must be member of role "financial_data_reset"/,
        ),
      });
      expect(
        (await isolated`select to_regclass('public.data_resets') as name`)[0]
          .name,
      ).toBeNull();
      const memberships =
        await isolated`select to_jsonb(m) as membership from pg_auth_members m where roleid='financial_data_reset'::regrole and member=${actor}::regrole order by grantor`;
      await migrator.unsafe(migration);
      expect(
        await isolated`select to_jsonb(m) as membership from pg_auth_members m where roleid='financial_data_reset'::regrole and member=${actor}::regrole order by grantor`,
      ).toEqual(memberships);
      expect(
        (
          await migrator.unsafe(
            `select pg_has_role(current_user,'financial_data_reset','${access}') as can_set`,
          )
        )[0].can_set,
      ).toBe(false);
      const [fn] =
        await isolated`select proowner::regrole::text as owner,prosecdef as definer,has_function_privilege('authenticated',oid,'EXECUTE') as authenticated,has_function_privilege('anon',oid,'EXECUTE') as anonymous from pg_proc where oid='public.reset_financial_data(uuid,uuid)'::regprocedure`;
      expect(fn).toEqual({
        owner: "financial_data_reset",
        definer: true,
        authenticated: true,
        anonymous: false,
      });
      expect(
        await isolated`select start_month,version from expense_books where owner_id=${ownerId}`,
      ).toEqual([{ start_month: "2026-10", version: 1 }]);
      for (const runtime of [
        "authenticated",
        "expense_api",
        "anon",
        "service_role",
      ]) {
        const [exists] =
          await isolated`select exists(select 1 from pg_roles where rolname=${runtime}) as present`;
        if (exists.present)
          expect(
            (
              await isolated.unsafe(
                `select pg_has_role($1,'financial_data_reset','${access}') as can_set`,
                [runtime],
              )
            )[0].can_set,
          ).toBe(false);
      }
    } finally {
      await migrator.end();
      await isolated.end();
      await admin.unsafe(`drop database ${name}`);
      await admin.unsafe(`drop role ${actor}`);
    }
  });
  it("stops before DDL when import receipts are missing, then applies safely after the receipt migration", async () => {
    const name = `reset_prerequisites_${randomUUID().replaceAll("-", "")}`;
    await admin.unsafe(`create database ${name}`);
    const isolated = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
      database: name,
      max: 1,
      onnotice: () => {},
    });
    try {
      await isolated.unsafe(
        "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;",
      );
      const resetFile = "202610290002_financial_data_reset.sql",
        receiptsFile = "202610180002_data_imports.sql";
      for (const file of (await readdir("supabase/migrations"))
        .filter(
          (file) =>
            file.endsWith(".sql") &&
            ![
              resetFile,
              receiptsFile,
              "202610300002_goals.sql",
              "202610300001_reset_owner_claims.sql",
            ].includes(file),
        )
        .sort())
        await isolated.unsafe(
          await readFile(`supabase/migrations/${file}`, "utf8"),
        );
      const ownerId = randomUUID();
      await isolated`insert into auth.users(id) values(${ownerId})`;
      await isolated`insert into expense_books(owner_id,start_month,version) values(${ownerId},'2026-10',1)`;
      const migration = await readFile(
        `supabase/migrations/${resetFile}`,
        "utf8",
      );
      await expect(isolated.unsafe(migration)).rejects.toMatchObject({
        code: "P0001",
        message: "FINANCIAL_RESET_PREREQUISITE_MISSING: public.data_imports",
        hint: expect.stringContaining(receiptsFile),
      });
      const [before] =
        await isolated`select to_regclass('public.data_generations') as generations, to_regclass('public.data_resets') as resets, to_regprocedure('public.reset_financial_data(uuid,uuid)') as reset_function`;
      expect(before).toEqual({
        generations: null,
        resets: null,
        reset_function: null,
      });
      await isolated.unsafe(
        await readFile(`supabase/migrations/${receiptsFile}`, "utf8"),
      );
      await isolated.unsafe(migration);
      const [after] =
        await isolated`select to_regclass('public.data_imports') is not null as receipts, to_regclass('public.data_resets') is not null as resets, to_regprocedure('public.reset_financial_data(uuid,uuid)') is not null as reset_function`;
      expect(after).toEqual({
        receipts: true,
        resets: true,
        reset_function: true,
      });
      expect(
        await isolated`select start_month,version from expense_books where owner_id=${ownerId}`,
      ).toEqual([{ start_month: "2026-10", version: 1 }]);
      expect(await isolated`select * from data_imports`).toHaveLength(0);
    } finally {
      await isolated.end();
      await admin.unsafe(`drop database ${name}`);
    }
  });
  it("backs up all five modules, clears every financial table, preserves preferences and another owner, and restores the saved file", async () => {
    const id = await fixture(),
      other = await fixture();
    await admin`insert into overview_layouts(owner_id,layout,revision) values(${id},'{}',1)`;
    const untouched = await repo.backup(other, profile),
      prepared = await repo.prepareReset(id, profile);
    const before = await repo.status(id);
    expect(
      before.blockers
        .filter((m) => m.key !== "goals")
        .every((m) => m.count > 0),
    ).toBe(true);
    expect(before.blockers.reduce((n, m) => n + m.count, 0)).toBe(
      Object.values(before.counts).reduce((a, b) => a + b, 0),
    );
    const result = await repo.reset(id, prepared.operationId, randomUUID());
    expect(result).toMatchObject({ empty: true, dataGeneration: 1 });
    const status = await repo.status(id);
    expect(status.empty).toBe(true);
    for (const table of backupTables)
      expect(status.counts[table], table).toBe(0);
    expect(
      await admin`select * from overview_layouts where owner_id=${id}`,
    ).toHaveLength(1);
    expect((await repo.backup(other, profile)).tables).toEqual(
      untouched.tables,
    );
    await repo.import(id, randomUUID(), prepared.backup, 1);
    expect((await repo.backup(id, profile)).tables).toEqual(
      prepared.backup.tables,
    );
  });
  it("rejects stale/expired preparations and cross-owner operations without changing data", async () => {
    const id = await fixture(),
      other = await owner(),
      prepared = await repo.prepareReset(id, profile);
    await expect(
      repo.reset(other, prepared.operationId, randomUUID()),
    ).rejects.toMatchObject({ code: "RESET_NOT_FOUND" });
    const book = prepared.backup.tables.income_books[0];
    await runIncomeCommand(
      postgresIncomeRepository(sql),
      id,
      {
        id: randomUUID(),
        expectedVersion: book.version,
        action: {
          type: "upsertOneOff",
          id: randomUUID(),
          month: "2026-10",
          name: "New data",
          description: "",
          amount: "1",
        },
      },
      clock,
    );
    const changed = await repo.backup(id, profile);
    await expect(
      repo.reset(id, prepared.operationId, randomUUID()),
    ).rejects.toMatchObject({ code: "RESET_DATA_CHANGED" });
    const expired = await repo.prepareReset(id, profile);
    await admin`update data_resets set expires_at=now()-interval '1 second' where owner_id=${id} and id=${expired.operationId}`;
    await expect(
      repo.reset(id, expired.operationId, randomUUID()),
    ).rejects.toMatchObject({ code: "RESET_EXPIRED" });
    expect((await repo.backup(id, profile)).tables).toEqual(changed.tables);
  });
  it("rolls back earlier table deletes if a later delete fails", async () => {
    const id = await fixture(),
      prepared = await repo.prepareReset(id, profile);
    await admin.unsafe(
      `create function public.test_reset_failure() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$; create trigger test_reset_failure before delete on public.income_books for each row execute function public.test_reset_failure()`,
    );
    try {
      await expect(
        repo.reset(id, prepared.operationId, randomUUID()),
      ).rejects.toThrow("injected failure");
    } finally {
      await admin.unsafe(
        "drop trigger test_reset_failure on public.income_books; drop function public.test_reset_failure()",
      );
    }
    expect((await repo.backup(id, profile)).tables).toEqual(
      prepared.backup.tables,
    );
    expect((await repo.status(id)).dataGeneration).toBe(0);
    expect(
      (
        await admin`select result from data_resets where owner_id=${id} and id=${prepared.operationId}`
      )[0].result,
    ).toBeNull();
  });
  it("settles concurrent retries once and never clears newly restored data on an old retry", async () => {
    const id = await fixture(),
      prepared = await repo.prepareReset(id, profile),
      request = randomUUID();
    const [a, b] = await Promise.all([
      repo.reset(id, prepared.operationId, request),
      repo.reset(id, prepared.operationId, request),
    ]);
    expect(a).toEqual(b);
    expect(a.dataGeneration).toBe(1);
    await repo.import(id, randomUUID(), prepared.backup, 1);
    expect(await repo.reset(id, prepared.operationId, request)).toEqual(a);
    expect((await repo.backup(id, profile)).tables).toEqual(
      prepared.backup.tables,
    );
    await expect(
      repo.reset(id, prepared.operationId, randomUUID()),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("invalidates old import receipts and stale commands/previews in every module even when expectedVersion is zero", async () => {
    const source = await fixture(),
      id = await owner(),
      backup = await repo.backup(source, profile),
      importId = randomUUID();
    await repo.import(id, importId, backup);
    const prepared = await repo.prepareReset(id, profile);
    await repo.reset(id, prepared.operationId, randomUUID());
    await expect(repo.import(id, importId, backup)).rejects.toMatchObject({
      code: "DATA_GENERATION_CHANGED",
    });
    await expect(repo.import(id, importId, backup, 1)).rejects.toMatchObject({
      code: "DATA_GENERATION_CHANGED",
    });
    for (const repository of [
      postgresExpenseRepository(sql, 0),
      postgresIncomeRepository(sql, 0),
      postgresSavingsRepository(sql, 0),
      postgresInvestmentRepository(sql, 0),
      postgresFundRepository(sql, 0),
    ]) {
      await expect(
        repository.transaction(id, async () => {
          throw new Error("must not execute stale command");
        }),
      ).rejects.toMatchObject({ code: "DATA_GENERATION_CHANGED" });
    }
    const view = await readExpenseView(
      postgresExpenseRepository(sql),
      id,
      clock,
    );
    expect(view).toMatchObject({ book: null, dataGeneration: 1 });
    expect((await repo.status(id)).empty).toBe(true);
  });
  it("keeps direct audit, sealed-year and receipt deletes protected and denies role escalation or direct browser RPC", async () => {
    const id = await fixture();
    for (const table of [
      "expense_audit",
      "expense_commands",
      "expense_years",
      "income_audit",
      "savings_audit",
      "investments_audit",
      "funds_audit",
    ]) {
      await expect(
        runtime(id, (tx) =>
          tx.unsafe(`delete from public.${table} where owner_id=$1`, [id]),
        ),
      ).rejects.toMatchObject({ code: "23514" });
    }
    await expect(
      runtime(id, (tx) => tx.unsafe("set local role financial_data_reset")),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: id, role: "authenticated" })},true)`;
        return tx`select public.reset_financial_data(${randomUUID()},${randomUUID()})`;
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("keeps backup available when reset migration is absent", async () => {
    const id = await fixture();
    await admin.unsafe(
      "alter function public.reset_financial_data(uuid,uuid) rename to test_unavailable_reset",
    );
    try {
      expect((await repo.status(id)).resetReady).toBe(false);
      expect(Object.keys((await repo.backup(id, profile)).tables)).toHaveLength(
        41,
      );
      await expect(repo.prepareReset(id, profile)).rejects.toMatchObject({
        code: "RESET_NOT_READY",
      });
    } finally {
      await admin.unsafe(
        "alter function public.test_unavailable_reset(uuid,uuid) rename to reset_financial_data",
      );
    }
  });
});
