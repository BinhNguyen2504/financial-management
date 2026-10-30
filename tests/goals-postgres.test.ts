import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresGoalRepository } from "../src/server/goal-repository";
import { postgresDataRepository } from "../src/server/data-repository";
import { postgresSavingsRepository } from "../src/server/savings-repository";
import { runSavingsCommand } from "../src/application/savings";
import { actionSchema as savingsAction } from "../src/domain/savings/schema";
import { readGoalView, runGoalCommand } from "../src/application/goals";
import { actionSchema, type GoalAction } from "../src/domain/goals/schema";
import { validateBackup } from "../src/domain/backup/validate";
import { setTransactionOwner } from "../src/server/owner-transaction";
import { runExpenseCommand } from "../src/application/expenses";
import { postgresExpenseRepository } from "../src/server/expense-repository";
import { runFundCommand } from "../src/application/funds";
import { postgresFundRepository } from "../src/server/fund-repository";
import { runInvestmentCommand } from "../src/application/investments";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import { actionSchema as investmentAction } from "../src/domain/investments/schema";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 2 }),
  sql = postgres(process.env.TEST_DATABASE_URL!, { max: 6, prepare: false }),
  repo = postgresGoalRepository(sql),
  data = postgresDataRepository(sql),
  clock = { today: "2026-10-30", now: "2026-10-30T10:00:00.000Z" },
  profile = { full_name: "", birth_date: "", gender: "" as const };
afterAll(async () => {
  await sql.end();
  await admin.end();
});
async function owner() {
  const id = randomUUID();
  await admin`insert into auth.users(id) values(${id})`;
  return id;
}
const create = (source?: string): GoalAction => ({
  type: "saveGoal",
  goal: {
    id: randomUUID(),
    name: "Mua xe",
    note: "",
    purpose: "spending",
    mode: source ? "linked" : "ledger",
    basis: "value",
    target: "100",
    deadline: null,
    monthly: "0",
    links: source ? [{ kind: "savings", sourceId: source, share: 10000 }] : [],
  },
});
async function run(
  user: string,
  action: GoalAction,
  preview = false,
  id = randomUUID(),
) {
  const v = await readGoalView(repo, user, clock);
  return runGoalCommand(
    repo,
    user,
    {
      id,
      expectedVersion: v.book?.version ?? 0,
      expectedSources: v.sources.versions,
      action,
    },
    clock,
    preview,
  );
}
async function savings(user: string, category = randomUUID()) {
  await runSavingsCommand(
    postgresSavingsRepository(sql),
    user,
    {
      id: randomUUID(),
      expectedVersion: 0,
      action: savingsAction.parse({
        type: "createCategory",
        id: category,
        start: "2026-10",
        kind: "cash",
        name: "Ví mục tiêu",
        unit: null,
      }),
    },
    clock,
  );
  await runSavingsCommand(
    postgresSavingsRepository(sql),
    user,
    {
      id: randomUUID(),
      expectedVersion: 1,
      action: savingsAction.parse({
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          kind: "deposit",
          date: "2026-10-01",
          categoryId: category,
          amount: "100",
        },
      }),
    },
    clock,
  );
  return category;
}
describe("Goals PostgreSQL", () => {
  it("keeps repeated ledger commands compact enough for portable backups", async () => {
    const user = await owner(),
      action = create();
    if (action.type !== "saveGoal") throw Error();
    await run(user, action);
    for (let i = 0; i < 25; i++)
      await run(user, {
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          goalId: action.goal.id,
          kind: "deposit",
          toGoalId: null,
          amount: "1",
          occurredAt: clock.now,
          note: "Khoản góp nhỏ",
        },
      });
    const backup = await data.backup(user, profile);
    expect(backup.tables.goals_commands).toHaveLength(26);
    expect(Buffer.byteLength(JSON.stringify(backup))).toBeLessThan(200000);
    expect((await readGoalView(repo, user, clock)).states[0].balance).toBe(
      "25",
    );
  });
  it("restores Safety fund sources before goal links without changing fund balances", async () => {
    const user = await owner(),
      jar = randomUUID(),
      expenses = postgresExpenseRepository(sql);
    await runExpenseCommand(
      expenses,
      user,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: { type: "initialize", start: "2026-10" },
      },
      clock,
    );
    await runExpenseCommand(
      expenses,
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
          amount: "100",
        },
      },
      clock,
    );
    await runFundCommand(
      postgresFundRepository(sql),
      user,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: {
          type: "configure",
          id: randomUUID(),
          jarIds: [jar],
          expectedExpenseVersion: 2,
          sourceMonth: "2026-10",
          applyLiving: true,
          multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
          priority: ["emergency", "rainy_day", "sinking"],
        },
      },
      clock,
    );
    const action = create();
    if (action.type !== "saveGoal") throw Error();
    action.goal.mode = "linked";
    action.goal.purpose = "milestone";
    action.goal.links = [
      { kind: "funds", sourceId: "emergency", share: 10000 },
    ];
    await run(user, action);
    const backup = await data.backup(user, profile),
      target = await owner();
    await data.import(target, randomUUID(), backup);
    expect((await readGoalView(repo, target, clock)).states[0].current).toBe(
      "0",
    );
    expect(
      (await data.backup(target, profile)).tables.funds_transactions,
    ).toEqual(backup.tables.funds_transactions);
  });
  it("reads investment capital and dated market value independently", async () => {
    const user = await owner(),
      asset = randomUUID(),
      investment = postgresInvestmentRepository(sql);
    await runInvestmentCommand(
      investment,
      user,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: investmentAction.parse({
          type: "createCategory",
          id: asset,
          kind: "investment",
          name: "Danh mục",
          start: "2026-09-01",
        }),
      },
      clock,
    );
    await runInvestmentCommand(
      investment,
      user,
      {
        id: randomUUID(),
        expectedVersion: 1,
        action: investmentAction.parse({
          type: "postTransaction",
          transaction: {
            id: randomUUID(),
            categoryId: asset,
            kind: "openingInvestment",
            date: "2026-09-01",
            cost: "100",
            value: "120",
          },
        }),
      },
      clock,
    );
    for (const basis of ["capital", "value"] as const) {
      const action = create();
      if (action.type !== "saveGoal") throw Error();
      Object.assign(action.goal, {
        name: basis,
        mode: "linked",
        purpose: "milestone",
        basis,
        links: [{ kind: "investments", sourceId: asset, share: 10000 }],
      });
      await run(user, action);
    }
    const v = await readGoalView(repo, user, clock);
    expect(v.sources.items[0]).toMatchObject({
      capital: "100",
      value: "120",
      valueDate: "2026-09-01",
      stale: true,
    });
    expect(
      v.states.map((s) => ({ current: s.current, stale: s.stale })),
    ).toEqual(
      v.book!.goals.map((g) =>
        g.basis === "capital"
          ? { current: "100", stale: false }
          : { current: "120", stale: true },
      ),
    );
  });
  it("prevents legacy maintenance deletes from orphaning goal sources", async () => {
    const user = await owner(),
      source = randomUUID();
    await runSavingsCommand(
      postgresSavingsRepository(sql),
      user,
      {
        id: randomUUID(),
        expectedVersion: 0,
        action: savingsAction.parse({
          type: "createCategory",
          id: source,
          start: "2026-10",
          kind: "cash",
          name: "Nguồn chưa góp",
          unit: null,
        }),
      },
      clock,
    );
    await run(user, create(source));
    await expect(
      admin`delete from public.savings_categories where owner_id=${user} and id=${source}`,
    ).rejects.toMatchObject({
      code: "23503",
      constraint_name: expect.stringContaining("goals_links"),
    });
    expect((await readGoalView(repo, user, clock)).sources.items).toHaveLength(
      1,
    );
  });
  it("GET and preview never initialize; command retries settle exactly once", async () => {
    const user = await owner(),
      action = create(),
      id = randomUUID();
    expect((await readGoalView(repo, user, clock)).book).toBeNull();
    const v = await readGoalView(repo, user, clock),
      command = {
        id,
        expectedVersion: 0,
        expectedSources: v.sources.versions,
        action,
      };
    await runGoalCommand(repo, user, command, clock, true);
    expect((await data.status(user)).empty).toBe(true);
    const result = await runGoalCommand(repo, user, command, clock);
    expect(await runGoalCommand(repo, user, command, clock)).toEqual(result);
    await expect(
      runGoalCommand(repo, user, { ...command, action: create() }, clock),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("serializes allocations and rejects a stale source version", async () => {
    const user = await owner(),
      source = await savings(user),
      v = await readGoalView(repo, user, clock),
      a = create(source),
      b = create(source);
    const results = await Promise.allSettled(
      [a, b].map((action) =>
        runGoalCommand(
          repo,
          user,
          {
            id: randomUUID(),
            expectedVersion: 0,
            expectedSources: v.sources.versions,
            action,
          },
          clock,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(run(user, b)).rejects.toThrow(/100%/);
    const current = await readGoalView(repo, user, clock);
    await expect(
      runGoalCommand(
        repo,
        user,
        {
          id: randomUUID(),
          expectedVersion: 1,
          expectedSources: { ...current.sources.versions, savings: 1 },
          action: {
            type: "setStatus",
            goalId: current.book!.goals[0].id,
            status: "completed",
            reason: "",
          },
        },
        clock,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_VERSION_CONFLICT" });
  });
  it("enforces RLS and same-owner source references at the database boundary", async () => {
    const a = await owner(),
      b = await owner(),
      source = await savings(a);
    const action = create();
    await run(b, action);
    expect((await readGoalView(repo, b, clock)).sources.items).toHaveLength(0);
    await expect(run(b, create(source))).rejects.toThrow(/sẵn sàng/);
    await expect(
      sql.begin(async (tx) => {
        await setTransactionOwner(tx, b);
        await tx`insert into public.goals_links(owner_id,id,goal_id,source_kind,source_id,data) values(${b},${randomUUID()},${action.type === "saveGoal" ? action.goal.id : ""},'savings',${source},'{}'::jsonb)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await sql.begin(async (tx) => {
      await setTransactionOwner(tx, a);
      expect(
        await tx`select * from public.goals_definitions where owner_id=${b}`,
      ).toHaveLength(0);
    });
  });
  it("round-trips all goal tables and source references through V3 backup", async () => {
    const user = await owner(),
      source = await savings(user);
    await run(user, create(source));
    const manual = create();
    await run(user, manual);
    if (manual.type !== "saveGoal") throw Error();
    await run(
      user,
      actionSchema.parse({
        type: "postTransaction",
        transaction: {
          id: randomUUID(),
          goalId: manual.goal.id,
          kind: "opening",
          toGoalId: null,
          amount: "999999999999999999999999",
          occurredAt: clock.now,
          note: "",
        },
      }),
    );
    const backup = await data.backup(user, profile);
    expect(backup.schemaVersion).toBe(3);
    expect(backup.tables.goals_links).toHaveLength(1);
    expect(() => validateBackup(backup)).not.toThrow();
    const restored = await owner();
    await data.import(restored, randomUUID(), backup);
    expect((await readGoalView(repo, restored, clock)).book).toEqual(
      (await readGoalView(repo, user, clock)).book,
    );
    const bad = structuredClone(backup);
    bad.tables.goals_definitions[0].data.target = "1";
    expect(() => validateBackup(bad)).toThrow();
  });
  it("resets all Goals and rejects drafts from the previous data generation", async () => {
    const user = await owner();
    await run(user, create());
    const prepared = await data.prepareReset(user, profile);
    expect(prepared.backup.tables.goals_books).toHaveLength(1);
    await data.reset(user, prepared.operationId, randomUUID());
    expect((await data.status(user)).empty).toBe(true);
    const old = postgresGoalRepository(sql, 0),
      v = await readGoalView(repo, user, clock);
    await expect(
      runGoalCommand(
        old,
        user,
        {
          id: randomUUID(),
          expectedVersion: 0,
          expectedSources: v.sources.versions,
          action: create(),
        },
        clock,
      ),
    ).rejects.toMatchObject({ code: "DATA_GENERATION_CHANGED" });
  });
});
