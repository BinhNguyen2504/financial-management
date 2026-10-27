import type { SavingsAction, SavingsTransaction } from "./schema";
export type { SavingsTransaction } from "./schema";
export type AssetKind = "cash" | "deposit" | "gold";
export interface CategoryRule {
  month: string;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
}
export interface SavingsCategory {
  id: string;
  start: string;
  kind: AssetKind;
  unit: string | null;
  rules: CategoryRule[];
}
export interface TransactionRevision {
  id: string;
  sequence: number;
  rootId: string;
  transaction: SavingsTransaction | null;
  reason: string;
}
export interface GoldPrice {
  id: string;
  categoryId: string;
  date: string;
  price: string;
  sequence: number;
}
export interface SavingsContract {
  id: string;
  categoryId: string;
  name: string;
  opened: string;
  maturity: string;
  term: string;
  principal: string;
  previousId: string | null;
}
export interface GoldLot {
  id: string;
  categoryId: string;
  date: string;
  quantity: string;
  cost: string;
}
export interface CategoryPosition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  kind: AssetKind;
  unit: string | null;
  active: boolean;
  cash: string;
  quantity: string;
  cost: string;
  value: string | null;
  price: string | null;
  priceDate: string | null;
  stale: boolean;
  unrealized: string | null;
}
export interface TransactionEffect {
  id: string;
  date: string;
  kind: SavingsTransaction["kind"];
  categoryId: string;
  cashCategoryId: string | null;
  external: string;
  internal: Record<string, string>;
  opening: Record<string, string>;
  interest: string;
  realized: string;
  fees: string;
  net: string;
  costSold: string;
  quantity: string;
  note: string;
}
export interface SavingsState {
  asOf: string;
  positions: CategoryPosition[];
  contracts: SavingsContract[];
  lots: GoldLot[];
  effects: TransactionEffect[];
  knownValue: string;
  total: string | null;
  missing: string[];
}
export interface MonthClose {
  id: string;
  sequence: number;
  month: string;
  kind: "close" | "reopen";
  reason: string;
  snapshot: SavingsState | null;
}
export interface SavingsBook {
  version: number;
  categories: SavingsCategory[];
  revisions: TransactionRevision[];
  prices: GoldPrice[];
  closes: MonthClose[];
  audit: { version: number; at: string; action: SavingsAction }[];
}
export interface SavingsView {
  book: SavingsBook | null;
  state: SavingsState;
  today: string;
  month: string;
  closed: string[];
  due: SavingsContract[];
}
export type { Clock } from "../shared/types";
