// Frozen pre-optimization DTO reducers used only to measure the former response.
import type { ExpenseView } from "../../src/domain/expenses/types";
import { summarize } from "../../src/domain/expenses/reports";
import type { IncomeView, IncomeRow } from "../../src/domain/income/types";
import type { SavingsView } from "../../src/domain/savings/types";
import type { InvestmentView } from "../../src/domain/investments/types";
import type { FundView } from "../../src/domain/funds/types";

export function sum(values: (string | null)[]) {
  return values.reduce<bigint>((a, v) => a + BigInt(v ?? "0"), 0n).toString();
}
function incomeTotal(rows: IncomeRow[]) {
  return rows.some((r) => r.amount !== null)
    ? sum(rows.map((r) => r.amount))
    : null;
}
export function expenseSummary(view: ExpenseView) {
  const rows = view.rows.filter((r) => r.month === view.today.slice(0, 7));
  return {
    empty: !rows.length,
    total: summarize(rows, () => "month")[0] ?? null,
    jars: rows.map(({ jarId, name, active, kind, closing, over, status }) => ({
      jarId,
      name,
      active,
      kind,
      closing,
      over,
      status,
    })),
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
    over: rows.filter((r) => BigInt(r.over) > 0n).length,
  };
}
export function incomeSummary(view: IncomeView) {
  const rows = view.rows.filter((r) => r.month === view.today.slice(0, 7));
  return {
    empty: !rows.length,
    total: incomeTotal(rows),
    fixed: incomeTotal(rows.filter((r) => r.kind === "fixed")),
    oneoff: incomeTotal(rows.filter((r) => r.kind === "oneoff")),
    missing: rows.filter(
      (r) => r.kind === "fixed" && r.active && r.amount === null,
    ).length,
  };
}
export function savingsSummary(view: SavingsView) {
  const s = view.state;
  return {
    empty: !s.positions.length,
    total: s.total,
    knownValue: s.knownValue,
    missing: s.missing.length,
    stale: s.positions.filter((p) => p.stale).length,
    kinds: (["cash", "deposit", "gold"] as const).map((kind) => {
      const p = s.positions.filter((p) => p.kind === kind);
      return {
        kind,
        value: p.some((p) => p.value === null)
          ? null
          : sum(p.map((p) => p.value)),
      };
    }),
    due: view.due
      .map(({ id, name, principal, maturity }) => ({
        id,
        name,
        principal,
        maturity,
      }))
      .sort(
        (a, b) =>
          a.maturity.localeCompare(b.maturity) || a.id.localeCompare(b.id),
      ),
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
    value: p.some((p) => p.value === null) ? null : sum(p.map((p) => p.value)),
    cost: sum(p.map((p) => p.cost)),
    unrealized: p.some((p) => p.unrealized === null)
      ? null
      : sum(p.map((p) => p.unrealized)),
    cash: sum(s.positions.filter((p) => p.kind === "cash").map((p) => p.cash)),
  };
}
export function fundSummary(view: FundView) {
  return {
    empty: !view.book?.configurations.length,
    funds: view.state.funds,
    total: view.state.total,
    emergencyMonths: view.state.emergencyMonths,
    sourceChanged: view.sourceChanged,
    sourceUnavailable: view.sourceUnavailable,
  };
}
