import { afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import {
  readInvestmentView,
  runInvestmentCommand,
  type InvestmentRepository,
} from "../src/application/investments";
import { actionSchema } from "../src/domain/investments/schema";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 }),
  sql = postgres(process.env.TEST_DATABASE_URL!, { max: 6, prepare: false }),
  repo = postgresInvestmentRepository(sql),
  clock = { today: "2027-03-15", now: "2027-03-15T00:00:00Z" };
const command = (
  owner: string,
  version: number,
  action: unknown,
  id = randomUUID(),
  preview = false,
  repository: InvestmentRepository = repo,
) =>
  runInvestmentCommand(
    repository,
    owner,
    { id, expectedVersion: version, action: actionSchema.parse(action) },
    clock,
    preview,
  );
async function setup() {
  const owner = randomUUID(),
    wallet = randomUUID(),
    asset = randomUUID();
  await admin`insert into auth.users(id) values(${owner})`;
  await command(owner, 0, {
    type: "createCategory",
    id: wallet,
    start: "2026-12-01",
    kind: "cash",
    name: "TCBS",
  });
  await command(owner, 1, {
    type: "createCategory",
    id: asset,
    start: "2026-12-01",
    kind: "investment",
    name: "Cổ phiếu",
  });
  return { owner, wallet, asset };
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
  owner: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: owner })},true)`;
    return fn(tx);
  });
}
afterAll(async () => {
  await sql.end();
  await admin.end();
});
describe("Investment PostgreSQL", () => {
  it("persists purchase and sale settlement together, including exact basis and valuation history", async () => {
    const s = await setup();
    await command(s.owner, 2, deposit(s.wallet, "100000000"));
    const buy = {
      id: randomUUID(),
      kind: "buy",
      date: "2026-12-02",
      categoryId: s.asset,
      cashCategoryId: s.wallet,
      amount: "50000000",
      value: "55000000",
    };
    await command(s.owner, 3, { type: "postTransaction", transaction: buy });
    await command(s.owner, 4, {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "sell",
        date: "2027-01-01",
        categoryId: s.asset,
        cashCategoryId: s.wallet,
        amount: "30000000",
        cost: "25000000",
        fee: "200000",
        value: "30000000",
      },
    });
    const v = await readInvestmentView(repo, s.owner, clock.today, clock);
    expect(v.state.positions.find((p) => p.id === s.wallet)?.cash).toBe(
      "79800000",
    );
    expect(v.state.positions.find((p) => p.id === s.asset)).toMatchObject({
      cost: "25000000",
      value: "30000000",
      realized: "4800000",
    });
    await command(s.owner, 5, {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "valuation",
        date: "2027-02-01",
        categoryId: s.asset,
        value: "33000000",
      },
    });
    const valuation = (
      await readInvestmentView(repo, s.owner, clock.today, clock)
    ).book!.revisions.at(-1)!;
    await command(s.owner, 6, {
      type: "reviseTransaction",
      transactionId: valuation.rootId,
      replacement: { ...valuation.transaction!, value: "34000000" },
      reason: "Đối soát",
    });
    const v2 = await readInvestmentView(repo, s.owner, clock.today, clock);
    expect(v2.state.positions.find((p) => p.id === s.asset)?.value).toBe(
      "34000000",
    );
    expect(
      v2.book?.revisions.filter((r) => r.rootId === valuation.rootId),
    ).toHaveLength(2);
    expect(
      await asUser(
        s.owner,
        (tx) => tx`select * from public.investments_valuations`,
      ),
    ).toHaveLength(2);
  });
  it("preview never writes; retries are idempotent even with the original stale version", async () => {
    const s = await setup(),
      id = randomUUID(),
      a = deposit(s.wallet);
    const p = await command(s.owner, 2, a, id, true);
    expect(p.after.positions.find((p) => p.id === s.wallet)?.cash).toBe(
      "9007199254740993",
    );
    expect(
      (await readInvestmentView(repo, s.owner, clock.today, clock)).book
        ?.version,
    ).toBe(2);
    const saved = await command(s.owner, 2, a, id);
    expect(await command(s.owner, 2, a, id)).toEqual(saved);
    await expect(
      command(s.owner, 2, deposit(s.wallet, "1"), id),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("serializes competing sessions and rejects invalid downstream balances", async () => {
    const s = await setup();
    const results = await Promise.allSettled([
      command(s.owner, 2, deposit(s.wallet, "100")),
      command(s.owner, 2, deposit(s.wallet, "200")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    await expect(
      command(s.owner, 3, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "buy",
          date: "2026-12-02",
          categoryId: s.asset,
          cashCategoryId: s.wallet,
          amount: "999",
          value: "1000",
        },
      }),
    ).rejects.toThrow(/Không đủ tiền/);
    expect(
      (await readInvestmentView(repo, s.owner, clock.today, clock)).book
        ?.version,
    ).toBe(3);
  });
  it("rolls back a failure after ledger save, including cash and audit", async () => {
    const s = await setup();
    await command(s.owner, 2, deposit(s.wallet, "100"));
    const broken: InvestmentRepository = {
      transaction: (owner, fn) =>
        repo.transaction(owner, (tx) =>
          fn({
            ...tx,
            remember: async () => {
              throw new Error("Injected persistence failure");
            },
          }),
        ),
    };
    await expect(
      command(
        s.owner,
        3,
        {
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            kind: "buy",
            date: "2026-12-02",
            categoryId: s.asset,
            cashCategoryId: s.wallet,
            amount: "50",
            value: "60",
          },
        },
        randomUUID(),
        false,
        broken,
      ),
    ).rejects.toThrow(/Injected/);
    const v = await readInvestmentView(repo, s.owner, clock.today, clock);
    expect(v.book?.version).toBe(3);
    expect(v.book?.revisions).toHaveLength(1);
    expect(v.state.positions.find((p) => p.id === s.wallet)?.cash).toBe("100");
  });
  it("protects history and isolates two owners and cross-owner foreign keys", async () => {
    const a = await setup(),
      b = await setup();
    await command(a.owner, 2, deposit(a.wallet));
    expect(
      await asUser(
        b.owner,
        (tx) =>
          tx`select * from public.investments_transactions where owner_id=${a.owner}`,
      ),
    ).toHaveLength(0);
    await expect(command(b.owner, 2, deposit(a.wallet, "1"))).rejects.toThrow(
      /không tồn tại/,
    );
    const id = randomUUID();
    await expect(
      asUser(
        b.owner,
        (tx) =>
          tx`insert into public.investments_transactions(owner_id,id,root_id,sequence,category_id,data) values(${b.owner},${id},${id},3,${a.wallet},'{}')`,
      ),
    ).rejects.toThrow(/foreign key/);
    for (const table of [
      "investments_transactions",
      "investments_audit",
      "investments_commands",
    ])
      await expect(
        asUser(a.owner, (tx) =>
          tx.unsafe(`delete from public.${table} where owner_id=$1`, [a.owner]),
        ),
      ).rejects.toThrow(/append only/);
  });
});
