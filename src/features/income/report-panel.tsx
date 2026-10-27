"use client";
import { formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { useChartTooltip } from "@/components/chart-tooltip";
import { ColumnTable } from "@/components/column-table";
import { useMoney } from "@/components/privacy";
import type { IncomeReport } from "@/domain/income/reports";
import type { IncomeRow } from "@/domain/income/types";
import { formatMonth as monthName } from "@/i18n/format";
import { ratio } from "@/domain/shared/money";
import { useState } from "react";
import { missingIncomeRows } from "./missing-income";
export function useDisplayMoney() {
  const money = useMoney();
  return (v: string | null) => (v === null ? "—" : money(v));
}
export function IncomeReports({
  report,
  onDetails,
  onEnter,
  today,
}: {
  report: IncomeReport;
  onDetails(month?: string): void;
  onEnter(row: IncomeRow): void;
  today: string;
}) {
  const { t: tr, locale, numberLocale } = useI18n("income");

  const money = useMoney();
  const displayMoney = useDisplayMoney();
  const tooltip = useChartTooltip();
  const activeMonth = report.months.find((m) => m.month === tooltip.active);
  const missing = missingIncomeRows(report.rows, today);
  const [chart, setChart] = useState("columns");
  const [sort, setSort] = useState<"name" | "total">("name");
  const categories = [...report.categories].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name, "vi")
      : BigInt(a.total ?? 0) === BigInt(b.total ?? 0)
        ? a.name.localeCompare(b.name, "vi")
        : BigInt(a.total ?? 0) > BigInt(b.total ?? 0)
          ? -1
          : 1,
  );
  const max = report.months
    .reduce((n, m) => (BigInt(m.total ?? 0) > n ? BigInt(m.total ?? 0) : n), 0n)
    .toString();
  const x = (i: number) =>
    55 + (i * 620) / Math.max(1, report.months.length - 1);
  const y = (amount: string) => 200 - ratio(amount, max) * 1.5;
  const shares =
    chart === "types"
      ? [
          { id: "fixed", name: tr("Cố định"), total: report.fixed },
          { id: "oneoff", name: tr("Thu phát sinh"), total: report.oneoff },
        ]
      : [
          ...categories,
          { id: "oneoff", name: tr("Thu phát sinh"), total: report.oneoff },
        ];
  return (
    <>
      <div className="expense-section-heading">
        <h2>{tr("Bảng thu nhập · VND")}</h2>
        <p className="expense-muted">
          {tr(
            "Bấm ô — được đánh dấu để nhập khoản còn thiếu. 0 ₫ xác nhận không có thu nhập.",
          )}
        </p>
      </div>
      <div className="income-table-wrap">
        <ColumnTable
          tableId="income-months"
          className="income-table"
          scrollLabel={tr("Bảng thu nhập theo tháng")}
        >
          <caption>
            {tr("Tổng đã ghi nhận năm")} {report.filter.year}
            {tr(", tháng")} {report.filter.from}–{report.filter.to}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                aria-sort={sort === "name" ? "ascending" : "none"}
              >
                <button onClick={() => setSort("name")}>
                  {tr("Khoản thu ↕")}
                </button>
              </th>
              {report.months.map((m) => (
                <th scope="col" key={m.month}>
                  {tr("Tháng")} {Number(m.month.slice(5))}
                </th>
              ))}
              <th
                scope="col"
                aria-sort={sort === "total" ? "descending" : "none"}
              >
                <button onClick={() => setSort("total")}>
                  {tr("Tổng kỳ ↕")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                {c.months.map((m) => (
                  <td key={m.month} title={m.name || undefined}>
                    {m.name && m.name !== c.name && (
                      <small>
                        {m.name}
                        <br />
                      </small>
                    )}
                    {(() => {
                      const row = missing.find(
                        (r) => r.categoryId === c.id && r.month === m.month,
                      );
                      return row ? (
                        <button
                          type="button"
                          className="income-missing-cell"
                          aria-label={tr("Nhập {0} · {1}", {
                            0: c.name,
                            1: monthName(m.month, locale),
                          })}
                          title={tr("Chưa nhập — bấm để bổ sung")}
                          onClick={() => onEnter(row)}
                        >
                          —
                        </button>
                      ) : (
                        <span
                          title={
                            m.amount === null
                              ? m.month > today.slice(0, 7)
                                ? tr("Chưa đến kỳ nhập")
                                : tr(
                                    "Ngoài thời gian hoạt động hoặc chưa có số thu",
                                  )
                              : undefined
                          }
                        >
                          {displayMoney(m.amount)}
                        </span>
                      );
                    })()}
                  </td>
                ))}
                <td>{displayMoney(c.total)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                <button className="income-link" onClick={() => onDetails()}>
                  {tr("Thu phát sinh · xem chi tiết")}
                </button>
              </th>
              {report.months.map((m) => (
                <td key={m.month}>
                  <button
                    className="income-link"
                    aria-label={tr("Thu phát sinh tháng {0}: {1}", {
                      0: Number(m.month.slice(5)),
                      1: displayMoney(m.oneoff),
                    })}
                    onClick={() => onDetails(m.month)}
                  >
                    {displayMoney(m.oneoff)}
                  </button>
                </td>
              ))}
              <td>{displayMoney(report.oneoff)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{tr("Tổng đã ghi nhận")}</th>
              {report.months.map((m) => (
                <td key={m.month}>
                  {displayMoney(m.total)}
                  {m.missing > 0 && (
                    <small className="status-badge status-missing">
                      {m.missing} {tr("danh mục chưa nhập")}
                    </small>
                  )}
                </td>
              ))}
              <td>{displayMoney(report.total)}</td>
            </tr>
          </tfoot>
        </ColumnTable>
      </div>
      <div className="income-quarter-grid">
        {report.quarters.map((q) => (
          <article key={q.quarter}>
            <h3>
              {tr("Quý")} {q.quarter}
            </h3>
            <p>{displayMoney(q.total)}</p>
            <small>{tr("Trong khoảng tháng đang lọc")}</small>
          </article>
        ))}
      </div>
      <section className="panel income-chart">
        <div className="expense-section-heading">
          <h2>{tr("Biểu đồ thu nhập")}</h2>
          <label className="income-select">
            {tr("Kiểu biểu đồ")}
            <select value={chart} onChange={(e) => setChart(e.target.value)}>
              <option value="columns">{tr("Cột theo tháng")}</option>
              <option value="line">{tr("Đường xu hướng")}</option>
              <option value="shares">{tr("Tỷ trọng danh mục")}</option>
              <option value="types">{tr("Cố định / Phát sinh")}</option>
            </select>
          </label>
        </div>
        <p className="expense-muted">
          {tr(
            "Đơn vị VND · chỉ gồm số đã ghi nhận. Bảng phía trên cung cấp số chính xác và dữ liệu chưa nhập.",
          )}
        </p>
        {report.total === null ? (
          <p className="expense-empty">
            {tr("Chưa có dữ liệu cho bộ lọc này.")}
          </p>
        ) : chart === "columns" || chart === "line" ? (
          <div {...tooltip.container}>
            <div className="income-chart-scroll" onScroll={tooltip.onScroll}>
              <svg
                viewBox="0 0 730 265"
                role="img"
                aria-label={
                  chart === "line"
                    ? tr("Xu hướng tổng thu theo tháng, đơn vị VND")
                    : tr("Cột tổng thu theo tháng, đơn vị VND")
                }
              >
                <title>{tr("Tổng đã ghi nhận theo tháng · VND")}</title>
                <line
                  x1="30"
                  x2="710"
                  y1="200"
                  y2="200"
                  className="income-axis"
                />
                <text x="30" y="20">
                  {money(max)}
                </text>
                <text x="10" y="205">
                  0
                </text>
                {chart === "line" &&
                  report.months
                    .slice(1)
                    .map((m, i) =>
                      m.total !== null && report.months[i].total !== null ? (
                        <line
                          key={m.month}
                          x1={x(i)}
                          y1={y(report.months[i].total!)}
                          x2={x(i + 1)}
                          y2={y(m.total)}
                          className="income-line"
                        />
                      ) : null,
                    )}
                {report.months.map((m, i) => (
                  <g
                    key={m.month}
                    {...tooltip.trigger(
                      m.month,
                      `${monthName(m.month, locale)}: ${displayMoney(m.total)}${m.total === null ? tr(", chưa có dữ liệu") : ""}${m.missing ? tr(", {0} danh mục chưa nhập", { 0: m.missing }) : ""}`,
                    )}
                  >
                    <title>
                      {formatMonth(m.month!, locale)}: {displayMoney(m.total)}
                      {m.missing
                        ? tr(" · {0} danh mục chưa nhập", { 0: m.missing })
                        : ""}
                    </title>
                    {m.total !== null ? (
                      chart === "columns" ? (
                        <rect
                          x={x(i) - Math.min(18, 200 / report.months.length)}
                          y={y(m.total)}
                          width={Math.min(36, 400 / report.months.length)}
                          height={Math.max(2, 200 - y(m.total))}
                          className="income-bar"
                        />
                      ) : (
                        <circle
                          cx={x(i)}
                          cy={y(m.total)}
                          r="6"
                          className="income-bar"
                        />
                      )
                    ) : (
                      <text x={x(i)} y="185" textAnchor="middle">
                        —
                      </text>
                    )}
                    <text x={x(i)} y="230" textAnchor="middle">
                      T{Number(m.month.slice(5))}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            {tooltip.tooltip(
              activeMonth && (
                <>
                  <strong>{monthName(activeMonth.month, locale)}</strong>
                  <span>
                    {tr("Tổng đã ghi nhận:")} {displayMoney(activeMonth.total)}
                  </span>
                  <span>
                    {tr("Cố định:")} {displayMoney(activeMonth.fixed)}{" "}
                    {tr("· Phát sinh:")} {displayMoney(activeMonth.oneoff)}
                  </span>
                  {activeMonth.missing > 0 && (
                    <span className="status-badge status-missing">
                      {activeMonth.missing} {tr("danh mục chưa nhập")}
                    </span>
                  )}
                </>
              ),
            )}
          </div>
        ) : (
          <div
            className="income-share-list"
            aria-label={tr("Tỷ trọng thu nhập")}
          >
            {shares
              .filter((s) => s.total !== null)
              .map((s) => (
                <div key={s.id}>
                  <div className="income-share-heading">
                    <strong>{s.name}</strong>
                    <span>
                      {displayMoney(s.total)} ·{" "}
                      {ratio(s.total!, report.total!).toLocaleString(
                        numberLocale,
                      )}
                      %
                    </span>
                  </div>
                  <div className="income-track" aria-hidden="true">
                    <div
                      style={{ width: `${ratio(s.total!, report.total!)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
        <p className="expense-muted">
          {tr("Tổng đã ghi nhận:")} {displayMoney(report.total)}.{" "}
          {report.missing > 0
            ? tr(
                "Còn {0} khoản thu cố định cần bổ sung; xem danh sách tháng phía trên.",
                { 0: report.missing },
              )
            : tr("Đã ghi nhận đủ các khoản đến hạn.")}{" "}
          {tr(
            "Dùng Tab để đọc điểm biểu đồ; đường không nối qua tháng thiếu dữ liệu.",
          )}
        </p>
      </section>
    </>
  );
}
