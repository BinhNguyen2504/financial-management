import type { InvestmentAction, InvestmentTransaction } from "./schema";
export type { InvestmentTransaction } from "./schema";
export interface Clock {
  today: string;
  now: string;
}
export interface CategoryRule {
  date: string;
  sequence: number;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
}
export interface InvestmentCategory {
  id: string;
  start: string;
  kind: "investment" | "cash";
  rules: CategoryRule[];
}
export interface Revision {
  id: string;
  rootId: string;
  sequence: number;
  at: string;
  transaction: InvestmentTransaction | null;
  reason: string;
}
export interface InvestmentBook {
  version: number;
  categories: InvestmentCategory[];
  revisions: Revision[];
  audit: { version: number; at: string; action: InvestmentAction }[];
}
export interface Position {
  id: string;
  name: string;
  emoji: string;
  description: string;
  kind: InvestmentCategory["kind"];
  active: boolean;
  cash: string;
  cost: string;
  value: string | null;
  valueDate: string | null;
  stale: boolean;
  unrealized: string | null;
  realized: string;
  roi: string | null;
}
export interface Balance {
  cash: string;
  cost: string;
  value: string | null;
}
export interface TransactionEffect {
  id: string;
  date: string;
  kind: InvestmentTransaction["kind"];
  categoryId: string;
  cashCategoryId: string | null;
  external: string;
  internal: Record<string, string>;
  opening: Record<string, string>;
  net: string;
  fees: string;
  tax: string;
  costSold: string;
  realized: string;
  note: string;
  counterparty: string;
  before: Record<string, Balance>;
  after: Record<string, Balance>;
}
export interface InvestmentState {
  asOf: string;
  positions: Position[];
  effects: TransactionEffect[];
  knownValue: string;
  total: string | null;
  missing: string[];
}
export interface InvestmentView {
  book: InvestmentBook | null;
  state: InvestmentState;
  today: string;
  month: string;
}
