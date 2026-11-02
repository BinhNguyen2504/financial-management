import { z } from "zod";
import { yearSchema } from "../shared/schema";
import type { Clock } from "../shared/types";
import type { ExpenseBook } from "../expenses/types";
import type { IncomeBook } from "../income/types";
import type { SavingsBook } from "../savings/types";
import type { InvestmentBook } from "../investments/types";
import type { FundBook } from "../funds/types";
import type { GoalBook } from "../goals/schema";

export const tabs = [
  "summary",
  "cashflow",
  "savings",
  "investments",
  "funds",
  "goals",
] as const;
export const sourceIds = [
  "income",
  "expenses",
  "savings",
  "investments",
  "funds",
  "goals",
] as const;
export type SourceId = (typeof sourceIds)[number];
export const querySchema = z.object({
  tab: z.enum(tabs).default("summary"),
  period: z.enum(["month", "quarter", "year"]).default("month"),
  year: z.coerce.number().pipe(yearSchema),
  month: z.coerce.number().int().min(1).max(12),
});
export type ReportQuery = z.infer<typeof querySchema>;
export function parseQuery(
  raw: Record<string, unknown>,
  clock: Clock,
): ReportQuery {
  return querySchema.parse({
    year: Number(clock.today.slice(0, 4)),
    month: Number(clock.today.slice(5, 7)),
    ...raw,
  });
}
export function reportSources(tab: ReportQuery["tab"]): SourceId[] {
  if (tab === "summary") return [...sourceIds];
  if (tab === "cashflow") return ["income", "expenses"];
  if (tab === "goals") return ["savings", "investments", "funds", "goals"];
  return [tab];
}
export class ReportError extends Error {
  constructor(
    message: string,
    public status = 422,
    public code = "INVALID_REPORT",
  ) {
    super(message);
  }
}
export interface Books {
  income: IncomeBook | null;
  expenses: ExpenseBook | null;
  savings: SavingsBook | null;
  investments: InvestmentBook | null;
  funds: FundBook | null;
  goals: GoalBook | null;
}
export interface ReportInput {
  books: Partial<Books>;
  errors: SourceId[];
  generation: number;
}
export interface Period {
  from: string;
  to: string;
  asOf: string;
  partial: boolean;
  future: boolean;
}
export function periodFor(
  query: ReportQuery,
  clock: Clock,
  previous = false,
): Period {
  const length =
    query.period === "month" ? 1 : query.period === "quarter" ? 3 : 12;
  const month =
    query.period === "year"
      ? 1
      : query.period === "quarter"
        ? Math.floor((query.month - 1) / 3) * 3 + 1
        : query.month;
  const start = new Date(
    Date.UTC(query.year, month - 1 - (previous ? length : 0), 1),
  );
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + length, 0),
  );
  const from = start.toISOString().slice(0, 10),
    to = end.toISOString().slice(0, 10);
  return {
    from,
    to,
    asOf: to < clock.today ? to : clock.today,
    partial: from <= clock.today && to >= clock.today,
    future: from > clock.today,
  };
}
export type Cell = string | null;
export type Row = { id: string } & Record<string, Cell>;
export interface Table {
  id: string;
  title: string;
  columns: { key: string; label: string; type: "text" | "money" | "percent" }[];
  rows: Row[];
}
export interface Metric {
  id: string;
  label: string;
  source: SourceId;
  value: Cell;
  previous: Cell;
  delta: Cell;
  percent: Cell;
}
export interface Report {
  query: ReportQuery;
  period: Period;
  previousPeriod: Period;
  generatedAt: string;
  versions: string;
  sources: Partial<
    Record<
      SourceId,
      { status: "ready" | "error"; empty: boolean; version: number | null }
    >
  >;
  warnings: string[];
  metrics: Metric[];
  tables: Table[];
}
export interface DetailResult {
  rows: Row[];
  columns: Table["columns"];
  total: number;
  page: number;
  label: string;
}
export const textColumn = (
  key: string,
  label: string,
): Table["columns"][number] => ({ key, label, type: "text" });
export const moneyColumn = (
  key: string,
  label: string,
): Table["columns"][number] => ({ key, label, type: "money" });
export const detailColumns = [
  textColumn("date", "Thời điểm"),
  textColumn("name", "Nguồn số liệu"),
  textColumn("kind", "Loại"),
  moneyColumn("amount", "Số tiền VND"),
  textColumn("note", "Ghi chú"),
];
