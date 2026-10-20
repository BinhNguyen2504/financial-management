import type { z } from "zod";
import type {
  auditSchema,
  configurationSchema,
  locationSchema,
  revisionSchema,
  FundId,
  LivingExpenseSnapshot,
} from "./schema";
export type { FundId, FundTransaction, LivingExpenseSnapshot } from "./schema";
export interface FundBook {
  version: number;
  funds: FundId[];
  configurations: z.infer<typeof configurationSchema>[];
  locations: z.infer<typeof locationSchema>[];
  revisions: z.infer<typeof revisionSchema>[];
  audit: z.infer<typeof auditSchema>[];
}
export interface LivingSource {
  expenseVersion: number;
  month: string;
  items: LivingExpenseSnapshot["items"];
}
export interface FundState {
  balances: Record<string, string>;
  funds: {
    id: FundId;
    balance: string;
    target: string;
    missing: string;
    excess: string;
    percent: string;
  }[];
  total: string;
  target: string;
  missing: string;
  emergencyMonths: string;
  contributed: string;
  withdrawn: string;
}
export interface FundView {
  book: FundBook | null;
  state: FundState;
  source: LivingSource;
  proposedLiving: LivingExpenseSnapshot | null;
  sourceChanged: boolean;
  sourceUnavailable: boolean;
  now: string;
}
