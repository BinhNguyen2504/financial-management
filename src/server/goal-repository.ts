import type postgres from "postgres";
import { z } from "zod";
import { withOwnerTransaction, lockOwner } from "./owner-transaction";
import { withDataGeneration } from "./data-generation";
import { changedRecords } from "./changed-records";
import type {
  GoalRepository,
  GoalTransactionRepository,
  GoalCommandResult,
} from "../application/goals";
import type { GoalBook } from "../domain/goals/schema";
import { GoalError, sourceKey } from "../domain/goals/engine";
import { goalSources } from "../domain/goals/sources";
import type { SavingsBook } from "../domain/savings/types";
import type { InvestmentBook } from "../domain/investments/types";
import type { FundBook } from "../domain/funds/types";

type DB = Pick<postgres.Sql, "unsafe">;
function adapter(db: DB, owner: string): GoalTransactionRepository {
  const query = <T extends postgres.Row>(
    sql: string,
    args: (string | number | null)[] = [],
  ) => db.unsafe<T[]>(sql, args);
  const data = async <T>(table: string, order = "id"): Promise<T[]> =>
    (
      await query<{ data: T }>(
        `select data from public.${table} where owner_id=$1 order by ${order}`,
        [owner],
      )
    ).map((r) => r.data);
  const head = async (prefix: string) =>
    (
      await query<{ version: number }>(
        `select version from public.${prefix}_books where owner_id=$1`,
        [owner],
      )
    )[0];
  const audit = async <T>(prefix: string): Promise<T[]> => [
    ...(await query<T & postgres.Row>(
      `select version,to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at,action from public.${prefix}_audit where owner_id=$1 order by version`,
      [owner],
    )),
  ];
  let baseline: GoalBook | null = null;
  return {
    async read() {
      const h = await head("goals");
      if (!h) return null;
      baseline = {
        version: h.version,
        goals: await data("goals_definitions"),
        revisions: await data("goals_transactions", "sequence"),
        audit: await data("goals_audit", "version"),
      };
      return structuredClone(baseline);
    },
    async sources(today) {
      const ready = await query<{
        kind: "savings" | "investments" | "funds";
        ready: boolean;
      }>(
        "select kind,to_regclass('public.'||kind||'_books') is not null as ready from unnest(array['savings','investments','funds']) kind",
      );
      let savings: SavingsBook | null = null,
        investments: InvestmentBook | null = null,
        funds: FundBook | null = null;
      for (const sourceModule of ready.filter((r) => r.ready)) {
        const h = await head(sourceModule.kind);
        if (!h) continue;
        if (sourceModule.kind === "savings")
          savings = {
            ...h,
            categories: await data("savings_categories"),
            revisions: await data("savings_transactions", "sequence"),
            prices: await data("savings_prices", "sequence"),
            closes: await data("savings_closes", "sequence"),
            audit: await audit("savings"),
          };
        if (sourceModule.kind === "investments")
          investments = {
            ...h,
            categories: await data("investments_categories"),
            revisions: [
              ...(await data<InvestmentBook["revisions"][number]>(
                "investments_transactions",
                "sequence",
              )),
              ...(await data<InvestmentBook["revisions"][number]>(
                "investments_valuations",
                "sequence",
              )),
            ].sort((a, b) => a.sequence - b.sequence),
            audit: await audit("investments"),
          };
        if (sourceModule.kind === "funds")
          funds = {
            ...h,
            funds: (
              await query<{ id: FundBook["funds"][number] }>(
                "select id from public.funds_definitions where owner_id=$1 order by id",
                [owner],
              )
            ).map((r) => r.id),
            locations: await data("funds_locations"),
            configurations: await data("funds_configurations", "sequence"),
            revisions: await data("funds_transactions", "sequence"),
            audit: await audit("funds"),
          };
      }
      const sources = goalSources({ savings, investments, funds }, today);
      for (const sourceModule of ready)
        if (!sourceModule.ready) sources.versions[sourceModule.kind] = null;
      return sources;
    },
    async command(id) {
      return (
        (
          await query<{ fingerprint: string; result: GoalCommandResult }>(
            "select fingerprint,result from public.goals_commands where owner_id=$1 and id=$2",
            [owner, id],
          )
        )[0] ?? null
      );
    },
    async save(book) {
      await query(
        "insert into public.goals_books(owner_id,version) values($1,$2) on conflict(owner_id) do update set version=excluded.version",
        [owner, book.version],
      );
      for (const g of changedRecords(
        baseline?.goals,
        book.goals,
        (g) => g.id,
      )) {
        await query(
          "insert into public.goals_definitions(owner_id,id,data) values($1,$2,$3::text::jsonb) on conflict(owner_id,id) do update set data=excluded.data",
          [owner, g.id, JSON.stringify(g)],
        );
        // Links are immutable records of every source ever referenced by this goal.
        for (const l of g.links)
          await query(
            "insert into public.goals_links(owner_id,id,goal_id,source_kind,source_id,data) values($1,$2,$3,$4,$5,$6::text::jsonb) on conflict do nothing",
            [
              owner,
              `${g.id}:${sourceKey(l)}`,
              g.id,
              l.kind,
              l.sourceId,
              JSON.stringify({ kind: l.kind, sourceId: l.sourceId }),
            ],
          );
      }
      for (const r of changedRecords(
        baseline?.revisions,
        book.revisions,
        (r) => r.id,
      )) {
        const t =
          r.transaction ??
          book.revisions.find((x) => x.rootId === r.rootId)!.transaction!;
        await query(
          "insert into public.goals_transactions(owner_id,id,root_id,sequence,goal_id,to_goal_id,data) values($1,$2,$3,$4,$5,$6,$7::text::jsonb)",
          [
            owner,
            r.id,
            book.revisions.find((x) => x.rootId === r.rootId)!.id,
            r.sequence,
            t.goalId,
            t.toGoalId,
            JSON.stringify(r),
          ],
        );
      }
      const a = book.audit.at(-1)!;
      await query(
        "insert into public.goals_audit(owner_id,version,data) values($1,$2,$3::text::jsonb)",
        [owner, a.version, JSON.stringify(a)],
      );
      baseline = structuredClone(book);
    },
    async remember(id, value) {
      await query(
        "insert into public.goals_commands(owner_id,id,fingerprint,result) values($1,$2,$3,$4::text::jsonb)",
        [owner, id, value.fingerprint, JSON.stringify(value.result)],
      );
    },
  };
}
export function postgresGoalRepository(
  sql: postgres.Sql,
  expectedGeneration?: number,
): GoalRepository {
  return {
    async transaction<T>(
      owner: string,
      fn: (tx: GoalTransactionRepository) => Promise<T>,
    ): Promise<T> {
      z.uuid().parse(owner);
      return await withOwnerTransaction(sql, owner, async (tx) => {
        const [ready] = await tx.unsafe<{ ready: boolean }[]>(
          "select to_regclass('public.goals_books') is not null as ready",
        );
        if (!ready.ready)
          throw new GoalError(
            "Mục tiêu chưa được bật trên hệ thống.",
            503,
            "GOALS_MIGRATION_REQUIRED",
          );
        await lockOwner(tx, [
          owner,
          `savings:${owner}`,
          `investments:${owner}`,
          `funds:${owner}`,
          `goals:${owner}`,
        ]);
        return withDataGeneration(tx, owner, expectedGeneration, () =>
          fn(adapter(tx, owner)),
        );
      });
    },
  };
}
