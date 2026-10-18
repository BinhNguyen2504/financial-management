"use client";
import { useState } from "react";
import type {
  InvestmentReport,
  ReportFilter,
} from "@/domain/investments/reports";
import { useMoney } from "@/components/privacy";
import type { InvestmentCategory } from "@/domain/investments/types";
import { endOfMonth, ruleAt } from "@/domain/investments/engine";
import { transactionNames } from "./editor";
export function InvestmentReports({
  report,
  filter,
  onFilter,
  categories,
  today,
  onExport,
}: {
  report: InvestmentReport | null;
  filter: ReportFilter;
  onFilter: (v: ReportFilter) => void;
  categories: InvestmentCategory[];
  today: string;
  onExport: () => void;
}) {
  const money = useMoney(),
    [chart, setChart] = useState("value"),
    [period, setPeriod] = useState("custom"),
    [anchor, setAnchor] = useState(today.slice(0, 7));
  const display = (v: string | null) =>
    v === null ? "Thiếu định giá" : money(v);
  function range(p: string, a: string) {
    setPeriod(p);
    setAnchor(a);
    const y = a.slice(0, 4),
      m = Number(a.slice(5));
    if (p === "month")
      onFilter({ ...filter, from: `${a}-01`, to: endOfMonth(a) });
    if (p === "quarter") {
      const start = Math.floor((m - 1) / 3) * 3 + 1;
      onFilter({
        ...filter,
        from: `${y}-${String(start).padStart(2, "0")}-01`,
        to: endOfMonth(`${y}-${String(start + 2).padStart(2, "0")}`),
      });
    }
    if (p === "year")
      onFilter({ ...filter, from: `${y}-01-01`, to: `${y}-12-31` });
  }
  const months = report?.months ?? [],
    values = months.map((m) =>
      chart === "value" ? m.value : chart === "result" ? m.result : m.inflow,
    ),
    others = months.map((m) => m.outflow);
  const abs = (n: bigint) => (n < 0n ? -n : n);
  const max = [...values, ...(chart === "flow" ? others : [])].reduce(
    (n, x) => (x !== null && abs(BigInt(x)) > n ? abs(BigInt(x)) : n),
    1n,
  );
  const scale = (v: string) => Number((BigInt(v) * 10000n) / max) / 10000;
  const x = (i: number) => 44 + (i * 590) / Math.max(1, months.length - 1),
    y = (v: string) =>
      chart === "result" ? 120 - scale(v) * 80 : 190 - scale(v) * 150;
  const total = report?.after.total;
  return (
    <>
      <section className="panel investment-filters" aria-label="Bộ lọc báo cáo">
        <label>
          Kỳ báo cáo
          <select
            value={period}
            onChange={(e) => range(e.target.value, anchor)}
          >
            <option value="custom">Khoảng ngày</option>
            <option value="month">Tháng</option>
            <option value="quarter">Quý</option>
            <option value="year">Năm</option>
          </select>
        </label>
        {period !== "custom" && (
          <label>
            Tháng tham chiếu
            <input
              type="month"
              value={anchor}
              max={today.slice(0, 7)}
              onChange={(e) => {
                if (e.target.value) range(period, e.target.value);
              }}
            />
          </label>
        )}
        <label>
          Từ ngày
          <input
            type="date"
            value={filter.from}
            max={today}
            onChange={(e) => {
              setPeriod("custom");
              onFilter({ ...filter, from: e.target.value });
            }}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={filter.to}
            onChange={(e) => {
              setPeriod("custom");
              onFilter({ ...filter, to: e.target.value });
            }}
          />
        </label>
        <label>
          Danh mục / ví báo cáo
          <select
            value={filter.categoryId ?? ""}
            onChange={(e) =>
              onFilter({ ...filter, categoryId: e.target.value || undefined })
            }
          >
            <option value="">Tất cả danh mục và ví</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {ruleAt(c, today)?.name ?? c.rules[0].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loại giao dịch báo cáo
          <select
            value={filter.transactionKind ?? ""}
            onChange={(e) =>
              onFilter({
                ...filter,
                transactionKind: e.target.value || undefined,
              })
            }
          >
            <option value="">Tất cả loại</option>
            {Object.entries(transactionNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="expense-secondary"
          onClick={onExport}
          disabled={!report}
        >
          Xuất CSV
        </button>
      </section>
      {!report ? (
        <p role="alert" className="expense-error">
          Chọn khoảng ngày hợp lệ, bắt đầu không muộn hơn hôm nay.
        </p>
      ) : (
        <>
          <p className="expense-muted">
            Số liệu đến {report.asOf}
            {report.provisional ? " · kỳ hiện tại tạm tính" : ""}. Lọc loại giao
            dịch chỉ áp dụng hoạt động; số dư và kết quả kỳ luôn dùng đầy đủ
            giao dịch.
          </p>
          <div className="investment-metrics">
            <article className="panel metric">
              <span>Tài sản đầu kỳ</span>
              <strong>{display(report.before.total)}</strong>
            </article>
            <article className="panel metric">
              <span>Tài sản cuối kỳ</span>
              <strong>{display(report.after.total)}</strong>
            </article>
            <article className="panel metric">
              <span>Kết quả trong kỳ</span>
              <strong>{display(report.result)}</strong>
              <p>Đã loại vốn mở đầu, nạp/rút và dòng chuyển ròng.</p>
            </article>
            <article className="panel metric">
              <span>Lãi/lỗ bán trong hoạt động lọc</span>
              <strong>{money(report.activity.realized)}</strong>
              <p>Phí/thuế: {money(report.activity.fees)}</p>
            </article>
          </div>
          <div className="investment-chart-grid">
            <section className="panel investment-chart">
              <h2>Diễn biến theo tháng</h2>
              <label>
                Nội dung biểu đồ
                <select
                  value={chart}
                  onChange={(e) => setChart(e.target.value)}
                >
                  <option value="value">Tài sản cuối tháng</option>
                  <option value="flow">Nạp và rút bên ngoài</option>
                  <option value="result">Kết quả trong tháng</option>
                </select>
              </label>
              {months.length && values.some((v) => v !== null) ? (
                <svg
                  viewBox="0 0 680 240"
                  role="img"
                  aria-label={
                    chart === "flow"
                      ? "Biểu đồ nạp và rút bên ngoài theo tháng, đơn vị VND"
                      : chart === "result"
                        ? "Biểu đồ kết quả theo tháng, đơn vị VND"
                        : "Biểu đồ tài sản cuối tháng, đơn vị VND"
                  }
                >
                  <line
                    x1="30"
                    x2="650"
                    y1={chart === "result" ? 120 : 190}
                    y2={chart === "result" ? 120 : 190}
                    stroke="var(--border)"
                  />
                  {months.map((m, i) => {
                    const v = values[i],
                      o = others[i];
                    if (v === null) return null;
                    const text = `${m.month}: ${chart === "flow" ? `nạp ${money(v)}, rút ${money(o ?? "0")}` : money(v)}${m.provisional ? ", tạm tính" : ""}`;
                    return (
                      <g key={m.month}>
                        {chart === "value" &&
                          i > 0 &&
                          values[i - 1] !== null && (
                            <line
                              x1={x(i - 1)}
                              y1={y(values[i - 1]!)}
                              x2={x(i)}
                              y2={y(v)}
                              stroke="var(--primary)"
                              strokeWidth="3"
                            />
                          )}
                        {chart === "value" ? (
                          <circle
                            cx={x(i)}
                            cy={y(v)}
                            r="5"
                            fill="var(--primary)"
                          />
                        ) : (
                          <>
                            <rect
                              x={x(i) - 10}
                              y={Math.min(y(v), chart === "result" ? 120 : 190)}
                              width="9"
                              height={Math.max(
                                1,
                                Math.abs(
                                  y(v) - (chart === "result" ? 120 : 190),
                                ),
                              )}
                              rx="3"
                              fill="var(--primary)"
                            />
                            {chart === "flow" && o !== null && (
                              <rect
                                x={x(i) + 1}
                                y={y(o)}
                                width="9"
                                height={Math.max(1, 190 - y(o))}
                                fill="var(--chart-2)"
                                rx="3"
                              />
                            )}
                          </>
                        )}
                        <rect
                          x={x(i) - 18}
                          y={y(v) - 22}
                          width="36"
                          height="44"
                          fill="transparent"
                          tabIndex={0}
                          role="img"
                          aria-label={text}
                        >
                          <title>{text}</title>
                        </rect>
                        {(i % Math.max(1, Math.ceil(months.length / 6)) === 0 ||
                          i === months.length - 1) && (
                          <text
                            x={x(i)}
                            y="225"
                            textAnchor="middle"
                            fill="var(--muted)"
                            fontSize="11"
                          >
                            {m.month}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <p>Chưa có số liệu trong khoảng ngày này.</p>
              )}
              <p className="expense-muted">
                {chart === "flow" ? "Cột trái: nạp · cột phải: rút. " : ""}Định
                giá gần nhất được mang tiếp, kèm ngày ở bảng bên dưới. Không vẽ
                số thực tế cho tháng tương lai.
              </p>
            </section>
            <section className="panel investment-chart">
              <h2>Cơ cấu tài sản</h2>
              <p className="expense-muted">
                Gồm tài sản đầu tư và tiền chờ tại {report.asOf}.
              </p>
              {total === null ? (
                <p>Thiếu định giá để tính tỷ trọng đầy đủ.</p>
              ) : !total || BigInt(total) === 0n ? (
                <p>Chưa có tài sản để tính tỷ trọng.</p>
              ) : (
                report.categories
                  .filter((c) => BigInt(c.value ?? "0") > 0n)
                  .map((c, i) => {
                    const pct =
                      Number((BigInt(c.value!) * 10000n) / BigInt(total)) / 100;
                    return (
                      <div className="investment-allocation" key={c.id}>
                        <div>
                          <span>
                            {c.emoji} {c.name}
                          </span>
                          <strong>{pct.toLocaleString("vi-VN")}%</strong>
                        </div>
                        <div className="investment-track">
                          <i
                            style={{
                              width: `${pct}%`,
                              background: `var(--chart-${(i % 5) + 1})`,
                            }}
                          />
                        </div>
                        <small>{money(c.value!)}</small>
                      </div>
                    );
                  })
              )}
            </section>
          </div>
          <section className="panel">
            <h2>Số liệu theo danh mục</h2>
            <div className="investment-table-scroll">
              <table className="investment-table">
                <thead>
                  <tr>
                    <th>Danh mục</th>
                    <th>Đầu kỳ</th>
                    <th>Cuối kỳ</th>
                    <th>Vốn còn lại</th>
                    <th>Đã chốt trong kỳ</th>
                    <th>Chưa chốt</th>
                    <th>Kết quả kỳ</th>
                    <th>Định giá</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((c) => (
                    <tr key={c.id}>
                      <th scope="row">{c.name}</th>
                      <td>{display(c.startValue)}</td>
                      <td>{display(c.value)}</td>
                      <td>{money(c.cost)}</td>
                      <td>{money(c.realized)}</td>
                      <td>{display(c.unrealized)}</td>
                      <td>{display(c.result)}</td>
                      <td>
                        {c.kind === "cash"
                          ? "Theo giao dịch"
                          : `${c.valueDate ?? "Chưa có"}${c.stale ? " · cũ" : ""}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <h2>Bảng diễn biến</h2>
            <div className="investment-table-scroll">
              <table className="investment-table">
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>Tài sản cuối tháng</th>
                    <th>Nạp ngoài</th>
                    <th>Rút ngoài</th>
                    <th>Kết quả tháng</th>
                    <th>Mốc định giá tài sản</th>
                  </tr>
                </thead>
                <tbody>
                  {report.months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row">
                        {m.month}
                        {m.provisional ? " · tạm tính" : ""}
                      </th>
                      <td>{m.value === null ? "—" : money(m.value)}</td>
                      <td>{m.inflow === null ? "—" : money(m.inflow)}</td>
                      <td>{m.outflow === null ? "—" : money(m.outflow)}</td>
                      <td>{m.result === null ? "—" : money(m.result)}</td>
                      <td>
                        {m.valuationDates.map((p) => (
                          <small key={p.name}>
                            {p.name}: {p.date ?? "Chưa có"}
                            {p.stale ? " · cũ" : ""}
                          </small>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
