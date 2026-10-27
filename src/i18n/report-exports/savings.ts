import { sumMoney as sum } from "@/domain/shared/money";
import type { SavingsReport } from "@/domain/savings/reports";
import type { Locale } from "../locale";
import { translator } from "../translate";
export function reportCSV(r: SavingsReport, locale: Locale = "vi") {
  const tr = translator(locale, "errors");

  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      tr("Loại"),
      tr("Ngày / tháng"),
      tr("Danh mục / ID"),
      tr("Đầu kỳ VND"),
      tr("Cuối kỳ / giá trị VND"),
      tr("Số lượng"),
      tr("Giá vốn VND"),
      tr("Giá VND/đơn vị"),
      tr("Ngày giá"),
      tr("Nạp ròng / kết quả VND"),
      tr("Ghi chú"),
      tr("Nạp ngoài VND"),
      tr("Rút ngoài VND"),
      tr("Chuyển ròng VND"),
      tr("Vốn mở đầu VND"),
      tr("Lãi nhận VND"),
      tr("Lãi/lỗ đã chốt VND"),
      tr("Lãi/lỗ chưa chốt VND"),
      tr("Phí/thuế VND"),
    ],
  ];
  for (const c of r.categories)
    lines.push([
      tr("Tài sản"),
      r.asOf,
      c.name,
      c.startValue ?? "",
      c.value ?? "",
      c.quantity,
      c.cost,
      c.price ?? "",
      c.priceDate ?? "",
      c.result ?? "",
      c.value === null
        ? tr("Thiếu định giá")
        : c.stale
          ? tr("Giá từ tháng trước")
          : "",
      c.inflow,
      c.outflow,
      c.internal,
      c.opening,
      c.interest,
      c.realized,
      c.unrealized ?? "",
      c.fees,
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
      "",
      "",
      m.result ?? "",
      m.provisional
        ? tr("Tạm tính")
        : m.missing.length
          ? tr("Thiếu định giá")
          : "",
      m.inflow ?? "",
      m.outflow ?? "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  for (const e of r.effects)
    lines.push([
      e.kind,
      e.date,
      e.categoryId,
      "",
      e.net,
      e.quantity,
      e.costSold,
      "",
      "",
      e.external,
      e.note,
      BigInt(e.external) > 0n ? e.external : "0",
      BigInt(e.external) < 0n ? (-BigInt(e.external)).toString() : "0",
      e.internal[e.categoryId] ?? "0",
      e.opening[e.categoryId] ?? "0",
      e.interest,
      e.realized,
      "",
      e.fees,
    ]);
  lines.push([
    tr("Tổng kỳ"),
    r.asOf,
    "",
    r.before.total ?? "",
    r.after.total ?? "",
    "",
    "",
    "",
    "",
    r.result ?? "",
    r.activityFiltered
      ? tr("Lọc loại giao dịch chỉ áp dụng hoạt động; số dư giữ đầy đủ")
      : "",
    r.activity.inflow,
    r.activity.outflow,
    r.reconciliation.internal,
    r.reconciliation.opening,
    r.activity.interest,
    r.activity.realized,
    r.after.total === null
      ? ""
      : sum(r.categories.map((c) => c.unrealized ?? "0")),
    r.activity.fees,
  ]);
  return "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}
