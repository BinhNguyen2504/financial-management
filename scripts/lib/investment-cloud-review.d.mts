import type { SavingsReviewData } from "./savings-review-data.mjs";
import type { InvestmentBook } from "../../src/domain/investments/types";
export const investmentTables: string[];
export const completeReviewTables: string[];
export function investmentReviewDescription(datasetId: string): string;
export interface InvestmentReviewData extends SavingsReviewData {
  investmentToday: string;
  investments: InvestmentBook;
  investmentsSource: {
    images: string[];
    syntheticTransactions: boolean;
    notice: string;
  };
}
export function addInvestmentReviewData(
  base: SavingsReviewData,
  options?: { today?: string },
): InvestmentReviewData;
export function buildInvestmentCloudReviewSQL(
  data: InvestmentReviewData,
  options?: { runtime?: boolean; migrationSQL?: string },
): {
  seed: string;
  backup: string;
  reset: string;
  inspect: string;
  enable: string | null;
};
