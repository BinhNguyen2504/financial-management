import type { InvestmentSample } from "./investment-review-data.mjs";
export const refreshTables: string[];
export function snapshotSQL(owner: string): string;
export function buildInvestmentRefreshSQL(
  sample: InvestmentSample,
  snapshot: Record<string, unknown>,
): string;
