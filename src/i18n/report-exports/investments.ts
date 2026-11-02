import type { InvestmentReport } from "@/domain/investments/reports";
import type { Locale } from "../locale";
import { translator } from "../translate";

export function reportCSV(r: InvestmentReport, locale: Locale = "vi") {
  const tr = translator(locale, "investments");
  const cell = (v: string) =>
    `"${(/^[=+@\-\t\r\n]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const lines: string[][] = [
    [
      "Loại",
      "Ngày",
      "Danh mục",
      "Vốn đang đầu tư",
      "Giá trị tài sản đã mua",
      "Tiền chờ",
      "Tổng giá trị hiện tại",
      "Lãi/lỗ phần đang giữ",
      "Ngày định giá",
      "Nạp ngoài",
      "Rút ngoài",
      "Số tiền",
      "Phí",
      "Thuế",
      "Ghi chú",
    ].map((s) => tr(s)),
  ];
  for (const p of r.portfolios)
    lines.push([
      tr("Danh mục đầu tư"),
      r.asOf,
      p.name,
      p.cost,
      p.value ?? "",
      p.cash,
      p.total ?? "",
      p.unrealized ?? "",
      p.valueDate ?? "",
      "",
      "",
      "",
      "",
      "",
      p.value === null
        ? tr("Thiếu định giá")
        : p.stale
          ? tr("Định giá từ kỳ trước")
          : "",
    ]);
  for (const m of r.months)
    lines.push([
      tr("Tổng tháng"),
      m.month,
      "",
      m.cost ?? "",
      m.assetValue ?? "",
      m.cash ?? "",
      m.value ?? "",
      m.profit ?? "",
      "",
      m.inflow ?? "",
      m.outflow ?? "",
      "",
      "",
      "",
      m.provisional ? tr("Tạm tính") : "",
    ]);
  const names = new Map(r.after.positions.map((p) => [p.id, p.name]));
  const kinds = {
    openingCash: "Số dư ví mở đầu",
    openingInvestment: "Tài sản mở đầu",
    deposit: "Nạp tiền",
    withdraw: "Rút tiền",
    transfer: "Chuyển ví",
    buy: "Mua",
    sell: "Bán",
    valuation: "Định giá",
  };
  for (const e of r.effects)
    lines.push([
      tr(kinds[e.kind]),
      e.date,
      names.get(e.categoryId) ?? e.categoryId,
      "",
      "",
      "",
      "",
      "",
      "",
      BigInt(e.external) > 0n ? e.external : "0",
      BigInt(e.external) < 0n ? (-BigInt(e.external)).toString() : "0",
      e.net,
      e.fees,
      e.tax,
      e.note,
    ]);
  return "\ufeff" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
}
