import { afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { readSavingsView, runSavingsCommand } from "../src/application/savings";
import { actionSchema } from "../src/domain/savings/schema";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 });
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 6,
  prepare: false,
});
const repo = postgresSavingsRepository(sql),
  clock = { today: "2027-03-15", now: "2027-03-15T00:00:00Z" };
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
const command = (
  user: string,
  version: number,
  action: unknown,
  id = randomUUID(),
  preview = false,
) =>
  runSavingsCommand(
    repo,
    user,
    { id, expectedVersion: version, action: actionSchema.parse(action) },
    clock,
    preview,
  );
async function setup() {
  const user = await owner(),
    category = randomUUID();
  await command(user, 0, {
    type: "createCategory",
    id: category,
    start: "2026-12",
    kind: "cash",
    name: "Ví",
    unit: null,
  });
  return { user, category };
}
const deposit = (categoryId: string, amount = "9007199254740993") => ({
  type: "postTransaction",
  transaction: {
    id: randomUUID(),
    kind: "deposit",
    date: "2026-12-01",
    categoryId,
    amount,
  },
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
describe("Savings PostgreSQL", () => {
  it("persists contract renewal references and cash settlement in one commit", async () => {
    const { user, category } = await setup(),
      bank = randomUUID(),
      contract = randomUUID(),
      renewed = randomUUID();
    await command(user, 1, {
      type: "createCategory",
      id: bank,
      start: "2026-12",
      kind: "deposit",
      name: "Ngân hàng",
    });
    await command(user, 2, {
      type: "postTransaction",
      transaction: {
        id: contract,
        kind: "openingDeposit",
        categoryId: bank,
        date: "2026-12-01",
        name: "Sổ cũ",
        maturity: "2027-01-01",
        amount: "100000000",
      },
    });
    await command(user, 3, {
      type: "postTransaction",
      transaction: {
        id: renewed,
        kind: "rollover",
        categoryId: bank,
        date: "2027-01-01",
        contractId: contract,
        name: "Sổ mới",
        maturity: "2027-04-01",
        interest: "1000000",
        reinvestInterest: "500000",
        cashCategoryId: category,
      },
    });
    const v = await readSavingsView(repo, user, clock.today, clock);
    expect(v.state.total).toBe("101000000");
    expect(v.state.contracts.find((c) => c.id === renewed)?.previousId).toBe(
      contract,
    );
    expect(v.state.positions.find((p) => p.id === category)?.value).toBe(
      "500000",
    );
  });
  it("persists exact values and revision history across connections; snapshots remain immutable", async () => {
    const { user, category } = await setup();
    const d = deposit(category);
    await command(user, 1, d);
    await command(user, 2, { type: "closeMonth", month: "2026-12" });
    await command(user, 3, {
      type: "reopenMonth",
      month: "2026-12",
      reason: "Đối soát",
    });
    await command(user, 4, {
      type: "reviseTransaction",
      transactionId: d.transaction.id,
      replacement: { ...d.transaction, amount: "123" },
      reason: "Sửa số",
    });
    const independent = postgres(process.env.TEST_DATABASE_URL!, {
      max: 1,
      prepare: false,
    });
    try {
      const v = await readSavingsView(
        postgresSavingsRepository(independent),
        user,
        clock.today,
        clock,
      );
      expect(v.state.total).toBe("123");
      expect(v.book?.revisions).toHaveLength(2);
      expect(v.book?.closes[0].snapshot?.total).toBe("9007199254740993");
    } finally {
      await independent.end();
    }
    await expect(
      asUser(
        user,
        (tx) =>
          tx`delete from public.savings_transactions where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
    await expect(
      asUser(
        user,
        (tx) =>
          tx`update public.savings_closes set data='{}' where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
    await expect(
      asUser(
        user,
        (tx) => tx`delete from public.savings_audit where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
  });
  it("preview never writes; retry returns original result and rejects mismatched reuse", async () => {
    const { user, category } = await setup(),
      id = randomUUID(),
      action = deposit(category, "100");
    const p = await command(user, 1, action, id, true);
    expect(p.after.total).toBe("100");
    expect(
      (await readSavingsView(repo, user, clock.today, clock)).state.total,
    ).toBe("0");
    const r = await command(user, 1, action, id);
    expect(await command(user, 1, action, id)).toEqual(r);
    await expect(
      command(user, 1, deposit(category, "1"), id),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(
      asUser(
        user,
        (tx) => tx`delete from public.savings_commands where owner_id=${user}`,
      ),
    ).rejects.toThrow(/append only/);
  });
  it("serializes concurrent writes and rolls back invalid transactions", async () => {
    const { user, category } = await setup();
    const results = await Promise.allSettled([
      command(user, 1, deposit(category, "100")),
      command(user, 1, deposit(category, "200")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    const before = await readSavingsView(repo, user, clock.today, clock);
    await expect(
      command(user, 2, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          date: "2026-12-02",
          categoryId: category,
          kind: "withdraw",
          amount: "999",
        },
      }),
    ).rejects.toThrow(/Không đủ tiền/);
    expect(
      (await readSavingsView(repo, user, clock.today, clock)).book?.version,
    ).toBe(before.book?.version);
  });
  it("isolates owners and rejects cross-owner relations in API and database", async () => {
    const a = await setup(),
      b = await setup();
    await command(a.user, 1, deposit(a.category, "100"));
    expect(
      (await readSavingsView(repo, b.user, clock.today, clock)).state.total,
    ).toBe("0");
    await expect(command(b.user, 1, deposit(a.category, "1"))).rejects.toThrow(
      /không tồn tại/,
    );
    const rows = await asUser(
      b.user,
      (tx) =>
        tx`select * from public.savings_transactions where owner_id=${a.user}`,
    );
    expect(rows).toHaveLength(0);
    await expect(
      asUser(
        b.user,
        (tx) =>
          tx`insert into public.savings_transactions(owner_id,id,root_id,sequence,category_id,data) values(${b.user},${randomUUID()},${randomUUID()},2,${a.category},'{}')`,
      ),
    ).rejects.toThrow(/foreign key/);
  });
  it("persists gold allocations and contractual references with ownership constraints", async () => {
    const { user, category } = await setup(),
      gold = randomUUID(),
      lot = randomUUID();
    await command(user, 1, {
      type: "createCategory",
      id: gold,
      start: "2026-12",
      kind: "gold",
      unit: "chỉ",
      name: "Vàng",
    });
    await command(user, 2, {
      type: "postTransaction",
      transaction: {
        id: lot,
        date: "2026-12-01",
        categoryId: gold,
        kind: "openingGold",
        amount: "100000000",
        quantity: "1",
        unitPrice: "100000000",
      },
    });
    await command(user, 3, {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        date: "2027-01-01",
        categoryId: gold,
        kind: "sellGold",
        allocations: [{ lotId: lot, quantity: "0.5" }],
        unitPrice: "130000000",
        fee: "1000000",
        cashCategoryId: category,
      },
    });
    const v = await readSavingsView(repo, user, clock.today, clock);
    expect(v.state.effects.at(-1)?.realized).toBe("14000000");
    expect(
      await asUser(user, (tx) => tx`select * from public.savings_allocations`),
    ).toHaveLength(1);
  });
});
