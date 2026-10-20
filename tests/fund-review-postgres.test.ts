import { afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
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
  fullReviewTables,
  fundTables,
} from "../scripts/lib/fund-review-data";
import { readFundView, runFundCommand } from "../src/application/funds";
import { postgresFundRepository } from "../src/server/fund-repository";
import { vietnamClock } from "../src/domain/expenses/engine";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, {
    max: 1,
    onnotice: () => {},
  }),
  runtime = postgres(process.env.TEST_DATABASE_URL!, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  }),
  clock = vietnamClock(),
  repo = postgresFundRepository(runtime);
afterAll(async () => {
  await runtime.end();
  await admin.end();
});
async function execute(db: postgres.Sql, text: string) {
  try {
    return await db.unsafe(text);
  } catch (e) {
    await db.unsafe("rollback");
    throw e;
  }
}
async function fixture(db: postgres.Sql = admin) {
  const base = addInvestmentReviewData(
    addSavingsReviewData(
      buildReviewData({ ownerId: randomUUID(), today: clock.today }),
      { today: clock.today },
    ),
    { today: clock.today },
  );
  await db`insert into auth.users(id) values(${base.ownerId})`;
  for (const text of [
    buildReviewSQL(base).seed,
    buildSavingsReviewSQL(base).seed,
    buildInvestmentCloudReviewSQL(base).seed,
  ])
    await execute(db, text);
  const data = buildFundReviewData(base, { clock });
  return { data, sql: buildFundReviewSQL(data, { runtime: db === admin }) };
}
async function snapshot(owner: string) {
  const rows: Record<string, unknown> = {};
  for (const t of fullReviewTables)
    rows[t] = await admin.unsafe(
      `select to_jsonb(t) as row from public.${t} t where owner_id=$1 order by to_jsonb(t)::text`,
      [owner],
    );
  return rows;
}
it("maintenance CLI defaults to read-only, applies via runtime RLS, and reads back the actual balances", async () => {
  const { data } = await fixture(),
    directory = await mkdtemp(resolve("artifacts/fund-cli-")),
    file = join(directory, "sample-data.json");
  try {
    await writeFile(file, JSON.stringify(data), { mode: 0o600 });
    const run = (apply = false) =>
      promisify(execFile)(
        process.execPath,
        [
          "scripts/run-typescript.mjs",
          "scripts/import-funds.ts",
          "--file",
          file,
          ...(apply ? ["--apply"] : []),
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: process.env.TEST_DATABASE_URL,
            DATABASE_SSL: "disable",
          },
        },
      );
    expect((await run()).stdout).toContain("chưa ghi");
    expect((await readFundView(repo, data.ownerId, clock)).book).toBeNull();
    expect((await run(true)).stdout).toContain(
      "Đã nạp và đọc lại Fund bằng RLS",
    );
    expect((await readFundView(repo, data.ownerId, clock)).state).toEqual(
      data.expected,
    );
    expect((await run(true)).stdout).toContain("giữ các chỉnh sửa review");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("seeds Fund via runtime RLS, preserves 28 existing tables, and keeps review edits on retry", async () => {
  const { data, sql } = await fixture(),
    before = await snapshot(data.ownerId);
  await execute(runtime, sql.seed);
  const view = await readFundView(repo, data.ownerId, clock);
  expect(view.state).toEqual(data.expected);
  expect(view.sourceChanged).toBe(false);
  expect(view.book?.revisions).toEqual(data.funds.revisions);
  const after = await snapshot(data.ownerId);
  for (const t of fullReviewTables.filter((t) => !fundTables.includes(t)))
    expect(after[t]).toEqual(before[t]);
  await runFundCommand(
    repo,
    data.ownerId,
    {
      id: randomUUID(),
      expectedVersion: view.book!.version,
      action: {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "deposit",
          fundId: "emergency",
          locationId: data.ids.long,
          amount: "1",
          occurredAt: clock.now,
          note: "UI review edit",
        },
      },
    },
    clock,
  );
  await execute(runtime, sql.seed);
  expect((await readFundView(repo, data.ownerId, clock)).state.total).toBe(
    "84600001",
  );
  await execute(admin, sql.inspect);
  const [inspection] = await admin`select * from pg_temp.fm_fund_inspect`;
  expect(
    inspection.previous_markers_match && inspection.fund_marker_match,
  ).toBe(true);
});
it("refuses changed expense versions, mismatched previous markers, or unrelated Fund data atomically", async () => {
  const { data, sql } = await fixture();
  await admin`update expense_books set version=version+1 where owner_id=${data.ownerId}`;
  await expect(execute(runtime, sql.seed)).rejects.toThrow(
    /source version changed/,
  );
  expect((await readFundView(repo, data.ownerId, clock)).book).toBeNull();
  await admin`update expense_books set version=version-1 where owner_id=${data.ownerId}`;
  const bad = {
    ...data,
    previousMarkers: { ...data.previousMarkers, savings: "wrong marker" },
  };
  await expect(
    execute(runtime, buildFundReviewSQL(bad, { runtime: true }).seed),
  ).rejects.toThrow(/previous review markers/);
  await admin`insert into funds_books(owner_id,version) values(${data.ownerId},1)`;
  await expect(execute(runtime, sql.seed)).rejects.toThrow(/unrelated data/);
});
it("backs up and resets 35 tables plus receipts only after explicit confirmation; preserves Auth and other owner", async () => {
  const a = await fixture(),
    b = await fixture();
  await execute(runtime, a.sql.seed);
  await execute(runtime, b.sql.seed);
  for (const owner of [a.data.ownerId, b.data.ownerId])
    await admin`insert into data_imports(owner_id,id,fingerprint,result) values(${owner},${randomUUID()},'synthetic-review','{}'::jsonb)`;
  await execute(admin, a.sql.backup);
  const [{ backup }] =
    await admin`select backup from pg_temp.fm_fund_review_backup`;
  expect(Object.keys(backup.tables)).toHaveLength(35);
  expect(backup.tables.funds_transactions).toHaveLength(39);
  expect(backup.dataImports).toHaveLength(1);
  await expect(execute(admin, a.sql.reset)).rejects.toThrow(/not confirmed/);
  const confirm = (s: string) =>
    s.replace("'NOT_CONFIRMED'", `'RESET REVIEW ${a.data.ownerId}'`);
  await expect(
    execute(
      admin,
      confirm(
        buildFundReviewSQL({
          ...a.data,
          previousMarkers: { savings: "wrong", investments: "wrong" },
        }).reset,
      ),
    ),
  ).rejects.toThrow(/all five modules/);
  const before = await snapshot(a.data.ownerId);
  await expect(
    execute(
      admin,
      confirm(a.sql.reset).replace(
        "delete from public.income_books where owner_id=review_owner;",
        "raise exception 'Injected late failure';",
      ),
    ),
  ).rejects.toThrow(/Injected/);
  expect(await snapshot(a.data.ownerId)).toEqual(before);
  await execute(admin, confirm(a.sql.reset));
  const cleared = await snapshot(a.data.ownerId);
  for (const rows of Object.values(cleared)) expect(rows).toHaveLength(0);
  expect(
    await admin`select id from auth.users where id=${a.data.ownerId}`,
  ).toHaveLength(1);
  expect(
    await admin`select id from data_imports where owner_id=${a.data.ownerId}`,
  ).toHaveLength(0);
  expect(
    await admin`select id from data_imports where owner_id=${b.data.ownerId}`,
  ).toHaveLength(1);
  expect((await readFundView(repo, b.data.ownerId, clock)).state.total).toBe(
    "84600000",
  );
  const [{ n }] =
    await admin`select count(*)::int as n from pg_trigger where not tgisinternal and (tgname like '%immutable' or tgname='expense_year_sealed') and tgenabled<>'O'`;
  expect(n).toBe(0);
});
it("admin enable rejects partial schema and rolls back migration if source changed; missing tables remain inspectable", async () => {
  const name = `fund_review_${randomUUID().replaceAll("-", "")}`;
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
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql") && f !== "202610190001_funds.sql")
      .sort())
      await isolated.unsafe(
        await readFile(`supabase/migrations/${file}`, "utf8"),
      );
    const { data } = await fixture(isolated),
      sql = buildFundReviewSQL(data, {
        migrationSQL: await readFile(
          "supabase/migrations/202610190001_funds.sql",
          "utf8",
        ),
      });
    await execute(isolated, sql.inspect);
    expect(
      (await isolated`select missing_tables from pg_temp.fm_fund_inspect`)[0]
        .missing_tables,
    ).toHaveLength(7);
    await isolated.unsafe("create table public.funds_books(id int)");
    await expect(execute(isolated, sql.enable!)).rejects.toThrow(
      /Partial Fund schema/,
    );
    await isolated.unsafe("drop table public.funds_books");
    await isolated`update expense_books set version=version+1 where owner_id=${data.ownerId}`;
    await expect(execute(isolated, sql.enable!)).rejects.toThrow(
      /source version changed/,
    );
    expect(
      (
        await isolated`select to_regclass('public.funds_books') as table_name`
      )[0].table_name,
    ).toBeNull();
    await isolated`update expense_books set version=version-1 where owner_id=${data.ownerId}`;
    await execute(isolated, sql.enable!);
    await execute(isolated, sql.enable!);
    expect(
      await isolated`select * from funds_transactions where owner_id=${data.ownerId}`,
    ).toHaveLength(39);
    for (const table of fundTables) {
      const [r] = await isolated.unsafe(
        "select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass",
        ["public." + table],
      );
      expect(r.relrowsecurity && r.relforcerowsecurity).toBe(true);
    }
  } finally {
    await isolated.end();
    await admin.unsafe(`drop database ${name}`);
  }
});
