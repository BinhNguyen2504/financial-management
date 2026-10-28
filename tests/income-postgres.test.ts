import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresIncomeRepository } from "../src/server/income-repository";
import { readIncomeView, runIncomeCommand } from "../src/application/income";
import type { IncomeAction } from "../src/domain/income/schema";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 });
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 6,
  prepare: false,
});
const repository = postgresIncomeRepository(sql);
const clock = { today: "2027-03-15", now: "2027-03-15T09:00:00.000Z" };
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
const execute = (
  user: string,
  expectedVersion: number,
  action: IncomeAction,
  id = randomUUID(),
  preview = false,
) =>
  runIncomeCommand(
    repository,
    user,
    { id, expectedVersion, action },
    clock,
    preview,
  );
async function initialized() {
  const user = await owner(),
    id = randomUUID();
  await execute(user, 0, {
    type: "createCategory",
    id,
    start: "2026-12",
    name: "Lương",
    description: "",
  });
  return { user, id };
}
const monthly = (
  categoryId: string,
  month = "2027-01",
  amount = "9007199254740993",
): IncomeAction => ({
  type: "setMonthly",
  categoryId,
  month,
  amount,
  note: "Kiểm thử",
});
async function asUser<T>(
  user: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: user })},true)`;
    return fn(tx);
  });
}
afterAll(async () => {
  await sql.end();
  await admin.end();
});
describe("Income PostgreSQL persistence and isolation", () => {
  it("persists exact values, replaces, clears, and retains immutable audit", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id));
    const independent = postgres(process.env.TEST_DATABASE_URL!, {
      max: 1,
      prepare: false,
    });
    try {
      expect(
        (
          await readIncomeView(
            postgresIncomeRepository(independent),
            user,
            2027,
            clock,
          )
        ).rows[0].amount,
      ).toBe("9007199254740993");
    } finally {
      await independent.end();
    }
    await execute(user, 2, monthly(id, "2027-01", "0"));
    expect(
      (await readIncomeView(repository, user, 2027, clock)).book!.monthly,
    ).toHaveLength(1);
    await execute(user, 3, {
      type: "clearMonthly",
      categoryId: id,
      month: "2027-01",
    });
    const view = await readIncomeView(repository, user, 2027, clock);
    expect(view.rows[0].amount).toBeNull();
    expect(view.book!.audit).toHaveLength(4);
    await expect(
      asUser(
        user,
        (tx) => tx`delete from public.income_audit where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
    await expect(
      asUser(
        user,
        (tx) =>
          tx`update public.income_commands set fingerprint='other' where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
  });
  it("serializes concurrent writes and retries the same command once", async () => {
    const { user, id } = await initialized();
    const commandId = randomUUID();
    const results = await Promise.all([
      execute(user, 1, monthly(id), commandId),
      execute(user, 1, monthly(id), commandId),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      (await readIncomeView(repository, user, 2027, clock)).book!.version,
    ).toBe(2);
    await expect(
      execute(user, 1, monthly(id, "2027-01", "2"), commandId),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const races = await Promise.allSettled([
      execute(user, 2, monthly(id, "2027-02", "2")),
      execute(user, 2, monthly(id, "2027-03", "3")),
    ]);
    expect(races.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(races.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
  });
  it("preview writes nothing and invalid input rolls back", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id), randomUUID(), true);
    expect(
      (await readIncomeView(repository, user, 2027, clock)).book!.version,
    ).toBe(1);
    await expect(execute(user, 1, monthly(id, "2027-04", "2"))).rejects.toThrow(
      /thực nhận/,
    );
    expect(
      (await readIncomeView(repository, user, 2027, clock)).book!.audit,
    ).toHaveLength(1);
    await execute(user, 1, monthly(id));
  });
  it("enforces owner isolation including cross-owner category references and direct browser access", async () => {
    const a = await initialized(),
      b = await initialized();
    await execute(a.user, 1, monthly(a.id));
    expect(
      (await readIncomeView(repository, b.user, 2027, clock)).book!.monthly,
    ).toEqual([]);
    await expect(execute(b.user, 1, monthly(a.id))).rejects.toMatchObject({
      status: 404,
    });
    const rows = await asUser(
      b.user,
      (tx) => tx`select * from public.income_monthly where owner_id=${a.user}`,
    );
    expect(rows).toEqual([]);
    await expect(
      asUser(
        b.user,
        (tx) =>
          tx`insert into public.income_monthly(owner_id,category_id,month,amount,note) values(${b.user},${a.id},'2027-01',1,'')`,
      ),
    ).rejects.toThrow(/foreign key/);
    const browser = await admin.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: a.user })},true)`;
      return tx`select * from public.income_books`;
    });
    expect(browser).toEqual([]);
  });
  it("enforces unique months, money precision and soft deletion of one-offs", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id));
    await expect(
      asUser(
        user,
        (tx) =>
          tx`insert into public.income_monthly(owner_id,category_id,month,amount,note) values(${user},${id},'2027-01',1,'')`,
      ),
    ).rejects.toThrow(/unique/);
    await expect(
      asUser(
        user,
        (tx) =>
          tx`update public.income_monthly set amount=-1 where owner_id=${user}`,
      ),
    ).rejects.toThrow(/check/);
    const one = randomUUID();
    await execute(user, 2, {
      type: "upsertOneOff",
      id: one,
      month: "2027-01",
      name: "Bonus",
      description: "",
      amount: "999999999999999999999999",
    });
    await execute(user, 3, { type: "deleteOneOff", id: one });
    const v = await readIncomeView(repository, user, 2027, clock);
    expect(v.book!.oneOffs[0].deleted).toBe(true);
    expect(v.rows.some((r) => r.key === one)).toBe(false);
  });
  it("deletes only categories with no remaining receipts across years and preserves their audit", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id, "2026-12", "0"));
    await execute(user, 2, monthly(id, "2027-01", "10"));
    await expect(
      execute(user, 3, { type: "deleteCategory", categoryId: id }),
    ).rejects.toThrow(/Ngừng/);
    await execute(user, 3, {
      type: "clearMonthly",
      categoryId: id,
      month: "2027-01",
    });
    await expect(
      execute(user, 4, { type: "deleteCategory", categoryId: id }),
    ).rejects.toThrow(/Ngừng/);
    await execute(user, 4, {
      type: "clearMonthly",
      categoryId: id,
      month: "2026-12",
    });
    const before = (await readIncomeView(repository, user, 2027, clock)).book!;
    await execute(user, 5, { type: "deleteCategory", categoryId: id });
    const after = await readIncomeView(repository, user, 2027, clock);
    expect(after.rows).toEqual([]);
    expect(after.book!.monthly).toEqual([]);
    expect(after.book!.categories[0].deleted).toBe(true);
    expect(after.book!.audit.slice(0, -1)).toEqual(before.audit);
    expect(after.book!.audit.at(-1)?.action).toBe("deleteCategory");
    expect((await readIncomeView(repository, user, 2026, clock)).rows).toEqual(
      [],
    );
  });
  it("rejects a stale deletion after another session records a receipt", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id));
    await expect(
      execute(user, 1, { type: "deleteCategory", categoryId: id }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    await expect(
      execute(user, 2, { type: "deleteCategory", categoryId: id }),
    ).rejects.toThrow(/Ngừng/);
    expect(
      (await readIncomeView(repository, user, 2027, clock)).book!.categories[0]
        .deleted,
    ).toBe(false);
  });
  it("preserves names and receipts after a stop and rolls over without duplicating money", async () => {
    const { user, id } = await initialized();
    await execute(user, 1, monthly(id));
    await execute(user, 2, {
      type: "configureCategory",
      categoryId: id,
      month: "2027-02",
      name: "Lương mới",
      description: "Mới",
    });
    await execute(user, 3, monthly(id, "2027-03", "3"));
    await execute(user, 4, {
      type: "stopCategory",
      categoryId: id,
      month: "2027-02",
    });
    const v = await readIncomeView(repository, user, 2027, clock);
    expect(v.rows.map((r) => [r.month, r.name, r.amount])).toEqual([
      ["2027-01", "Lương", "9007199254740993"],
      ["2027-03", "Lương mới", "3"],
    ]);
    expect((await readIncomeView(repository, user, 2028, clock)).rows).toEqual(
      [],
    );
  });
});
