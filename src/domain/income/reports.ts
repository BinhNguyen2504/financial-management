import { z } from "zod";
import { yearSchema } from "./schema";
import type { IncomeRow, IncomeView } from "./types";
export const reportFilterSchema = z
  .object({
    year: yearSchema,
    from: z.number().int().min(1).max(12).default(1),
    to: z.number().int().min(1).max(12).default(12),
    kind: z.enum(["all", "fixed", "oneoff"]).default("all"),
    categoryId: z.uuid().optional(),
  })
  .refine((f) => f.from <= f.to, "Khoảng tháng không hợp lệ.");
export type ReportFilter = z.infer<typeof reportFilterSchema>;
const sum = (rows: IncomeRow[]) =>
  rows.reduce((n, r) => n + BigInt(r.amount ?? "0"), 0n).toString();
const value = (rows: IncomeRow[]) =>
  rows.some((r) => r.amount !== null) ? sum(rows) : null;
export function buildReport(view: IncomeView, input: ReportFilter) {
  const filter = reportFilterSchema.parse(input);
  if (view.year !== filter.year) throw new Error("Report year mismatch");
  const rows = view.rows.filter((r) => {
    const m = Number(r.month.slice(5));
    return (
      m >= filter.from &&
      m <= filter.to &&
      (filter.kind === "all" || r.kind === filter.kind) &&
      (!filter.categoryId || r.categoryId === filter.categoryId)
    );
  });
  const months = Array.from({ length: filter.to - filter.from + 1 }, (_, i) => {
    const month = `${filter.year}-${String(filter.from + i).padStart(2, "0")}`;
    const group = rows.filter((r) => r.month === month);
    return {
      month,
      total: value(group),
      fixed: value(group.filter((r) => r.kind === "fixed")),
      oneoff: value(group.filter((r) => r.kind === "oneoff")),
      missing: group.filter(
        (r) =>
          r.kind === "fixed" &&
          r.amount === null &&
          r.month <= view.today.slice(0, 7),
      ).length,
    };
  });
  const ids = [
    ...new Set(rows.filter((r) => r.kind === "fixed").map((r) => r.key)),
  ];
  const categories = ids.map((id) => {
    const group = rows
      .filter((r) => r.kind === "fixed" && r.key === id)
      .sort((a, b) => a.month.localeCompare(b.month));
    return {
      id,
      name: group.at(-1)!.name,
      total: value(group),
      months: months.map((m) => ({
        month: m.month,
        amount: value(group.filter((r) => r.month === m.month)),
        name: group.find((r) => r.month === m.month)?.name ?? "",
      })),
    };
  });
  const oneOffs = rows.filter((r) => r.kind === "oneoff");
  return {
    filter,
    rows,
    months,
    categories,
    oneOffs,
    total: value(rows),
    fixed: value(rows.filter((r) => r.kind === "fixed")),
    oneoff: value(oneOffs),
    missing: months.reduce((n, m) => n + m.missing, 0),
    quarters: [1, 2, 3, 4].map((q) => ({
      quarter: q,
      total: value(
        rows.filter((r) => Math.ceil(Number(r.month.slice(5)) / 3) === q),
      ),
    })),
  };
}
export type IncomeReport = ReturnType<typeof buildReport>;
export function reportCSV(report: IncomeReport) {
  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      "Loại",
      "ID",
      "Tên",
      "Tháng",
      "Số tiền VND",
      "Trạng thái",
      "Mô tả / ghi chú",
    ],
  ];
  for (const m of report.months)
    lines.push([
      "Tổng tháng",
      "",
      "Tổng đã ghi nhận",
      m.month,
      m.total ?? "",
      m.total === null ? "Chưa có dữ liệu" : `${m.missing} danh mục chưa nhập`,
      "",
    ]);
  for (const r of report.rows)
    lines.push([
      r.kind === "fixed" ? "Cố định" : "Phát sinh",
      r.key,
      r.name,
      r.month,
      r.amount ?? "",
      r.amount === null ? "Chưa nhập" : "Đã ghi nhận",
      [r.description, r.note].filter(Boolean).join("; "),
    ]);
  lines.push([
    "Tổng kỳ",
    "",
    "Tổng đã ghi nhận",
    `${report.filter.year}/${report.filter.from}-${report.filter.to}`,
    report.total ?? "",
    "",
    "",
  ]);
  return "\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n");
}
