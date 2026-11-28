import type { SavingsBook } from "../savings/types";
import { replay } from "../savings/engine";

/** A Savings category whose VND balance can back a fund. Gold is excluded: its value moves with prices. */
export interface FundSavingsSource {
  categoryId: string;
  name: string;
  emoji: string;
  kind: "cash" | "deposit";
  active: boolean;
  amount: string;
}

/** Cash balance, or principal still deposited, as recorded up to the given date. */
export function savingsSources(
  book: SavingsBook | null,
  asOf: string,
): FundSavingsSource[] {
  if (!book) return [];
  return replay(book, asOf).positions.flatMap((p) =>
    p.kind === "gold"
      ? []
      : [
          {
            categoryId: p.id,
            name: p.name,
            emoji: p.emoji,
            kind: p.kind,
            active: p.active,
            amount: p.cash,
          },
        ],
  );
}
