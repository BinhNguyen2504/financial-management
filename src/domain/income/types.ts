export type Month = string;
export type Money = string;
export interface IncomeRule {
  month: Month;
  name: string;
  description: string;
  active: boolean;
  /** Day of month the money usually arrives (1-31). Absent on older rules = 1. */
  receiveDay?: number;
}
export interface IncomeCategory {
  id: string;
  start: Month;
  deleted: boolean;
  rules: IncomeRule[];
}
export interface MonthlyIncome {
  categoryId: string;
  month: Month;
  amount: Money;
  note: string;
}
export interface OneOffIncome {
  id: string;
  month: Month;
  name: string;
  description: string;
  amount: Money;
  deleted: boolean;
}
export interface IncomeBook {
  version: number;
  categories: IncomeCategory[];
  monthly: MonthlyIncome[];
  oneOffs: OneOffIncome[];
  audit: { version: number; at: string; action: string; detail: unknown }[];
}
export type { Clock } from "../shared/types";
export interface IncomeRow {
  key: string;
  categoryId: string | null;
  kind: "fixed" | "oneoff";
  month: Month;
  name: string;
  description: string;
  amount: Money | null;
  note: string;
  active: boolean;
  /** Resolved day of month the money arrives (1-31); one-off rows use 1. */
  receiveDay: number;
}
export interface IncomeView {
  book: IncomeBook | null;
  rows: IncomeRow[];
  year: number;
  today: string;
}
