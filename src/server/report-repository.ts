import { timePhase } from "./performance";
import type postgres from "postgres";
import { z } from "zod";
import type { ReportRepository } from "../application/reports";
import type { Books, ReportInput, SourceId } from "../domain/reports/model";
import { setTransactionOwner } from "./owner-transaction";
import { dataGeneration } from "./data-generation";

// All identifiers are internal constants. No audit, command receipts or write locks.
const rows = (table: string, expression: string, order: string) =>
  `(select coalesce(jsonb_agg(${expression} order by ${order}), '[]'::jsonb) from public.${table} where owner_id=$1)`;
const data = (table: string, order = "id") => rows(table, "data", order);
const queries: Record<SourceId, string> = {
  expenses: `select jsonb_build_object('version',version,'start',start_month,
    'jars',${rows("expense_jars", "jsonb_build_object('id',id,'kind',kind,'start',start_month,'opening',opening::text,'rules',rules)", "start_month,id")},
    'inputs',${rows("expense_month_inputs", "jsonb_build_object('jarId',jar_id,'month',month,'target',target::text,'funding',funding::text,'extra',extra::text,'closing',closing::text)", "month,jar_id")},
    'spends',${rows("expense_spends", "jsonb_build_object('id',id,'jarId',jar_id,'date',to_char(date,'YYYY-MM-DD'),'amount',amount::text,'note',note,'deleted',deleted)", "date,id")},
    'years',${rows("expense_years", "jsonb_build_object('year',year,'closedAt',closed_at,'snapshot',snapshot)", "year")},
    'labels','[]'::jsonb,'audit','[]'::jsonb) as book from public.expense_books where owner_id=$1`,
  income: `select jsonb_build_object('version',version,
    'categories',${rows("income_categories", "jsonb_build_object('id',id,'start',start_month,'deleted',deleted,'rules',rules)", "id")},
    'monthly',${rows("income_monthly", "jsonb_build_object('categoryId',category_id,'month',month,'amount',amount::text,'note',note)", "month,category_id")},
    'oneOffs',${rows("income_oneoffs", "jsonb_build_object('id',id,'month',month,'name',name,'description',description,'amount',amount::text,'deleted',deleted)", "month,id")},
    'audit','[]'::jsonb) as book from public.income_books where owner_id=$1`,
  savings: `select jsonb_build_object('version',version,'categories',${data("savings_categories")},
    'revisions',${data("savings_transactions", "sequence")},'prices',${data("savings_prices", "sequence")},
    'closes',${data("savings_closes", "sequence")},'audit','[]'::jsonb) as book from public.savings_books where owner_id=$1`,
  investments: `select jsonb_build_object('version',version,'categories',${data("investments_categories")},
    'revisions',${data("investments_transactions", "sequence")} || ${data("investments_valuations", "sequence")},
    'audit','[]'::jsonb) as book from public.investments_books where owner_id=$1`,
  funds: `select jsonb_build_object('version',version,'funds',${rows("funds_definitions", "id", "id")},
    'configurations',${data("funds_configurations", "sequence")},'locations',${data("funds_locations")},
    'revisions',${data("funds_transactions", "sequence")},'audit','[]'::jsonb) as book from public.funds_books where owner_id=$1`,
  goals: `select jsonb_build_object('version',version,'goals',${data("goals_definitions")},
    'revisions',${data("goals_transactions", "sequence")},'audit','[]'::jsonb) as book from public.goals_books where owner_id=$1`,
};

export function postgresReportRepository(sql: postgres.Sql): ReportRepository {
  return {
    async read(owner, sources, options) {
      z.uuid().parse(owner);
      return (await sql.begin(
        "isolation level repeatable read read only",
        async (tx) => {
          await setTransactionOwner(tx, owner);
          const result: ReportInput = {
            books: {},
            errors: [],
            generation: await dataGeneration(tx, owner),
          };
          for (const source of new Set(sources)) {
            try {
              const book = await tx.savepoint(async (sp) => {
                if (options && !options.fullSources.includes(source)) {
                  const tables = [
                    ...queries[source].matchAll(/public\.(\w+)/g),
                  ].map((m) => m[1]);
                  const prefix = source === "expenses" ? "expense" : source;
                  const [meta] = await timePhase("sql", () =>
                    sp.unsafe<{ version: number | null; ready: boolean }[]>(
                      `select (select version from public.${prefix}_books where owner_id=$1) as version,
                     (select bool_and(to_regclass('public.' || name) is not null) from unnest($2::text[]) name) as ready`,
                      [owner, tables],
                    ),
                  );
                  if (!meta.ready) throw new Error("REPORT_SCHEMA_NOT_READY");
                  return meta.version === null
                    ? null
                    : ({ version: meta.version } as Books[typeof source]);
                }
                const [row] = await timePhase("sql", () =>
                  sp.unsafe<{ book: Books[typeof source] }[]>(queries[source], [
                    owner,
                  ]),
                );
                return row?.book ?? null;
              });
              if (source === "investments" && book && "revisions" in book)
                book.revisions.sort((a, b) => a.sequence - b.sequence);
              Object.assign(result.books, { [source]: book });
            } catch {
              result.errors.push(source);
            }
          }
          return result;
        },
      )) as ReportInput;
    },
  };
}
