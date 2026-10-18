import type { InvestmentBook } from "../../src/domain/investments/types";
import type { InvestmentAction } from "../../src/domain/investments/schema";
export interface InvestmentSample {
  ownerId: string;
  today: string;
  book: InvestmentBook;
  actions: InvestmentAction[];
  ids: Record<
    "cash" | "exchange" | "stock" | "fund" | "bond" | "crypto" | "closed",
    string
  >;
}
export function buildInvestmentReviewData(options: {
  ownerId: string;
  today?: string;
}): InvestmentSample;
export function buildInvestmentReviewSQL(sample: InvestmentSample): {
  seed: string;
};
