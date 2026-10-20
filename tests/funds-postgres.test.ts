import { validateFundBook } from "../src/domain/funds/validate";
import { afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresFundRepository } from "../src/server/fund-repository";
import {
  readFundView,
  runFundCommand,
  type FundRepository,
} from "../src/application/funds";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { runExpenseCommand } from "../src/application/expenses";
import { actionSchema, type FundAction } from "../src/domain/funds/schema";
import { postgresDataRepository } from "../src/server/data-repository";
import { backupBooks, validateBackup } from "../src/domain/backup/validate";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 }),
  sql = postgres(process.env.TEST_DATABASE_URL!, { max: 6, prepare: false }),
  repo = postgresFundRepository(sql),
  data = postgresDataRepository(sql),
  clock = { today: "2026-10-19", now: "2026-10-19T10:00:00.000Z" },
  profile = { full_name: "", birth_date: "", gender: "" as const };
const run = (
  owner: string,
  version: number,
  action: unknown,
  id = randomUUID(),
  preview = false,
  repository: FundRepository = repo,
) =>
  runFundCommand(
    repository,
    owner,
    { id, expectedVersion: version, action: actionSchema.parse(action) },
    clock,
    preview,
  );
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
async function setup() {
  const user = await owner(),
    jar = randomUUID(),
    location = randomUUID(),
    other = randomUUID(),
    er = postgresExpenseRepository(sql);
  await runExpenseCommand(
    er,
    user,
    {
      id: randomUUID(),
      expectedVersion: 0,
      action: { type: "initialize", start: "2026-10" },
    },
    clock,
  );
  await runExpenseCommand(
    er,
    user,
    {
      id: randomUUID(),
      expectedVersion: 1,
      action: {
        type: "createJar",
        id: jar,
        kind: "monthly",
        start: "2026-10",
        opening: "0",
        name: "Sinh hoạt",
        description: "",
        method: "Tiền mặt",
        group: "",
        amount: "9000000",
      },
    },
    clock,
  );
  const configure: FundAction = {
    type: "configure",
    id: randomUUID(),
    jarIds: [jar],
    expectedExpenseVersion: 2,
    sourceMonth: "2026-10",
    applyLiving: true,
    multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
    priority: ["rainy_day", "emergency", "sinking"],
  };
  await run(user, 0, configure);
  await run(user, 1, {
    type: "saveLocation",
    id: location,
    name: "Ngân hàng",
    active: true,
  });
  await run(user, 2, {
    type: "saveLocation",
    id: other,
    name: "Tiền mặt",
    active: true,
  });
  return { user, jar, location, other, configure };
}
const deposit = (location: string, amount = "9007199254740993") => ({
  type: "postTransaction",
  transaction: {
    id: randomUUID(),
    kind: "deposit",
    fundId: "emergency",
    locationId: location,
    amount,
    occurredAt: "2026-10-01T01:00:00Z",
    note: "",
  },
});
async function asUser<T>(
  user: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: user, role: "authenticated" })},true)`;
    return fn(tx);
  });
}
afterAll(async () => {
  await sql.end();
  await admin.end();
});
describe("Fund PostgreSQL", () => {
  it("GET does not initialize; preview never writes and retries settle once", async () => {
    const fresh = await owner();
    expect((await readFundView(repo, fresh, clock)).book).toBeNull();
    expect((await data.status(fresh)).empty).toBe(true);
    const s = await setup(),
      id = randomUUID(),
      action = deposit(s.location);
    expect((await run(s.user, 3, action, id, true)).after.total).toBe(
      "9007199254740993",
    );
    expect((await readFundView(repo, s.user, clock)).book?.version).toBe(3);
    expect((await readFundView(repo, s.user, clock)).sourceChanged).toBe(false);
    const result = await run(s.user, 3, action, id);
    expect(await run(s.user, 3, action, id)).toEqual(result);
    await expect(
      run(s.user, 3, deposit(s.location, "1"), id),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("serializes versions and rejects stale expense source before save", async () => {
    const s = await setup(),
      results = await Promise.allSettled([
        run(s.user, 3, deposit(s.location, "100")),
        run(s.user, 3, deposit(s.location, "200")),
      ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    await runExpenseCommand(
      postgresExpenseRepository(sql),
      s.user,
      {
        id: randomUUID(),
        expectedVersion: 2,
        action: {
          type: "configureJar",
          jarId: s.jar,
          month: "2026-10",
          name: "Sinh hoạt",
          description: "",
          method: "Tiền mặt",
          group: "",
          amount: "10000000",
        },
      },
      clock,
    );
    await expect(
      run(s.user, 4, { ...s.configure, id: randomUUID() }),
    ).rejects.toMatchObject({ code: "EXPENSE_VERSION_CONFLICT" });
    expect(
      (await readFundView(repo, s.user, clock)).state.funds[0].target,
    ).toBe("54000000");
  });
  it("transfers atomically across funds, preserves revisions and rolls back late failures", async () => {
    const s = await setup(),
      posted = deposit(s.location, "100");
    await run(s.user, 3, posted);
    const transfer = {
      type: "postTransaction",
      transaction: {
        id: randomUUID(),
        kind: "transfer",
        fundId: "emergency",
        locationId: s.location,
        toFundId: "rainy_day",
        toLocationId: s.other,
        amount: "40",
        occurredAt: "2026-10-02T00:00:00Z",
        note: "Phân bổ lại",
      },
    };
    const broken: FundRepository = {
      transaction: (owner, fn) =>
        repo.transaction(owner, (tx) =>
          fn({
            ...tx,
            remember: async () => {
              throw new Error("Injected failure");
            },
          }),
        ),
    };
    await expect(
      run(s.user, 4, transfer, randomUUID(), false, broken),
    ).rejects.toThrow(/Injected/);
    expect((await readFundView(repo, s.user, clock)).state.total).toBe("100");
    expect((await readFundView(repo, s.user, clock)).book?.version).toBe(4);
    await run(s.user, 4, transfer);
    const state = (await readFundView(repo, s.user, clock)).state;
    expect(state.funds.map((f) => f.balance)).toEqual(["60", "40", "0"]);
    expect(state.contributed).toBe("100");
    await expect(
      run(s.user, 5, {
        type: "reviseTransaction",
        transactionId: posted.transaction.id,
        replacement: null,
        reason: "Nhầm",
      }),
    ).rejects.toThrow(/Không đủ/);
    await run(s.user, 5, {
      type: "reviseTransaction",
      transactionId: transfer.transaction.id,
      replacement: { ...transfer.transaction, amount: "30" },
      reason: "Đối soát",
    });
    expect(
      (await readFundView(repo, s.user, clock)).book?.revisions,
    ).toHaveLength(3);
    await expect(
      admin`update funds_transactions set data=data where owner_id=${s.user}`,
    ).rejects.toThrow(/append only/);
    await expect(
      admin`delete from funds_configurations where owner_id=${s.user}`,
    ).rejects.toThrow(/append only/);
  });
  it("isolates owners, blocks raw runtime/PostgREST sessions and enforces composite owner references", async () => {
    const a = await setup(),
      b = await setup();
    await run(a.user, 3, deposit(a.location, "100"));
    expect((await readFundView(repo, b.user, clock)).state.total).toBe("0");
    expect(
      await asUser(
        b.user,
        (tx) => tx`select * from funds_books where owner_id=${a.user}`,
      ),
    ).toHaveLength(0);
    await expect(sql`select * from funds_books`).rejects.toThrow();
    const forged = deposit(a.location, "1");
    await expect(run(b.user, 3, forged)).rejects.toThrow(/Nơi giữ/);
    await expect(
      asUser(b.user, (tx) =>
        tx.unsafe(
          "insert into funds_transactions(owner_id,id,root_id,sequence,fund_id,location_id,data) values($1,'forged','forged',99,'emergency',$2,'{}')",
          [b.user, a.location],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
    expect(
      await admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: a.user })},true)`;
        return tx`select * from funds_books`;
      }),
    ).toHaveLength(0);
  });
  it("round trips Fund V2, revisions, configurations and original V1 files", async () => {
    const s = await setup(),
      t = deposit(s.location, "100");
    await run(s.user, 3, t);
    await run(s.user, 4, {
      type: "reviseTransaction",
      transactionId: t.transaction.id,
      replacement: { ...t.transaction, amount: "110" },
      reason: "Sửa",
    });
    validateFundBook((await readFundView(repo, s.user, clock)).book!);
    const backup = await data.backup(s.user, profile),
      target = await owner();
    expect(backup.schemaVersion).toBe(2);
    expect(backup.tables.funds_transactions).toHaveLength(2);
    await data.import(target, randomUUID(), backup);
    expect((await data.backup(target, profile)).tables).toEqual(backup.tables);
    expect(backupBooks(backup).funds?.version).toBe(5);
    const corrupted = structuredClone(backup);
    corrupted.tables.funds_transactions[0].data.transaction!.amount = "999";
    expect(() => validateBackup(corrupted)).toThrow(/quỹ/);
    const legacy = {
        ...backup,
        schemaVersion: 1,
        tables: Object.fromEntries(
          Object.entries(backup.tables).filter(
            ([t]) => !t.startsWith("funds_"),
          ),
        ),
      },
      oldTarget = await owner();
    await data.import(oldTarget, randomUUID(), legacy);
    expect((await readFundView(repo, oldTarget, clock)).book).toBeNull();
  });
  it("counts Fund-only accounts as occupied and stops when migration is missing", async () => {
    const only = await owner();
    await admin`insert into funds_books(owner_id,version) values(${only},1)`;
    expect((await data.status(only)).empty).toBe(false);
    const s = await setup(),
      backup = await data.backup(s.user, profile);
    await expect(data.import(only, randomUUID(), backup)).rejects.toMatchObject(
      { code: "ACCOUNT_NOT_EMPTY" },
    );
    await admin`alter table funds_books rename to test_missing_funds_books`;
    try {
      await expect(readFundView(repo, s.user, clock)).rejects.toMatchObject({
        code: "FUNDS_MIGRATION_REQUIRED",
      });
      await expect(data.backup(s.user, profile)).rejects.toMatchObject({
        code: "SCHEMA_NOT_READY",
      });
    } finally {
      await admin`alter table test_missing_funds_books rename to funds_books`;
    }
  });
});
