import type { WidgetId, SavedLayout } from "./layout";
import type { ExpenseView } from "../expenses/types";
import { summarize } from "../expenses/reports";
import type { IncomeView, IncomeRow } from "../income/types";
import type { SavingsView } from "../savings/types";
import type { InvestmentView } from "../investments/types";
import type { FundView } from "../funds/types";

export function sum(values: (string | null)[]) {
  return values.reduce<bigint>((a, v) => a + BigInt(v ?? "0"), 0n).toString();
}
function incomeTotal(rows: IncomeRow[]) {
  return rows.some((r) => r.amount !== null)
    ? sum(rows.map((r) => r.amount))
    : null;
}
export function expenseSummary(
  view: ExpenseView,
  widgets: readonly WidgetId[] = ["expenses", "allocation", "jars"],
) {
  const rows = view.rows.filter((r) => r.month === view.today.slice(0, 7));
  const total = summarize(rows, () => "month")[0];
  return {
    empty: !rows.length,
    total: total
      ? {
          spent: total.spent,
          target: total.target,
          provisional: total.provisional,
        }
      : null,
    ...(widgets.includes("jars")
      ? {
          jars: rows.map(
            ({ jarId, name, active, kind, closing, over, status }) => ({
              jarId,
              name,
              active,
              kind,
              closing,
              over,
              status,
            }),
          ),
        }
      : {}),
    ...(widgets.includes("allocation")
      ? {
          groups: summarize(rows, (r) => r.group || "Chưa phân nhóm")
            .map((r) => ({
              name: r.key,
              value: r.spent,
              unlabeled:
                r.key === "Chưa phân nhóm" &&
                !rows.some((row) => row.group === r.key),
            }))
            .sort((a, b) =>
              BigInt(a.value) > BigInt(b.value)
                ? -1
                : BigInt(a.value) < BigInt(b.value)
                  ? 1
                  : a.name.localeCompare(b.name),
            ),
        }
      : {}),
    over: rows.filter((r) => BigInt(r.over) > 0n).length,
  };
}
export function incomeSummary(view: IncomeView) {
  const rows = view.rows.filter((r) => r.month === view.today.slice(0, 7));
  return {
    empty: !rows.length,
    total: incomeTotal(rows),
    missing: rows.filter(
      (r) => r.kind === "fixed" && r.active && r.amount === null,
    ).length,
  };
}
export function savingsSummary(
  view: SavingsView,
  widgets: readonly WidgetId[] = ["savings", "maturities"],
) {
  const s = view.state;
  return {
    empty: !s.positions.length,
    total: s.total,
    knownValue: s.knownValue,
    missing: s.missing.length,
    stale: s.positions.filter((p) => p.stale).length,
    dueCount: view.due.length,
    ...(widgets.includes("maturities")
      ? {
          due: view.due
            .map(({ id, name, principal, maturity }) => ({
              id,
              name,
              principal,
              maturity,
            }))
            .sort(
              (a, b) =>
                a.maturity.localeCompare(b.maturity) ||
                a.id.localeCompare(b.id),
            )
            .slice(0, 5),
        }
      : {}),
  };
}
export function investmentSummary(view: InvestmentView) {
  const s = view.state,
    p = s.positions.filter((p) => p.kind === "investment");
  return {
    empty: !s.positions.length,
    total: s.total,
    knownValue: s.knownValue,
    missing: s.missing.length,
    stale: p.filter((p) => p.stale).length,
    unrealized: p.some((p) => p.unrealized === null)
      ? null
      : sum(p.map((p) => p.unrealized)),
  };
}
export function fundSummary(view: FundView) {
  return {
    empty: !view.book?.configurations.length,
    total: view.state.total,
    emergencyMonths: view.state.emergencyMonths,
    sourceChanged: view.sourceChanged,
    sourceUnavailable: view.sourceUnavailable,
  };
}
export interface OverviewData {
  expenses: ReturnType<typeof expenseSummary>;
  income: ReturnType<typeof incomeSummary>;
  savings: ReturnType<typeof savingsSummary>;
  investments: ReturnType<typeof investmentSummary>;
  funds: ReturnType<typeof fundSummary>;
}
export type SourceId = keyof OverviewData;
export type SourceResult<T> =
  { status: "ready"; data: T } | { status: "error" };
export type OverviewSummary = {
  today: string;
  fetchedAt: string;
  sources: { [K in SourceId]?: SourceResult<OverviewData[K]> };
};

export type OverviewResponse = OverviewSummary & { layout: SavedLayout };

export const widgetSources: Record<WidgetId, readonly SourceId[]> = {
  attention: [],
  income: ["income"],
  expenses: ["expenses"],
  savings: ["savings"],
  investments: ["investments"],
  funds: ["funds"],
  allocation: ["expenses"],
  jars: ["expenses"],
  maturities: ["savings"],
  peace: [],
};

/** Attention follows visible modules; internal dependencies never expand its scope. */
export function overviewSources(widgets: readonly WidgetId[]): SourceId[] {
  return [...new Set(widgets.flatMap((id) => widgetSources[id]))];
}
export function sourcesForWidget(
  id: WidgetId,
  widgets: readonly WidgetId[],
): readonly SourceId[] {
  return id === "attention" ? overviewSources(widgets) : widgetSources[id];
}

/** Optional detail lists are separate capabilities from their module's totals. */
export function overviewRequirements(widgets: readonly WidgetId[]): string[] {
  return [
    ...overviewSources(widgets),
    ...widgets.filter(
      (id) => id === "jars" || id === "allocation" || id === "maturities",
    ),
  ];
}
