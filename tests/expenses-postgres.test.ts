import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  postgresExpenseRepository,
  transactionAdapter,
} from "../src/server/expense-repository";
import type { ExpenseRepository } from "../src/application/expenses";
import {
  readExpenseView,
  runExpenseCommand,
} from "../src/application/expenses";
import type { ExpenseAction } from "../src/domain/expenses/schema";

const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 });
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 6,
  prepare: false,
});
const repository = postgresExpenseRepository(sql);
const clock = { today: "2027-01-15", now: "2027-01-15T09:00:00.000Z" };
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
const execute = (
  user: string,
  version: number,
  action: ExpenseAction,
  id = randomUUID(),
  preview = false,
) =>
  runExpenseCommand(
    repository,
    user,
    { id, expectedVersion: version, action },
    clock,
    preview,
  );
async function initialized() {
  const user = await owner();
  await execute(user, 0, { type: "initialize", start: "2026-12" });
  return user;
}
async function jar(user: string, kind: "monthly" | "accumulation" = "monthly") {
  const id = randomUUID();
  await execute(user, 1, {
    type: "createJar",
    id,
    kind,
    start: "2026-12",
    opening: "300000",
    name: "Test",
    description: "",
    method: "Tiền mặt",
    group: "Gia đình",
    amount: "2000000",
  });
  return id;
}
async function asUser<T>(
  user: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user })}, true)`;
    return fn(tx);
  });
}
afterAll(async () => {
  await sql.end();
  await admin.end();
});
describe("PostgreSQL transactions, retry, concurrency and owner isolation", () => {
  it.each([["brand_key", "icon_key"], ["brand_key"], ["icon_key"]])(
    "keeps existing expenses usable without visual columns %j",
    async (...columns) => {
      const user = await initialized();
      const labelId = randomUUID();
      await execute(user, 1, {
        type: "upsertLabel",
        id: labelId,
        kind: "method",
        name: "Tiền mặt",
      });
      const rollback = new Error("Rollback schema regression fixture");
      try {
        await admin.begin(async (tx) => {
          for (const column of columns)
            await tx.unsafe(
              `alter table public.expense_labels drop column ${column}`,
            );
          await tx.unsafe("set local session authorization expense_api");
          await tx.unsafe("set local role authenticated");
          await tx.unsafe("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify({ sub: user, role: "authenticated" }),
          ]);
          const legacy: ExpenseRepository = {
            transaction: async (owner, fn) => {
              expect(owner).toBe(user);
              return fn(transactionAdapter(tx, owner));
            },
          };
          const view = await readExpenseView(legacy, user, clock);
          expect(view.book?.labels).toEqual([
            {
              id: labelId,
              kind: "method",
              name: "Tiền mặt",
              brandKey: null,
              iconKey: null,
            },
          ]);
          const run = (version: number, action: ExpenseAction) =>
            runExpenseCommand(
              legacy,
              user,
              { id: randomUUID(), expectedVersion: version, action },
              clock,
            );
          await run(2, {
            type: "upsertLabel",
            id: labelId,
            kind: "method",
            name: "Ví tiền mặt",
          });
          await run(3, {
            type: "createJar",
            id: randomUUID(),
            kind: "monthly",
            start: "2026-12",
            opening: "0",
            name: "Sinh hoạt",
            description: "",
            method: "Ví tiền mặt",
            group: "Gia đình",
            amount: "2000000",
          });
          const before = await readExpenseView(legacy, user, clock);
          for (const metadata of [
            { brandKey: "momo" },
            { iconKey: "wallet" },
          ] as const) {
            const commandId = randomUUID();
            await expect(
              runExpenseCommand(
                legacy,
                user,
                {
                  id: commandId,
                  expectedVersion: 4,
                  action: {
                    type: "upsertLabel",
                    id: labelId,
                    kind: "method",
                    name: "MoMo",
                    ...metadata,
                  },
                },
                clock,
              ),
            ).rejects.toMatchObject({
              status: 503,
              code: "LABEL_VISUALS_MIGRATION_REQUIRED",
            });
            expect(await readExpenseView(legacy, user, clock)).toEqual(before);
            expect(
              await transactionAdapter(tx, user).command(commandId),
            ).toBeNull();
          }
          expect(before.book?.version).toBe(4);
          expect(before.book?.labels[0].name).toBe("Ví tiền mặt");
          expect(before.rows.length).toBeGreaterThan(0);
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      }
    },
  );
  it("persists visual metadata after migration, including across unrelated saves", async () => {
    const user = await initialized();
    const id = randomUUID();
    await execute(user, 1, {
      type: "upsertLabel",
      id,
      kind: "method",
      name: "MoMo",
      brandKey: "momo",
      iconKey: "wallet",
    });
    await execute(user, 2, {
      type: "upsertLabel",
      id: randomUUID(),
      kind: "group",
      name: "Gia đình",
    });
    expect(
      (await readExpenseView(repository, user, clock)).book?.labels.find(
        (l) => l.id === id,
      ),
    ).toMatchObject({ brandKey: "momo", iconKey: "wallet" });
    await execute(user, 3, {
      type: "upsertLabel",
      id,
      kind: "method",
      name: "Ví",
      brandKey: null,
      iconKey: null,
    });
    expect(
      (await readExpenseView(repository, user, clock)).book?.labels.find(
        (l) => l.id === id,
      ),
    ).toMatchObject({ brandKey: null, iconKey: null });
  });
  it("persists exact amounts and audit across independent connections", async () => {
    const user = await initialized();
    const id = await jar(user);
    await expect(
      execute(user, 2, {
        type: "editMonth",
        jarId: id,
        month: "2026-12",
        target: null,
        funding: "999999999999999999999999",
        extra: "0",
        closing: "0",
      }),
    ).rejects.toThrow(/giới hạn/);
    expect((await readExpenseView(repository, user, clock)).book?.version).toBe(
      2,
    );
    await execute(user, 2, {
      type: "editMonth",
      jarId: id,
      month: "2026-12",
      target: null,
      funding: "9007199254740993",
      extra: "0",
      closing: "100000",
    });
    const independent = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
      const view = await readExpenseView(
        postgresExpenseRepository(independent),
        user,
        clock,
      );
      expect(view.book?.inputs[0].funding).toBe("9007199254740993");
      expect(view.book?.audit).toHaveLength(3);
      expect(view.rows.find((r) => r.month === "2027-01")?.opening).toBe(
        "100000",
      );
    } finally {
      await independent.end();
    }
  });
  it("previews without writing tables or changing the version", async () => {
    const user = await initialized();
    const id = await jar(user);
    const result = await execute(
      user,
      2,
      {
        type: "editMonth",
        jarId: id,
        month: "2026-12",
        target: null,
        funding: null,
        extra: "0",
        closing: "500000",
      },
      randomUUID(),
      true,
    );
    expect(result.changes.some((r) => r.month === "2027-01")).toBe(true);
    const view = await readExpenseView(repository, user, clock);
    expect(view.book?.version).toBe(2);
    expect(view.book?.inputs).toHaveLength(0);
  });
  it("returns the original result for retries and rejects another payload under the same key", async () => {
    const user = await initialized();
    const id = await jar(user);
    const key = randomUUID();
    const action: ExpenseAction = {
      type: "editMonth",
      jarId: id,
      month: "2026-12",
      target: null,
      funding: null,
      extra: "100000",
      closing: "0",
    };
    const first = await execute(user, 2, action, key);
    expect(await execute(user, 2, action, key)).toEqual(first);
    expect(
      (await readExpenseView(repository, user, clock)).book?.audit,
    ).toHaveLength(3);
    await expect(
      execute(user, 2, { ...action, extra: "200000" }, key),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("serializes simultaneous retries into one mutation", async () => {
    const user = await initialized();
    const key = randomUUID();
    const action: ExpenseAction = {
      type: "upsertLabel",
      id: randomUUID(),
      kind: "method",
      name: "Ví",
    };
    const results = await Promise.all([
      execute(user, 1, action, key),
      execute(user, 1, action, key),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      (await readExpenseView(repository, user, clock)).book?.labels,
    ).toHaveLength(1);
  });
  it("rejects one competing version instead of overwriting it", async () => {
    const user = await initialized();
    const results = await Promise.allSettled([
      execute(user, 1, {
        type: "upsertLabel",
        id: randomUUID(),
        kind: "method",
        name: "A",
      }),
      execute(user, 1, {
        type: "upsertLabel",
        id: randomUUID(),
        kind: "method",
        name: "B",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    expect(
      (await readExpenseView(repository, user, clock)).book?.labels,
    ).toHaveLength(1);
  });
  it("does not reveal, mutate or attach another owner's jar", async () => {
    const a = await initialized();
    const id = await jar(a);
    const b = await initialized();
    expect(
      (await readExpenseView(repository, b, clock)).book?.jars,
    ).toHaveLength(0);
    await expect(
      execute(b, 1, {
        type: "editMonth",
        jarId: id,
        month: "2026-12",
        target: null,
        funding: null,
        extra: "1",
        closing: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      asUser(b, async (tx) => {
        await tx`insert into public.expense_month_inputs(owner_id,jar_id,month,extra) values(${b},${id},'2026-12',0)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    expect(
      await asUser(
        b,
        async (tx) => tx`select * from public.expense_jars where owner_id=${a}`,
      ),
    ).toHaveLength(0);
  });
  it("denies direct PostgREST-like access, even with the owner's sub", async () => {
    const user = await initialized();
    await jar(user);
    const result = await admin.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user })}, true)`;
      return tx`select * from public.expense_jars`;
    });
    expect(result).toHaveLength(0);
    await expect(
      admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user })}, true)`;
        await tx`insert into public.expense_books(owner_id,start_month,version) values(${randomUUID()},'2026-12',1)`;
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("rolls back partially saved data when recording the command fails", async () => {
    const user = await initialized();
    const key = randomUUID();
    await execute(
      user,
      1,
      {
        type: "upsertLabel",
        id: randomUUID(),
        kind: "group",
        name: "Existing",
      },
      key,
    );
    await expect(
      repository.transaction(user, async (tx) => {
        const book = (await tx.read())!;
        book.version++;
        book.labels.push({
          id: randomUUID(),
          kind: "group",
          name: "Must rollback",
        });
        await tx.save(book);
        await tx.remember(key, {
          fingerprint: "collision",
          result: { version: 99, changes: [] },
        });
      }),
    ).rejects.toMatchObject({ code: "23505" });
    const view = await readExpenseView(repository, user, clock);
    expect(view.book?.version).toBe(2);
    expect(view.book?.labels.map((l) => l.name)).toEqual(["Existing"]);
  });
  it("seals snapshots, prevents SQL unsealing, and permits new-year changes", async () => {
    const user = await initialized();
    const id = await jar(user, "accumulation");
    await execute(user, 2, { type: "closeYear", year: 2026 });
    const snapshot = (await readExpenseView(repository, user, clock)).book
      ?.years[0].snapshot;
    await expect(
      execute(user, 3, {
        type: "editMonth",
        jarId: id,
        month: "2026-12",
        target: null,
        funding: null,
        extra: "1",
        closing: null,
      }),
    ).rejects.toMatchObject({ code: "YEAR_CLOSED" });
    await execute(user, 3, {
      type: "editMonth",
      jarId: id,
      month: "2027-01",
      target: null,
      funding: null,
      extra: "100000",
      closing: null,
    });
    expect(
      (await readExpenseView(repository, user, clock)).book?.years[0].snapshot,
    ).toEqual(snapshot);
    await expect(
      asUser(user, async (tx) => {
        await tx`update public.expense_years set closed_at=null,snapshot=null where owner_id=${user} and year=2026`;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});

it("persists emoji metadata across reads without altering balances or overrides", async () => {
  const user = await initialized();
  const id = await jar(user);
  await execute(user, 2, {
    type: "editMonth",
    jarId: id,
    month: "2027-01",
    target: "2500000",
    funding: "1700000",
    extra: "400000",
    closing: "100000",
  });
  const before = await readExpenseView(repository, user, clock);
  const action = {
    type: "setJarEmoji" as const,
    jarId: id,
    month: "2027-01",
    emoji: "🌱" as const,
  };
  const requestId = randomUUID();
  await execute(user, 3, action, requestId);
  await execute(user, 3, action, requestId);
  const after = await readExpenseView(repository, user, clock);
  expect(after.book?.version).toBe(4);
  expect(after.book?.inputs).toEqual(before.book?.inputs);
  expect(after.rows.map(({ emoji, ...r }) => r)).toEqual(
    before.rows.map(({ emoji, ...r }) => r),
  );
  expect(after.rows.find((r) => r.month === "2027-01")?.emoji).toBe("🌱");
  expect(after.rows.find((r) => r.month === "2026-12")?.emoji).toBeNull();
  expect(after.book?.audit.at(-1)?.action).toBe("setJarEmoji");
});
