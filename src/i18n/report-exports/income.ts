import type { IncomeReport } from "@/domain/income/reports";
import type { Locale } from "../locale";
import { translator } from "../translate";
export function reportCSV(report: IncomeReport, locale: Locale = "vi") {
  const tr = translator(locale, "errors");

  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      tr("Loại"),
      "ID",
      tr("Tên"),
      tr("Tháng"),
      tr("Số tiền VND"),
      tr("Trạng thái"),
      tr("Mô tả / ghi chú"),
    ],
  ];
  for (const m of report.months)
    lines.push([
      tr("Tổng tháng"),
      "",
      tr("Tổng đã ghi nhận"),
      m.month,
      m.total ?? "",
      m.total === null
        ? tr("Chưa có dữ liệu")
        : tr("{0} danh mục chưa nhập", { 0: m.missing }),
      "",
    ]);
  for (const r of report.rows)
    lines.push([
      r.kind === "fixed" ? tr("Cố định") : tr("Phát sinh"),
      r.key,
      r.name,
      r.month,
      r.amount ?? "",
      r.amount === null ? tr("Chưa nhập") : tr("Đã ghi nhận"),
      [r.description, r.note].filter(Boolean).join("; "),
    ]);
  lines.push([
    tr("Tổng kỳ"),
    "",
    tr("Tổng đã ghi nhận"),
    `${report.filter.year}/${report.filter.from}-${report.filter.to}`,
    report.total ?? "",
    "",
    "",
  ]);
  return "\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n");
}
