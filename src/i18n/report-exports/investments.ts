import { sumMoney as sum } from "@/domain/shared/money";
import type { InvestmentReport } from "@/domain/investments/reports";
import type { Locale } from "../locale";
import { translator } from "../translate";
export function reportCSV(r: InvestmentReport, locale: Locale = "vi") {
  const tr = translator(locale, "errors");

  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      tr("Loại"),
      tr("Ngày"),
      tr("Danh mục / ID"),
      tr("Giá trị đầu kỳ VND"),
      tr("Giá trị cuối kỳ VND"),
      tr("Vốn còn lại VND"),
      tr("Ngày định giá"),
      tr("Kết quả kỳ VND"),
      tr("Nạp ngoài VND"),
      tr("Rút ngoài VND"),
      tr("Chuyển ròng VND"),
      tr("Mở đầu VND"),
      tr("Lãi/lỗ đã chốt kỳ VND"),
      tr("Lãi/lỗ chưa chốt VND"),
      tr("Phí/thuế VND"),
      tr("Ghi chú"),
    ],
  ];
  for (const c of r.categories)
    lines.push([
      tr("Tài sản"),
      r.asOf,
      c.name,
      c.startValue ?? "",
      c.value ?? "",
      c.cost,
      c.valueDate ?? "",
      c.result ?? "",
      c.inflow,
      c.outflow,
      c.internal,
      c.opening,
      c.realized,
      c.unrealized ?? "",
      c.fees,
      c.value === null
        ? tr("Thiếu định giá")
        : c.stale
          ? tr("Định giá từ kỳ trước")
          : "",
    ]);
  for (const m of r.months)
    lines.push([
      tr("Tổng tháng"),
      m.month,
      "",
      "",
      m.value ?? "",
      "",
      "",
      m.result ?? "",
      m.inflow ?? "",
      m.outflow ?? "",
      "",
      "",
      "",
      "",
      "",
      m.provisional ? tr("Tạm tính") : "",
    ]);
  for (const e of r.effects)
    lines.push([
      e.kind,
      e.date,
      e.categoryId,
      "",
      e.net,
      e.costSold,
      "",
      "",
      BigInt(e.external) > 0n ? e.external : "0",
      BigInt(e.external) < 0n ? (-BigInt(e.external)).toString() : "0",
      e.internal[e.categoryId] ?? "0",
      e.opening[e.categoryId] ?? "0",
      e.realized,
      "",
      (BigInt(e.fees) + BigInt(e.tax)).toString(),
      e.note,
    ]);
  lines.push([
    tr("Tổng kỳ"),
    r.asOf,
    "",
    r.before.total ?? "",
    r.after.total ?? "",
    "",
    "",
    r.result ?? "",
    r.activity.inflow,
    r.activity.outflow,
    r.reconciliation.internal,
    r.reconciliation.opening,
    r.activity.realized,
    r.after.total === null
      ? ""
      : sum(r.categories.map((c) => c.unrealized ?? "0")),
    r.activity.fees,
    r.activityFiltered
      ? tr("Lọc giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ")
      : "",
  ]);
  return "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}
