import { hasSavingsLink, linkedBalances, positionKey, replay } from "./engine";
import { fundIds, type FundId } from "./schema";
import type { FundSavingsSource } from "./savings-sources";
import type { FundBook } from "./types";

export interface FundImpact {
  fundId: FundId;
  before: string;
  after: string;
  target: string;
  missing: string;
  sources: { name: string; before: string; after: string }[];
}

/**
 * Funds whose total goes down because linked Savings balances changed. Moving money between two
 * categories of the same fund leaves the total unchanged and is not reported.
 */
export function fundImpact(
  book: FundBook | null,
  before: FundSavingsSource[],
  after: FundSavingsSource[],
): FundImpact[] {
  if (!book || !hasSavingsLink(book)) return [];
  const beforeLinked = linkedBalances(book, before),
    afterLinked = linkedBalances(book, after);
  const previous = replay(book, beforeLinked),
    next = replay(book, afterLinked);
  return fundIds.flatMap((fundId) => {
    const was = previous.funds.find((f) => f.id === fundId)!,
      now = next.funds.find((f) => f.id === fundId)!;
    if (BigInt(now.balance) >= BigInt(was.balance)) return [];
    return [
      {
        fundId,
        before: was.balance,
        after: now.balance,
        target: now.target,
        missing: now.missing,
        sources: book.locations.flatMap((l) => {
          if (!l.active || l.savings?.fundId !== fundId) return [];
          const key = positionKey(fundId, l.id);
          if (beforeLinked[key] === afterLinked[key]) return [];
          return [
            {
              name: l.name,
              before: beforeLinked[key],
              after: afterLinked[key],
            },
          ];
        }),
      },
    ];
  });
}
