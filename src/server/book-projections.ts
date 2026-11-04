import { timePhase } from "./performance";
import type postgres from "postgres";
import type { ExpenseBook } from "../domain/expenses/types";
import type { IncomeBook } from "../domain/income/types";
import type { SavingsBook } from "../domain/savings/types";
import type { InvestmentBook } from "../domain/investments/types";
import type { FundBook } from "../domain/funds/types";
import type { GoalBook } from "../domain/goals/schema";
import { livingSource } from "../domain/funds/engine";

export interface FinancialBooks {
  expenses: ExpenseBook;
  income: IncomeBook;
  savings: SavingsBook;
  investments: InvestmentBook;
  funds: FundBook;
  goals: GoalBook;
}
type DB = Pick<postgres.Sql, "unsafe">;

// Identifiers and expressions below are internal constants. Values stay bound.
const rows = (table: string, expression: string, order: string) =>
  `(select coalesce(jsonb_agg(${expression} order by ${order}), '[]'::jsonb)
    from public.${table} where owner_id=$1)`;
const data = (table: string, order = "id") => rows(table, "data", order);
const audit = (table: string, detail = false) =>
  rows(
    table,
    `jsonb_build_object('version',version,'at',to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'action',action${detail ? ",'detail',detail" : ""})`,
    "version",
  );

export function bookProjection(kind: keyof FinancialBooks, history = true) {
  const historyRows = (value: string) => (history ? value : "'[]'::jsonb");
  switch (kind) {
    case "expenses":
      return `select jsonb_build_object('version',version,'start',start_month,
        'jars',${rows("expense_jars", "jsonb_build_object('id',id,'kind',kind,'start',start_month,'opening',opening::text,'rules',rules)", "start_month,id")},
        'inputs',${rows("expense_month_inputs", "jsonb_build_object('jarId',jar_id,'month',month,'target',target::text,'funding',funding::text,'extra',extra::text,'closing',closing::text)", "month,jar_id")},
        'spends',${rows("expense_spends", "jsonb_build_object('id',id,'jarId',jar_id,'date',to_char(date,'YYYY-MM-DD'),'amount',amount::text,'note',note,'deleted',deleted)", "date,id")},
        'years',${rows("expense_years", "jsonb_build_object('year',year,'closedAt',case when closed_at is null then null else to_char(closed_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') end,'snapshot',snapshot)", "year")},
        'labels',${historyRows(rows("expense_labels l", "jsonb_build_object('id',id,'kind',kind,'name',name,'brandKey',to_jsonb(l)->>'brand_key','iconKey',to_jsonb(l)->>'icon_key')", "kind,name"))},
        'audit',${historyRows(audit("expense_audit", true))}) as book
        from public.expense_books where owner_id=$1`;
    case "income":
      return `select jsonb_build_object('version',version,
        'categories',${rows("income_categories", "jsonb_build_object('id',id,'start',start_month,'deleted',deleted,'rules',rules)", "start_month,id")},
        'monthly',${rows("income_monthly", "jsonb_build_object('categoryId',category_id,'month',month,'amount',amount::text,'note',note)", "month,category_id")},
        'oneOffs',${rows("income_oneoffs", "jsonb_build_object('id',id,'month',month,'name',name,'description',description,'amount',amount::text,'deleted',deleted)", "month,id")},
        'audit',${historyRows(audit("income_audit", true))}) as book
        from public.income_books where owner_id=$1`;
    case "savings":
      return `select jsonb_build_object('version',version,'categories',${data("savings_categories")},
        'revisions',${data("savings_transactions", "sequence")},'prices',${data("savings_prices", "sequence")},
        'closes',${historyRows(data("savings_closes", "sequence"))},'audit',${historyRows(audit("savings_audit"))}) as book
        from public.savings_books where owner_id=$1`;
    case "investments":
      return `select jsonb_build_object('version',version,'categories',${data("investments_categories")},
        'revisions',${data("investments_transactions", "sequence")} || ${data("investments_valuations", "sequence")},
        'audit',${historyRows(audit("investments_audit"))}) as book
        from public.investments_books where owner_id=$1`;
    case "funds":
      return `select jsonb_build_object('version',version,'funds',${rows("funds_definitions", "id", "id")},
        'configurations',${data("funds_configurations", "sequence")},'locations',${data("funds_locations")},
        'revisions',${data("funds_transactions", "sequence")},'audit',${historyRows(audit("funds_audit"))}) as book
        from public.funds_books where owner_id=$1`;
    case "goals":
      return `select jsonb_build_object('version',version,'goals',${data("goals_definitions")},
        'revisions',${data("goals_transactions", "sequence")},'audit',${historyRows(data("goals_audit", "version"))}) as book
        from public.goals_books where owner_id=$1`;
  }
}

/** One statement also keeps a book coherent when used inside a write transaction. */
export async function readBook<K extends keyof FinancialBooks>(
  db: DB,
  owner: string,
  kind: K,
  history = true,
): Promise<FinancialBooks[K] | null> {
  const [row] = await timePhase("sql", () =>
    db.unsafe<{ book: FinancialBooks[K] }[]>(bookProjection(kind, history), [
      owner,
    ]),
  );
  const book = row?.book ?? null;
  if (kind === "investments" && book && "revisions" in book)
    book.revisions.sort((a, b) => a.sequence - b.sequence);
  return book;
}

/** Fund targets depend on jar rules, never on spending, audits, or year snapshots. */
export async function readLivingSource(db: DB, owner: string, month: string) {
  const [row] = await timePhase("sql", () =>
    db.unsafe<{ version: number; jars: ExpenseBook["jars"] }[]>(
      `select version,${rows("expense_jars", "jsonb_build_object('id',id,'kind',kind,'start',start_month,'opening',opening::text,'rules',rules)", "start_month,id")} as jars
     from public.expense_books where owner_id=$1`,
      [owner],
    ),
  );
  return livingSource(
    row
      ? {
          ...row,
          start: month,
          inputs: [],
          spends: [],
          years: [],
          labels: [],
          audit: [],
        }
      : null,
    month,
  );
}
