"use client";
import { useState } from "react";
import type { IncomeReport } from "@/domain/income/reports";
import { ratio } from "@/features/expenses/format";
import { useMoney } from "@/components/privacy";
export function useDisplayMoney() {
  const money = useMoney();
  return (v: string | null) => (v === null ? "—" : money(v));
}
export function IncomeReports({
  report,
  onDetails,
}: {
  report: IncomeReport;
  onDetails(month?: string): void;
}) {
  const money = useMoney();
  const displayMoney = useDisplayMoney();
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
          { id: "fixed", name: "Cố định", total: report.fixed },
          { id: "oneoff", name: "Thu phát sinh", total: report.oneoff },
        ]
      : [
          ...categories,
          { id: "oneoff", name: "Thu phát sinh", total: report.oneoff },
        ];
  return (
    <>
      <div className="expense-section-heading">
        <h2>Bảng thu nhập · VND</h2>
        <p className="expense-muted">
          Dấu — là chưa có số thu; 0 ₫ là đã ghi nhận bằng 0.
        </p>
      </div>
      <div
        className="income-table-wrap"
        role="region"
        aria-label="Bảng thu nhập theo tháng"
        tabIndex={0}
      >
        <table className="income-table">
          <caption>
            Tổng đã ghi nhận năm {report.filter.year}, tháng{" "}
            {report.filter.from}–{report.filter.to}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                aria-sort={sort === "name" ? "ascending" : "none"}
              >
                <button onClick={() => setSort("name")}>Khoản thu ↕</button>
              </th>
              {report.months.map((m) => (
                <th scope="col" key={m.month}>
                  Tháng {Number(m.month.slice(5))}
                </th>
              ))}
              <th
                scope="col"
                aria-sort={sort === "total" ? "descending" : "none"}
              >
                <button onClick={() => setSort("total")}>Tổng kỳ ↕</button>
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
                    {displayMoney(m.amount)}
                  </td>
                ))}
                <td>{displayMoney(c.total)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                <button className="income-link" onClick={() => onDetails()}>
                  Thu phát sinh · xem chi tiết
                </button>
              </th>
              {report.months.map((m) => (
                <td key={m.month}>
                  <button
                    className="income-link"
                    aria-label={`Thu phát sinh tháng ${Number(m.month.slice(5))}: ${displayMoney(m.oneoff)}`}
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
              <th scope="row">Tổng đã ghi nhận</th>
              {report.months.map((m) => (
                <td key={m.month}>
                  {displayMoney(m.total)}
                  {m.missing > 0 && (
                    <small>{m.missing} danh mục chưa nhập</small>
                  )}
                </td>
              ))}
              <td>{displayMoney(report.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="income-quarter-grid">
        {report.quarters.map((q) => (
          <article key={q.quarter}>
            <h3>Quý {q.quarter}</h3>
            <p>{displayMoney(q.total)}</p>
            <small>Trong khoảng tháng đang lọc</small>
          </article>
        ))}
      </div>
      <section className="panel income-chart">
        <div className="expense-section-heading">
          <h2>Biểu đồ thu nhập</h2>
          <label className="income-select">
            Kiểu biểu đồ
            <select value={chart} onChange={(e) => setChart(e.target.value)}>
              <option value="columns">Cột theo tháng</option>
              <option value="line">Đường xu hướng</option>
              <option value="shares">Tỷ trọng danh mục</option>
              <option value="types">Cố định / Phát sinh</option>
            </select>
          </label>
        </div>
        <p className="expense-muted">
          Đơn vị VND · chỉ gồm số đã ghi nhận. Bảng phía trên cung cấp số chính
          xác và dữ liệu chưa nhập.
        </p>
        {report.total === null ? (
          <p className="expense-empty">Chưa có dữ liệu cho bộ lọc này.</p>
        ) : chart === "columns" || chart === "line" ? (
          <div className="income-chart-scroll">
            <svg
              viewBox="0 0 730 265"
              role="img"
              aria-label={
                chart === "line"
                  ? "Xu hướng tổng thu theo tháng, đơn vị VND"
                  : "Cột tổng thu theo tháng, đơn vị VND"
              }
            >
              <title>Tổng đã ghi nhận theo tháng · VND</title>
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
                  tabIndex={0}
                  role="img"
                  aria-label={`Tháng ${Number(m.month.slice(5))}: ${displayMoney(m.total)}${m.total === null ? ", chưa có dữ liệu" : ""}${m.missing ? `, ${m.missing} danh mục chưa nhập` : ""}`}
                >
                  <title>
                    {m.month}: {displayMoney(m.total)}
                    {m.missing ? ` · ${m.missing} danh mục chưa nhập` : ""}
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
        ) : (
          <div className="income-share-list" aria-label="Tỷ trọng thu nhập">
            {shares
              .filter((s) => s.total !== null)
              .map((s) => (
                <div key={s.id}>
                  <div className="income-share-heading">
                    <strong>{s.name}</strong>
                    <span>
                      {displayMoney(s.total)} ·{" "}
                      {ratio(s.total!, report.total!).toLocaleString("vi-VN")}%
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
          Tổng đã ghi nhận: {displayMoney(report.total)}. {report.missing} danh
          mục–tháng đã đến còn chưa nhập. Dùng Tab để đọc điểm biểu đồ; đường
          không nối qua tháng thiếu dữ liệu.
        </p>
      </section>
    </>
  );
}
