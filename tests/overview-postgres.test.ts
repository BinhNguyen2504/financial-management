import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresOverviewRepository } from "../src/server/overview-repository";
import { postgresDataRepository } from "../src/server/data-repository";
import { defaultLayout } from "../src/domain/overview/layout";
import { setTransactionOwner } from "../src/server/owner-transaction";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 });
const runtime = postgres(process.env.TEST_DATABASE_URL!, {
  max: 2,
  prepare: false,
});
afterAll(async () => {
  await runtime.end();
  await admin.end();
});
it("reads without creating data, isolates account preferences, and excludes them from financial emptiness/backup", async () => {
  const a = randomUUID(),
    b = randomUUID(),
    repo = postgresOverviewRepository(runtime);
  await admin`insert into auth.users(id) values(${a}),(${b})`;
  expect(await repo.read(a)).toEqual(defaultLayout());
  expect(
    (await admin`select * from public.overview_layouts where owner_id=${a}`)
      .length,
  ).toBe(0);
  const layout = {
    schemaVersion: 1 as const,
    widgets: ["peace" as const],
    jarIds: [],
    expectedRevision: 0,
  };
  const saved = await repo.save(a, layout);
  expect(saved.revision).toBe(1);
  expect((await repo.read(a)).widgets).toEqual(["peace"]);
  expect(await repo.read(b)).toEqual(defaultLayout());
  await runtime.begin(async (tx) => {
    await setTransactionOwner(tx, b);
    expect(
      await tx`select * from public.overview_layouts where owner_id=${a}`,
    ).toHaveLength(0);
    await expect(
      tx`update public.overview_layouts set revision=2 where owner_id=${a} returning *`,
    ).resolves.toHaveLength(0);
  });
  const data = postgresDataRepository(runtime);
  expect((await data.status(a)).empty).toBe(true);
  const backup = await data.backup(a, {
    full_name: "",
    birth_date: "",
    gender: "",
  });
  expect(Object.keys(backup.tables)).not.toContain("overview_layouts");
  await expect(repo.save(a, layout)).rejects.toMatchObject({
    code: "LAYOUT_CONFLICT",
    status: 409,
  });
  expect((await repo.read(a)).revision).toBe(1);
});
it("serializes concurrent first saves so only one wins", async () => {
  const owner = randomUUID(),
    repo = postgresOverviewRepository(runtime);
  await admin`insert into auth.users(id) values(${owner})`;
  const input = {
    schemaVersion: 1,
    widgets: [],
    jarIds: [],
    expectedRevision: 0,
  };
  const results = await Promise.allSettled([
    repo.save(owner, input),
    repo.save(owner, input),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await repo.read(owner)).revision).toBe(1);
});

it("keeps an existing six-widget layout unchanged after the default becomes five", async () => {
  const owner = randomUUID(),
    repo = postgresOverviewRepository(runtime);
  await admin`insert into auth.users(id) values(${owner})`;
  const widgets = ["attention" as const, ...defaultLayout().widgets];
  const saved = await repo.save(owner, {
    schemaVersion: 1,
    widgets,
    jarIds: [],
    expectedRevision: 0,
  });
  expect((await repo.read(owner)).widgets).toEqual(widgets);
  expect(await repo.read(owner)).toEqual(saved);
  expect(defaultLayout().widgets).toHaveLength(5);
});
