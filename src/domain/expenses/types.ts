import type { JarEmoji } from "./emoji";
export type Money = string;
export type Month = string;
export type JarKind = "monthly" | "accumulation";
export interface JarRule {
  emoji?: JarEmoji | null;
  month: Month;
  name: string;
  description: string;
  method: string;
  group: string;
  amount: Money;
  active: boolean;
}
export interface Jar {
  id: string;
  kind: JarKind;
  start: Month;
  opening: Money;
  rules: JarRule[];
}
export interface MonthInput {
  jarId: string;
  month: Month;
  target: Money | null;
  funding: Money | null;
  extra: Money;
  closing: Money | null;
}
export interface Spend {
  id: string;
  jarId: string;
  date: string;
  amount: Money;
  note: string;
  deleted: boolean;
}
export interface ExpenseRow {
  emoji?: JarEmoji | null;
  jarId: string;
  month: Month;
  kind: JarKind;
  name: string;
  description: string;
  method: string;
  group: string;
  active: boolean;
  target: Money;
  opening: Money;
  required: Money;
  funding: Money;
  extra: Money;
  available: Money;
  spent: Money;
  closing: Money;
  over: Money;
  status: "actual" | "provisional" | "planned";
}
export interface ExpenseYear {
  year: number;
  closedAt: string | null;
  snapshot: ExpenseRow[] | null;
}
export interface Label {
  id: string;
  kind: "method" | "group";
  name: string;
  brandKey?: string | null;
  iconKey?: string | null;
}
export interface Audit {
  version: number;
  at: string;
  action: string;
  detail: unknown;
}
export interface ExpenseBook {
  start: Month;
  version: number;
  jars: Jar[];
  inputs: MonthInput[];
  spends: Spend[];
  labels: Label[];
  years: ExpenseYear[];
  audit: Audit[];
}
export interface Clock {
  today: string;
  now: string;
}
export interface ExpenseView {
  book: ExpenseBook | null;
  rows: ExpenseRow[];
  currentYear: number;
  today: string;
}
export interface RowChange {
  jarId: string;
  name: string;
  month: Month;
  before: { funding: Money; closing: Money; spent: Money } | null;
  after: { funding: Money; closing: Money; spent: Money } | null;
}
