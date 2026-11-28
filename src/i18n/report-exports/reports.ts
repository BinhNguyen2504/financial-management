import type { Report } from "@/domain/reports/model";
import { TEXT } from "@/domain/reports/health";
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
  if (report.overview) {
    const { assets, indicators } = report.overview;
    lines.push(
      [],
      [t("Tài sản đã ghi nhận"), assets.total ?? ""],
      [t("Tính đến ngày {date}", { date: assets.asOf })],
      [
        t("So với ngày {date}", { date: assets.openingDate }),
        assets.opening ?? "",
        assets.delta ?? "",
        assets.percent ?? "",
      ],
      [
        t("Phần Quỹ lấy từ Tiết kiệm đã được trừ khỏi tổng"),
        assets.linked ?? "",
      ],
      ...[...assets.reasons, ...assets.notes].map((reason) => [t(reason)]),
    );
    if (assets.changeReason) lines.push([t(assets.changeReason)]);
    if (assets.sources.some((source) => source.stale))
      lines.push([t("Tổng đang dùng một số định giá cũ.")]);
    if (assets.openingStale)
      lines.push([t("Số đầu kỳ dùng một số định giá cũ.")]);
    lines.push([t("Cơ cấu tài sản"), "VND", "%"]);
    for (const item of assets.composition)
      lines.push([t(item.label), item.value ?? "", item.share ?? ""]);
    lines.push(
      [
        t(
          "Chỉ gồm Tiết kiệm, Đầu tư và Quỹ an toàn. Chưa trừ nợ nên không phải tài sản ròng. Tiền bạn tự nhập ở hai sổ vẫn có thể bị cộng trùng. Không gồm tiền còn trong hũ Chi tiêu và sổ riêng của Mục tiêu.",
        ),
      ],
      [],
      [t("Sức khỏe tài chính")],
    );
    for (const item of indicators) {
      // The same basis the screen shows: a fallback month or today's state is not the period.
      const basis =
        item.id === "emergency"
          ? t("Số dư tại ngày {date}.", { date: report.period.asOf })
          : item.id === "goals"
            ? t("Theo trạng thái hôm nay, không phụ thuộc kỳ báo cáo.")
            : item.fallback && item.months.length
              ? t(
                  "Kỳ đang chọn chưa có tháng kết thúc nên xét tháng gần nhất: {month}.",
                  { month: item.months[0].month },
                )
              : "";
      lines.push(
        [t(item.label), t(TEXT.rating[item.rating])],
        ...(item.value ? [[t(item.value.label), item.value.value ?? ""]] : []),
        ...item.facts.map((fact) => [t(fact.label), fact.value ?? ""]),
        ...item.months.map((m) => [
          m.month,
          m.excluded ? t(m.excluded) : t("Tháng được tính"),
        ]),
        ...(basis ? [[basis]] : []),
        ...(item.reason ? [[t(item.reason)]] : []),
        [t(item.suggestion)],
        [t("Cách tính"), t(item.formula)],
      );
    }
  }
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
