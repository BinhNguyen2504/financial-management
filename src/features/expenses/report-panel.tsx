"use client";
import { useState } from "react";
import type { ExpenseView } from "@/domain/expenses/types";
import { buildReport } from "@/domain/expenses/reports";
import { useMoney } from "@/components/privacy";
import { ReportChart } from "./charts";

export function ExpenseReports({
  view,
  filters,
}: {
  view: ExpenseView;
  filters: { kind: string; method: string; group: string };
}) {
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
  const items =
    perspective === "methods" || perspective === "funding"
      ? report.byMethod
      : perspective === "groups"
        ? report.byGroup
        : perspective === "jars"
          ? report.byJar
          : perspective === "accumulation"
            ? report.accumulation
            : report.byMonth;
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
          <p className="eyebrow">NĂM {view.currentYear}</p>
          <h2 id="expense-report-title">Báo cáo chi tiêu</h2>
        </div>
        <div
          className="expense-segment"
          role="group"
          aria-label="Cách trình bày báo cáo"
        >
          <button
            aria-pressed={display === "table"}
            onClick={() => setDisplay("table")}
          >
            Bảng
          </button>
          <button
            aria-pressed={display === "chart"}
            onClick={() => setDisplay("chart")}
          >
            Biểu đồ
          </button>
        </div>
      </div>
      <div className="expense-filters">
        <label>
          Kỳ báo cáo
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
            <option value="1-12">Cả năm</option>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={`${q * 3 - 2}-${q * 3}`}>
                Quý {q}
              </option>
            ))}
            <option value={`${from}-${to}`}>Khoảng đang chọn</option>
          </select>
        </label>
        <label>
          Từ tháng
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
          Đến tháng
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
          Khoản chi
          <select value={jarId} onChange={(e) => setJarId(e.target.value)}>
            <option value="">Tất cả hũ</option>
            {options.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Góc nhìn
          <select
            value={perspective}
            onChange={(e) => setPerspective(e.target.value)}
          >
            <option value="months">Tổng chi từng tháng</option>
            <option value="trend">Diễn biến theo tháng</option>
            <option value="jars">Theo khoản chi</option>
            <option value="methods">Theo phương thức</option>
            <option value="groups">Theo nhóm mục đích</option>
            <option value="funding">Tiền cần thêm theo phương thức</option>
            <option value="accumulation">Tích lũy và sử dụng</option>
          </select>
        </label>
      </div>
      <p className="expense-notice">
        Tiền góp vào hũ tích lũy được tính riêng với tiền đã sử dụng. Tháng hiện
        tại có số tạm tính; tháng tương lai chỉ có kế hoạch. “Tiền cần thêm” là
        đề xuất ban đầu, chưa bao gồm tiền bổ sung.
      </p>
      {report.totals && (
        <div className="expense-report-totals">
          <span>
            Thực chi: <strong>{money(report.totals.spent)}</strong>
          </span>
          <span>
            Đã bỏ hũ: <strong>{money(report.totals.funding)}</strong>
          </span>
          <span>
            Mức kế hoạch: <strong>{money(report.totals.target)}</strong>
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
          <table>
            <caption className="sr-only">
              Báo cáo chi tiêu năm {view.currentYear}, tháng {from} đến {to},
              đơn vị VND
            </caption>
            <thead>
              <tr>
                <th>Kỳ / khoản</th>
                {accumulation && <th>Số đầu kỳ</th>}
                <th>
                  {perspective === "funding" ? "Tiền cần thêm" : "Mức kế hoạch"}
                </th>
                <th>Đã bỏ hũ</th>
                <th>Thực chi</th>
                {accumulation ? <th>Còn lại</th> : <th>Vượt mức</th>}
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.key}>
                  <th>
                    {/^20\d{2}-\d{2}$/.test(r.label)
                      ? `Tháng ${Number(r.label.slice(5))}`
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
                    {r.planned
                      ? "Kế hoạch"
                      : r.provisional
                        ? "Có tạm tính"
                        : "Đã kết thúc"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="expense-empty">Chưa có dữ liệu cho bộ lọc này.</p>
          )}
        </div>
      )}
    </section>
  );
}
