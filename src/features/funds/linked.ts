import { positionKey } from "@/domain/funds/engine";
import type { FundState, FundView } from "@/domain/funds/types";

/** How a fund is shown when part of its balance follows Savings categories. */
export function fundDisplay(view: FundView, fund: FundState["funds"][number]) {
  const places = (view.book?.locations ?? []).filter(
    (l) => l.active && l.savings?.fundId === fund.id,
  );
  const reached =
    places.length > 0 && BigInt(fund.target) > 0n && fund.missing === "0";
  return {
    places,
    fromSavings: places
      .reduce(
        (sum, l) =>
          sum + BigInt(view.state.balances[positionKey(fund.id, l.id)] ?? "0"),
        0n,
      )
      .toString(),
    /** Money above the target in Savings simply means the fund is ready. */
    reached,
    percent: reached ? "100.00" : fund.percent,
  };
}
