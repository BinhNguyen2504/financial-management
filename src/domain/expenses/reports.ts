import type { ExpenseRow, Money } from "./types";
import { ExpenseError } from "./engine";

export interface ReportFilter {
  year: number;
  from: number;
  to: number;
  kind?: string;
  jarId?: string;
  method?: string;
  group?: string;
}
export interface ReportItem {
  key: string;
  label: string;
  target: Money;
  required: Money;
  funding: Money;
  spent: Money;
  opening: Money;
  closing: Money;
  over: Money;
  provisional: boolean;
  planned: boolean;
}
export function selectRows(
  rows: ExpenseRow[],
  filter: ReportFilter,
): ExpenseRow[] {
  return rows.filter(
    (r) =>
      Number(r.month.slice(0, 4)) === filter.year &&
      Number(r.month.slice(5)) >= filter.from &&
      Number(r.month.slice(5)) <= filter.to &&
      (!filter.kind || r.kind === filter.kind) &&
      (!filter.jarId || r.jarId === filter.jarId) &&
      (!filter.method || r.method === filter.method) &&
      (!filter.group || r.group === filter.group),
  );
}
export function summarize(
  rows: ExpenseRow[],
  key: (row: ExpenseRow) => string,
): ReportItem[] {
  const groups = new Map<string, ExpenseRow[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return [...groups].map(([k, group]) => {
    const sum = (field: "target" | "required" | "spent" | "over") =>
      group.reduce((n, r) => n + BigInt(r[field]), 0n).toString();
    const actual = group.filter((r) => r.status !== "planned");
    const byJar = new Map<string, ExpenseRow[]>();
    for (const row of actual)
      byJar.set(row.jarId, [...(byJar.get(row.jarId) ?? []), row]);
    let opening = 0n,
      closing = 0n;
    for (const jar of byJar.values()) {
      jar.sort((a, b) => a.month.localeCompare(b.month));
      opening += BigInt(jar[0].opening);
      closing += BigInt(jar[jar.length - 1].closing);
    }
    return {
      key: k,
      label: k,
      target: sum("target"),
      required: sum("required"),
      spent: sum("spent"),
      over: sum("over"),
      funding: actual
        .reduce((n, r) => n + BigInt(r.funding) + BigInt(r.extra), 0n)
        .toString(),
      opening: opening.toString(),
      closing: closing.toString(),
      provisional: actual.some((r) => r.status === "provisional"),
      planned: group.every((r) => r.status === "planned"),
    };
  });
}
export function buildReport(
  rows: ExpenseRow[],
  filter: ReportFilter,
  currentYear: number,
) {
  if (filter.year !== currentYear)
    throw new ExpenseError(
      "Báo cáo tương tác chỉ dành cho năm hiện tại. Xem năm cũ trong Lưu trữ.",
    );
  if (
    !Number.isInteger(filter.from) ||
    !Number.isInteger(filter.to) ||
    filter.from < 1 ||
    filter.to > 12 ||
    filter.from > filter.to
  )
    throw new ExpenseError("Khoảng tháng không hợp lệ.");
  const selected = selectRows(rows, filter);
  const byMonth = summarize(selected, (r) => r.month);
  const namedJars = (subset: ExpenseRow[]) =>
    summarize(subset, (r) => r.jarId).map((item) => ({
      ...item,
      label: subset
        .filter((r) => r.jarId === item.key)
        .sort((a, b) => b.month.localeCompare(a.month))[0].name,
    }));
  return {
    filter,
    totals: summarize(selected, () => "total")[0] ?? null,
    byMonth,
    byJar: namedJars(selected),
    byMethod: summarize(selected, (r) => r.method),
    byGroup: summarize(selected, (r) => r.group || "Chưa phân nhóm"),
    accumulation: namedJars(selected.filter((r) => r.kind === "accumulation")),
  };
}
