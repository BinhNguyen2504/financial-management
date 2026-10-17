import type { ReviewData } from "./review-data.mjs";
import type { SavingsBook } from "../../src/domain/savings/types";
export const savingsTables: string[];
export const allReviewTables: string[];
export interface SavingsReviewData extends ReviewData {
  savings: SavingsBook;
  savingsSource: {
    image: string;
    openingGoldCost: string;
    techcombankPrincipal: string;
    unitAssumption: string;
    syntheticTransactions: boolean;
  };
}
export function addSavingsReviewData(
  base: ReviewData,
  options?: { today?: string },
): SavingsReviewData;
export function buildSavingsReviewSQL(
  data: SavingsReviewData,
  options?: { runtime?: boolean; migrationSQL?: string },
): {
  seed: string;
  backup: string;
  reset: string;
  inspect: string;
  enable: string | null;
};
