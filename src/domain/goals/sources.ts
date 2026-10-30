import type { SavingsBook } from "../savings/types";
import type { InvestmentBook } from "../investments/types";
import type { FundBook } from "../funds/types";
import { replay as savingsReplay } from "../savings/engine";
import { replay as investmentReplay } from "../investments/engine";
import { replay as fundReplay } from "../funds/engine";
import type { GoalSources } from "./schema";

export function goalSources(
  books: {
    savings: SavingsBook | null;
    investments: InvestmentBook | null;
    funds: FundBook | null;
  },
  today: string,
): GoalSources {
  const items: GoalSources["items"] = [];
  if (books.savings)
    for (const p of savingsReplay(books.savings, today).positions)
      items.push({
        kind: "savings",
        sourceId: p.id,
        name: p.name,
        active: p.active,
        capital: p.kind === "gold" ? p.cost : p.cash,
        value: p.value,
        valueDate: p.priceDate,
        stale: p.stale,
      });
  if (books.investments)
    for (const p of investmentReplay(books.investments, today).positions)
      items.push({
        kind: "investments",
        sourceId: p.id,
        name: p.name,
        active: p.active,
        capital: p.kind === "cash" ? p.cash : p.cost,
        value: p.value,
        valueDate: p.valueDate,
        stale: p.stale,
      });
  if (books.funds)
    for (const p of fundReplay(books.funds).funds)
      items.push({
        kind: "funds",
        sourceId: p.id,
        name: {
          emergency: "Emergency",
          rainy_day: "Rainy Day",
          sinking: "Sinking",
        }[p.id],
        active: true,
        capital: p.balance,
        value: p.balance,
        valueDate: null,
        stale: false,
      });
  return {
    versions: {
      savings: books.savings?.version ?? 0,
      investments: books.investments?.version ?? 0,
      funds: books.funds?.version ?? 0,
    },
    items,
  };
}
