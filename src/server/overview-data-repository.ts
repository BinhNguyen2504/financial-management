import type postgres from "postgres";
import { z } from "zod";
import type { Clock } from "../domain/shared/types";
import type { WidgetId } from "../domain/overview/layout";
import type { ExpenseBook } from "../domain/expenses/types";
import type { IncomeBook } from "../domain/income/types";
import type { SavingsBook } from "../domain/savings/types";
import type { InvestmentBook } from "../domain/investments/types";
import type { FundBook } from "../domain/funds/types";
import { materialize } from "../domain/expenses/engine";
import { toView as incomeView } from "../domain/income/engine";
import { toView as savingsView } from "../domain/savings/engine";
import { toView as investmentView } from "../domain/investments/engine";
import { toView as fundView, livingSource } from "../domain/funds/engine";
import {
  expenseSummary,
  incomeSummary,
  savingsSummary,
  investmentSummary,
  fundSummary,
  overviewSources,
} from "../domain/overview/summary";
import { withOwnerTransaction } from "./owner-transaction";

// Identifiers/expressions are fixed internal SQL, never request parameters.
function rows(table: string, value: string, order: string, condition = "") {
  return `(select coalesce(jsonb_agg(${value} order by ${order}), '[]'::jsonb)
    from public.${table} where owner_id=$1 ${condition})`;
}
const data = (table: string, order: string) => rows(table, "data", order);

/** Read projections only: no command/audit history, write locks or mutation baseline clones. */
export function postgresOverviewDataRepository(sql: postgres.Sql) {
  return {
    loaders(owner: string, clock: Clock, widgets: readonly WidgetId[]) {
      z.uuid().parse(owner);
      const month = clock.today.slice(0, 7);
      const needsExpenses = overviewSources(widgets).includes("expenses");
      async function read<T>(query: string, args: string[] = [owner]) {
        return withOwnerTransaction(sql, owner, async (tx) => {
          const [row] = await tx.unsafe<{ book: T }[]>(query, args);
          return row?.book ?? null;
        });
      }
      // Funds only need the jar rules. If Spending is visible, both share its projection.
      let expenses: Promise<ExpenseBook | null> | undefined;
      const expenseBook = () =>
        (expenses ??= read<ExpenseBook>(
          `
        select jsonb_build_object('start',start_month,'version',version,
          'jars',${rows("expense_jars", "jsonb_build_object('id',id,'kind',kind,'start',start_month,'opening',opening::text,'rules',rules)", "start_month,id")},
          'inputs',${needsExpenses ? rows("expense_month_inputs", "jsonb_build_object('jarId',jar_id,'month',month,'target',target::text,'funding',funding::text,'extra',extra::text,'closing',closing::text)", "month,jar_id", "and month <= $2") : "'[]'::jsonb"},
          'spends',${needsExpenses ? rows("expense_spends", "jsonb_build_object('id',id,'jarId',jar_id,'date',to_char(date,'YYYY-MM-DD'),'amount',amount::text,'note','','deleted',false)", "date,id", "and not deleted and to_char(date,'YYYY-MM') <= $2") : "'[]'::jsonb"},
          'years',${needsExpenses ? rows("expense_years", "jsonb_build_object('year',year,'closedAt',closed_at,'snapshot',snapshot)", "year", "and year <= left($2,4)::integer") : "'[]'::jsonb"},
          'labels','[]'::jsonb,'audit','[]'::jsonb) as book
        from public.expense_books where owner_id=$1`,
          needsExpenses ? [owner, month] : [owner],
        ));
      return {
        expenses: async () => {
          const book = await expenseBook();
          return expenseSummary(
            {
              book: null,
              rows: book ? materialize(book, clock, month) : [],
              today: clock.today,
              currentYear: Number(clock.today.slice(0, 4)),
            },
            widgets,
          );
        },
        income: async () => {
          const book = await read<IncomeBook>(
            `
            select jsonb_build_object('version',version,
              'categories',${rows("income_categories", "jsonb_build_object('id',id,'start',start_month,'deleted',deleted,'rules',rules)", "start_month,id", "and not deleted and start_month <= $2")},
              'monthly',${rows("income_monthly", "jsonb_build_object('categoryId',category_id,'month',month,'amount',amount::text,'note','')", "category_id", "and month=$2")},
              'oneOffs',${rows("income_oneoffs", "jsonb_build_object('id',id,'month',month,'name',name,'description','','amount',amount::text,'deleted',false)", "id", "and month=$2 and not deleted")},
              'audit','[]'::jsonb) as book
            from public.income_books where owner_id=$1`,
            [owner, month],
          );
          return incomeSummary(
            incomeView(book, Number(clock.today.slice(0, 4)), clock, month),
          );
        },
        savings: async () => {
          const book = await read<SavingsBook>(`
            select jsonb_build_object('version',version,
              'categories',${data("savings_categories", "id")},
              'revisions',${data("savings_transactions", "sequence")},
              'prices',${data("savings_prices", "sequence")},
              'closes','[]'::jsonb,'audit','[]'::jsonb) as book
            from public.savings_books where owner_id=$1`);
          return savingsSummary(savingsView(book, clock.today, clock), widgets);
        },
        investments: async () => {
          const book = await read<InvestmentBook>(`
            select jsonb_build_object('version',version,
              'categories',${data("investments_categories", "id")},
              'revisions',${data("investments_transactions", "sequence")} || ${data("investments_valuations", "sequence")},
              'audit','[]'::jsonb) as book
            from public.investments_books where owner_id=$1`);
          if (book) book.revisions.sort((a, b) => a.sequence - b.sequence);
          return investmentSummary(investmentView(book, clock.today, clock));
        },
        funds: async () => {
          const [book, source] = await Promise.all([
            read<FundBook>(`
              select jsonb_build_object('version',version,
                'funds',${rows("funds_definitions", "id", "id")},
                'configurations',${data("funds_configurations", "sequence")},
                'locations',${data("funds_locations", "id")},
                'revisions',${data("funds_transactions", "sequence")},
                'audit','[]'::jsonb) as book
              from public.funds_books where owner_id=$1`),
            expenseBook(),
          ]);
          return fundSummary(
            fundView(book, livingSource(source, month), clock),
          );
        },
      };
    },
  };
}
