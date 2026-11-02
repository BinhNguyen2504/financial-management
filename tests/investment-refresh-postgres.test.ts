import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  buildInvestmentReviewData,
  buildInvestmentReviewSQL,
} from "../scripts/lib/investment-review-data.mjs";
import {
  buildInvestmentRefreshSQL,
  snapshotSQL,
} from "../scripts/lib/investment-refresh.mjs";
import { readInvestmentView } from "../src/application/investments";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 }),
  sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1, prepare: false });
afterAll(async () => {
  await sql.end();
  await admin.end();
});
async function seed() {
  const ownerId = randomUUID(),
    sample = buildInvestmentReviewData({ ownerId, today: "2026-11-02" });
  await admin`insert into auth.users(id) values(${ownerId})`;
  await admin.unsafe(buildInvestmentReviewSQL(sample).seed);
  return sample;
}
async function snapshot(ownerId: string) {
  return (await admin.unsafe(`select ${snapshotSQL(ownerId)} as data`))[0].data;
}
async function runScript(text: string) {
  try {
    return await admin.unsafe(text);
  } catch (e) {
    await admin.unsafe("rollback");
    throw e;
  }
}
it("replaces only Investment test rows atomically, reads back through RLS and leaves other modules/owners untouched", async () => {
  const original = await seed(),
    other = await seed(),
    beforeOther = await snapshot(other.ownerId);
  await admin`insert into public.income_books(owner_id,version) values(${original.ownerId},1)`;
  const before = await snapshot(original.ownerId),
    sample = buildInvestmentReviewData({
      ownerId: original.ownerId,
      today: "2026-11-02",
    });
  await runScript(buildInvestmentRefreshSQL(sample, before));
  expect(await snapshot(other.ownerId)).toEqual(beforeOther);
  expect(
    (
      await admin`select version from public.income_books where owner_id=${original.ownerId}`
    )[0].version,
  ).toBe(1);
  const v = await readInvestmentView(
    postgresInvestmentRepository(sql),
    original.ownerId,
    sample.today,
    { today: sample.today, now: `${sample.today}T00:00:00Z` },
  );
  expect(v.book?.categories).toHaveLength(11);
  expect(v.portfolios.find((p) => p.id === sample.ids.stock)).toMatchObject({
    cost: "7000000",
    value: "8000000",
    cash: "3000000",
    total: "11000000",
    unrealized: "1000000",
  });
  await expect(
    admin`delete from public.investments_audit where owner_id=${original.ownerId}`,
  ).rejects.toMatchObject({ code: "23514" });
  expect(
    (
      await admin`select count(*)::int n from pg_trigger where tgname='investments_history_immutable' and tgenabled<>'O'`
    )[0].n,
  ).toBe(0);
});
it("refuses changed snapshots and Goal references without clearing Investment rows", async () => {
  const sample = await seed(),
    before = await snapshot(sample.ownerId);
  const changed = structuredClone(before);
  changed.investments_books[0].version++;
  await expect(
    runScript(buildInvestmentRefreshSQL(sample, changed)),
  ).rejects.toThrow(/DATA_CHANGED/);
  expect(await snapshot(sample.ownerId)).toEqual(before);
  const goalId = randomUUID();
  await admin`insert into public.goals_books(owner_id,version) values(${sample.ownerId},1)`;
  await admin`insert into public.goals_definitions(owner_id,id,data) values(${sample.ownerId},${goalId},'{}')`;
  await admin`insert into public.goals_links(owner_id,id,goal_id,source_kind,source_id,data) values(${sample.ownerId},${randomUUID()},${goalId},'investments',${sample.ids.stock},'{}')`;
  await expect(
    runScript(buildInvestmentRefreshSQL(sample, before)),
  ).rejects.toThrow(/GOAL_LINKS_EXIST/);
  expect(await snapshot(sample.ownerId)).toEqual(before);
});

it("rolls back the entire replacement and restores history triggers after a late insert failure", async () => {
  const original = await seed(),
    before = await snapshot(original.ownerId);
  const sample = buildInvestmentReviewData({
    ownerId: original.ownerId,
    today: "2026-11-02",
  });
  sample.book.categories.push(sample.book.categories[0]);
  await expect(
    runScript(buildInvestmentRefreshSQL(sample, before)),
  ).rejects.toMatchObject({ code: "23505" });
  expect(await snapshot(original.ownerId)).toEqual(before);
  expect(
    (
      await admin`select count(*)::int n from pg_trigger where tgname='investments_history_immutable' and tgenabled<>'O'`
    )[0].n,
  ).toBe(0);
});
