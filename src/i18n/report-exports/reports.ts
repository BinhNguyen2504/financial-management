import type { Report } from "@/domain/reports/model";
import type { Locale } from "../locale";
import { translator } from "../translate";

export function reportCSV(report: Report, locale: Locale = "vi") {
  const t = translator(locale, "reports");
  const lines: string[][] = [
    [t("Báo cáo"), report.query.tab, "VND", "Asia/Ho_Chi_Minh"],
    [t("Kỳ này"), report.period.from, report.period.to],
    [t("Số liệu đến"), report.period.asOf],
    [
      t("Kỳ trước đầy đủ"),
      report.previousPeriod.from,
      report.previousPeriod.to,
    ],
    [t("Cập nhật lúc"), report.generatedAt],
  ];
  if (report.period.partial)
    lines.push([
      t("Kỳ này chưa kết thúc"),
      t("So sánh kỳ chưa kết thúc với toàn bộ kỳ trước."),
    ]);
  if (report.period.future)
    lines.push([t("Kỳ này chưa diễn ra; chưa có số thực tế.")]);
  for (const [source, state] of Object.entries(report.sources))
    lines.push([
      source,
      t(
        state.status === "error"
          ? "Lỗi tải nguồn"
          : state.empty
            ? "Chưa có dữ liệu"
            : "Đã ghi nhận",
      ),
    ]);
  for (const warning of report.warnings) lines.push([t(warning)]);
  lines.push([
    t("Nguồn số liệu"),
    t("Kỳ này"),
    t("Kỳ trước"),
    t("Chênh lệch"),
    "%",
  ]);
  for (const m of report.metrics)
    lines.push([
      t(m.label),
      m.value ?? "",
      m.previous ?? "",
      m.delta ?? "",
      m.percent ?? "",
    ]);
  for (const table of report.tables) {
    if (table.id === "goals.current")
      lines.push([
        t(
          "Mục tiêu hiển thị tiến độ hiện tại, độc lập với kỳ báo cáo đang chọn.",
        ),
        report.generatedAt,
      ]);
    lines.push(
      [],
      [t(table.title)],
      table.columns.map((c) => t(c.label)),
    );
    for (const row of table.rows)
      lines.push(
        table.columns.map((c) => {
          const value = row[c.key] ?? "";
          return ["kind", "status", "mode"].includes(c.key) ? t(value) : value;
        }),
      );
  }
  const cell = (value: string) =>
    `"${((/^[=+@-]/.test(value.trimStart()) || /^[\t\r\n]/.test(value)) && !/^-?\d+(?:\.\d+)?$/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return "\uFEFF" + lines.map((line) => line.map(cell).join(",")).join("\r\n");
}
