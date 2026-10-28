"use client";
import { StatusBadge } from "@/components/status-badge";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";

import { ColumnTable } from "@/components/column-table";
import { useMoney } from "@/components/privacy";
import { buildReport } from "@/domain/expenses/reports";
import type { ExpenseView } from "@/domain/expenses/types";
import { useState } from "react";
import { ReportChart } from "./charts";

export function ExpenseReports({
  view,
  filters,
}: {
  view: ExpenseView;
  filters: { kind: string; method: string; group: string };
}) {
  const { t: tr } = useI18n("expenses");

  const money = useMoney();
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [jarId, setJarId] = useState("");
  const [perspective, setPerspective] = useState("months");
  const [display, setDisplay] = useState("chart");
  const report = buildReport(
    view.rows,
    { year: view.currentYear, from, to, jarId, ...filters },
    view.currentYear,
  );
  const options = [
    ...new Map(
      view.rows
        .filter((r) => r.month.startsWith(String(view.currentYear)))
        .map((r) => [r.jarId, r.name]),
    ).entries(),
  ];
  const sourceItems =
    perspective === "methods" || perspective === "funding"
      ? report.byMethod
      : perspective === "groups"
        ? report.byGroup
        : perspective === "jars"
          ? report.byJar
          : perspective === "accumulation"
            ? report.accumulation
            : report.byMonth;
  const items = sourceItems.map((item) =>
    item.labelKey ? { ...item, label: tr(item.labelKey) } : item,
  );
  const field =
    perspective === "funding"
      ? "required"
      : perspective === "accumulation"
        ? "closing"
        : "spent";
  const accumulation = perspective === "accumulation";
  return (
    <section
      className="panel expense-report"
      aria-labelledby="expense-report-title"
    >
      <div className="expense-section-heading">
        <div>
          <p className="eyebrow">
            {tr("NĂM")} {view.currentYear}
          </p>
          <h2 id="expense-report-title">{tr("Báo cáo chi tiêu")}</h2>
        </div>
        <ScrollTabs
          className="expense-segment"
          role="group"
          aria-label={tr("Cách trình bày báo cáo")}
        >
          <button
            aria-pressed={display === "table"}
            onClick={() => setDisplay("table")}
          >
            {tr("Bảng")}
          </button>
          <button
            aria-pressed={display === "chart"}
            onClick={() => setDisplay("chart")}
          >
            {tr("Biểu đồ")}
          </button>
        </ScrollTabs>
      </div>
      <div className="expense-filters">
        <label>
          {tr("Kỳ báo cáo")}
          <select
            value={`${from}-${to}`}
            onChange={(e) => {
              const [a, b] = e.target.value.split("-").map(Number);
              if (a) {
                setFrom(a);
                setTo(b);
              }
            }}
          >
            <option value="1-12">{tr("Cả năm")}</option>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={`${q * 3 - 2}-${q * 3}`}>
                {tr("Quý")} {q}
              </option>
            ))}
            <option value={`${from}-${to}`}>{tr("Khoảng đang chọn")}</option>
          </select>
        </label>
        <label>
          {tr("Từ tháng")}
          <select
            value={from}
            onChange={(e) => {
              const n = Number(e.target.value);
              setFrom(n);
              if (n > to) setTo(n);
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Đến tháng")}
          <select
            value={to}
            onChange={(e) => {
              const n = Number(e.target.value);
              setTo(n);
              if (n < from) setFrom(n);
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Khoản chi")}
          <select value={jarId} onChange={(e) => setJarId(e.target.value)}>
            <option value="">{tr("Tất cả hũ")}</option>
            {options.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Góc nhìn")}
          <select
            value={perspective}
            onChange={(e) => setPerspective(e.target.value)}
          >
            <option value="months">{tr("Tổng chi từng tháng")}</option>
            <option value="trend">{tr("Diễn biến theo tháng")}</option>
            <option value="jars">{tr("Theo khoản chi")}</option>
            <option value="methods">{tr("Theo phương thức")}</option>
            <option value="groups">{tr("Theo nhóm mục đích")}</option>
            <option value="funding">
              {tr("Tiền cần thêm theo phương thức")}
            </option>
            <option value="accumulation">{tr("Tích lũy và sử dụng")}</option>
          </select>
        </label>
      </div>
      <p className="expense-notice">
        {tr(
          "Tiền góp vào hũ tích lũy được tính riêng với tiền đã sử dụng. Tháng hiện tại có số tạm tính; tháng tương lai chỉ có kế hoạch. “Tiền cần thêm” là đề xuất ban đầu, chưa bao gồm tiền bổ sung.",
        )}
      </p>
      {report.totals && (
        <div className="expense-report-totals">
          <span>
            {tr("Thực chi:")} <strong>{money(report.totals.spent)}</strong>
          </span>
          <span>
            {tr("Đã bỏ hũ:")} <strong>{money(report.totals.funding)}</strong>
          </span>
          <span>
            {tr("Mức kế hoạch:")} <strong>{money(report.totals.target)}</strong>
          </span>
        </div>
      )}
      {display === "chart" ? (
        <ReportChart
          items={items}
          field={field}
          trend={perspective === "trend"}
          composition={["jars", "methods", "groups"].includes(perspective)}
        />
      ) : (
        <div className="expense-table-scroll">
          <ColumnTable tableId="expenses-report-panel-1">
            <caption className="sr-only">
              {tr("Báo cáo chi tiêu năm")} {view.currentYear}
              {tr(", tháng")} {from} {tr("đến")} {to}
              {tr(", đơn vị VND")}
            </caption>
            <thead>
              <tr>
                <th>{tr("Kỳ / khoản")}</th>
                {accumulation && <th>{tr("Số đầu kỳ")}</th>}
                <th>
                  {perspective === "funding"
                    ? tr("Tiền cần thêm")
                    : tr("Mức kế hoạch")}
                </th>
                <th>{tr("Đã bỏ hũ")}</th>
                <th>{tr("Thực chi")}</th>
                {accumulation ? (
                  <th>{tr("Còn lại")}</th>
                ) : (
                  <th>{tr("Vượt mức")}</th>
                )}
                <th>{tr("Trạng thái")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.key}>
                  <th>
                    {/^20\d{2}-\d{2}$/.test(r.label)
                      ? tr("Tháng {0}", { 0: Number(r.label.slice(5)) })
                      : r.label}
                  </th>
                  {accumulation && <td>{money(r.opening)}</td>}
                  <td>
                    {money(perspective === "funding" ? r.required : r.target)}
                  </td>
                  <td>{money(r.funding)}</td>
                  <td>{money(r.spent)}</td>
                  <td>{money(accumulation ? r.closing : r.over)}</td>
                  <td>
                    <StatusBadge
                      size="compact"
                      tone={
                        r.planned
                          ? "info"
                          : r.provisional
                            ? "warning"
                            : "success"
                      }
                    >
                      {r.planned
                        ? tr("Kế hoạch")
                        : r.provisional
                          ? tr("Có tạm tính")
                          : tr("Đã kết thúc")}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </ColumnTable>
          {!items.length && (
            <p className="expense-empty">
              {tr("Chưa có dữ liệu cho bộ lọc này.")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
