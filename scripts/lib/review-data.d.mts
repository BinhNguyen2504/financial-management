import type { ExpenseBook } from "../../src/domain/expenses/types";
import type { IncomeBook } from "../../src/domain/income/types";
export const REVIEW_FORMAT: string;
export const reviewTables: string[];
export function validateUUID(value: string): string;
export function vietnamToday(date?: Date): string;
export interface ReviewData {
  format: string;
  datasetId: string;
  ownerId: string;
  today: string;
  currency: string;
  notice: string;
  source: string;
  expenses: ExpenseBook;
  income: IncomeBook;
}
export function buildReviewData(options: {
  ownerId: string;
  today?: string;
  datasetId?: string;
}): ReviewData;
export function buildReviewSQL(
  data: ReviewData,
  options?: { runtime?: boolean },
): {
  seed: string;
  backup: string;
  reset: string;
  inspect: string;
};
