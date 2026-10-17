"use client";
import { useState } from "react";
import type { SavingsReport } from "@/domain/savings/reports";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { donutSlices } from "@/features/expenses/chart-data";
import { ratio } from "@/features/expenses/format";
import { kindNames } from "./editor";
export function SavingsReports({
  report: r,
  compact = false,
}: {
  report: SavingsReport;
  compact?: boolean;
}) {
  const money = useMoney(),
    hidden = useMoneyHidden();
  const [chart, setChart] = useState("assets"),
    [composition, setComposition] = useState("category");
  const display = (v: string | null) =>
    v === null ? "Thiếu dữ liệu" : money(v);
  const groups =
    composition === "category"
      ? r.categories.map((c) => ({
          key: c.id,
          label: c.name,
          spent: c.value ?? "0",
        }))
      : Object.entries(kindNames).map(([key, label]) => ({
          key,
          label,
          spent: r.categories
            .filter((c) => c.kind === key)
            .reduce((n, c) => n + BigInt(c.value ?? 0), 0n)
            .toString(),
        }));
  const slices = donutSlices(groups);
  const max = r.months
    .reduce(
      (n, m) =>
        [m.value, m.inflow, m.outflow].reduce<bigint>(
          (a, v) => (v !== null && BigInt(v) > a ? BigInt(v) : a),
          n,
        ),
      0n,
    )
    .toString();
  const x = (i: number) => 48 + (i * 620) / Math.max(1, r.months.length - 1),
    y = (v: string) => 210 - ratio(v, max) * 1.8;
  let offset = 0;
  return (
    <>
      {!compact && (
        <div className="savings-metrics">
          <article className="metric">
            <h3>Tài sản cuối kỳ{r.provisional ? " · tạm tính" : ""}</h3>
            <strong>{display(r.after.total)}</strong>
            {r.after.total === null && (
              <p>Đã định giá: {money(r.after.knownValue)}</p>
            )}
          </article>
          <article className="metric">
            <h3>Vốn nạp ròng ngoài hệ thống</h3>
            <strong>{money(r.activity.external)}</strong>
            <p>
              Nạp {money(r.activity.inflow)} · rút {money(r.activity.outflow)}
            </p>
          </article>
          <article className="metric">
            <h3>Kết quả trong kỳ</h3>
            <strong>{display(r.result)}</strong>
            <p>Đã loại vốn mở đầu và dòng tiền chuyển</p>
          </article>
          <article className="metric">
            <h3>Lãi thực nhận / đã chốt</h3>
            <strong>
              {money(r.activity.interest)} / {money(r.activity.realized)}
            </strong>
            <p>Phí và thuế: {money(r.activity.fees)}</p>
          </article>
        </div>
      )}
      {r.activityFiltered && (
        <p className="expense-notice">
          Bộ lọc loại giao dịch áp dụng dòng tiền, lãi/phí và danh sách giao
          dịch. Tài sản và kết quả trong kỳ luôn đối chiếu toàn bộ giao dịch.
        </p>
      )}
      {r.after.missing.length > 0 && (
        <p className="expense-notice">
          Thiếu giá:{" "}
          {r.categories
            .filter((c) => c.value === null)
            .map((c) => c.name)
            .join(", ")}
          . Tổng tài sản và tỷ trọng chưa đầy đủ.
        </p>
      )}
      <div className="savings-chart-grid">
        <section className="panel savings-chart">
          <div className="expense-section-heading">
            <h2>Diễn biến theo tháng</h2>
            <label>
              Biểu đồ
              <select
                aria-label="Biểu đồ"
                value={chart}
                onChange={(e) => setChart(e.target.value)}
              >
                <option value="assets">Tài sản cuối tháng</option>
                <option value="flow">Tiền nạp / rút bên ngoài</option>
              </select>
            </label>
          </div>
          <div className="savings-chart-scroll">
            <svg
              viewBox="0 0 720 265"
              role="img"
              aria-label={
                chart === "assets"
                  ? "Tài sản cuối từng tháng; bảng dữ liệu phía dưới"
                  : "Tiền nạp và rút từng tháng; bảng dữ liệu phía dưới"
              }
            >
              <line
                x1="25"
                x2="700"
                y1="210"
                y2="210"
                className="savings-axis"
              />
              <text x="15" y="20">
                {money(max)}
              </text>
              {chart === "assets" &&
                r.months
                  .slice(1)
                  .map((m, i) =>
                    m.value !== null && r.months[i].value !== null ? (
                      <line
                        key={m.month}
                        x1={x(i)}
                        y1={y(r.months[i].value!)}
                        x2={x(i + 1)}
                        y2={y(m.value)}
                        className="savings-line"
                      />
                    ) : null,
                  )}
              {r.months.map((m, i) => (
                <g
                  key={m.month}
                  tabIndex={0}
                  role="img"
                  aria-label={`${m.month}: ${chart === "assets" ? display(m.value) : `nạp ${m.inflow === null ? "chưa phát sinh" : money(m.inflow)}, rút ${m.outflow === null ? "chưa phát sinh" : money(m.outflow)}`}${m.provisional ? ", tạm tính" : ""}`}
                >
                  <title>
                    {m.month}: {display(m.value)}
                  </title>
                  {chart === "assets" ? (
                    m.value !== null ? (
                      <circle
                        cx={x(i)}
                        cy={y(m.value)}
                        r="5"
                        className="savings-point"
                      />
                    ) : (
                      <text x={x(i)} y="195">
                        —
                      </text>
                    )
                  ) : m.inflow !== null && m.outflow !== null ? (
                    <>
                      <rect
                        x={x(i) - 12}
                        y={y(m.inflow)}
                        width="10"
                        height={Math.max(1, 210 - y(m.inflow))}
                        className="savings-point"
                      />
                      <rect
                        x={x(i) + 1}
                        y={y(m.outflow)}
                        width="10"
                        height={Math.max(1, 210 - y(m.outflow))}
                        className="savings-outflow"
                      />
                    </>
                  ) : null}
                  <text x={x(i)} y="239" textAnchor="middle">
                    {m.month.slice(2)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          {compact && (
            <details>
              <summary>Xem bảng diễn biến</summary>
              <div className="savings-table-scroll">
                <table className="savings-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Tài sản cuối kỳ</th>
                      <th>Nạp ngoài</th>
                      <th>Rút ngoài</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.months.map((m) => (
                      <tr key={m.month}>
                        <th scope="row">{m.month}</th>
                        <td>{m.value === null ? "—" : money(m.value)}</td>
                        <td>{m.inflow === null ? "—" : money(m.inflow)}</td>
                        <td>{m.outflow === null ? "—" : money(m.outflow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          <p className="expense-muted">
            {chart === "flow" ? "Cột trái: nạp · cột phải: rút. " : ""}Không nối
            đường qua tháng thiếu giá hoặc tháng tương lai. Dùng Tab để đọc từng
            điểm.
          </p>
        </section>
        <section className="panel savings-chart">
          <div className="expense-section-heading">
            <h2>Phân bố tài sản</h2>
            <label>
              Phân bố theo
              <select
                aria-label="Phân bố theo"
                value={composition}
                onChange={(e) => setComposition(e.target.value)}
              >
                <option value="category">Danh mục</option>
                <option value="kind">Loại tài sản</option>
              </select>
            </label>
          </div>
          {r.after.total === null ? (
            <p className="expense-empty">Cần đủ giá để tính tỷ trọng.</p>
          ) : !slices.length ? (
            <p className="expense-empty">
              Chưa có tài sản để thể hiện tỷ trọng.
            </p>
          ) : (
            <div className="savings-composition">
              <svg
                viewBox="0 0 220 220"
                role="img"
                aria-label="Tỷ trọng tài sản cuối kỳ, chi tiết trong chú giải"
              >
                <circle
                  cx="110"
                  cy="110"
                  r="80"
                  fill="none"
                  stroke="var(--surface-alt)"
                  strokeWidth="20"
                />
                {slices.map((s, i) => {
                  const start = offset;
                  offset += s.percent;
                  return (
                    <circle
                      key={s.key}
                      cx="110"
                      cy="110"
                      r="80"
                      pathLength="100"
                      fill="none"
                      stroke={`var(--chart-${i + 1})`}
                      strokeWidth="20"
                      strokeDasharray={`${s.percent} ${100 - s.percent}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 110 110)"
                    />
                  );
                })}
              </svg>
              <ul>
                {slices.map((s, i) => (
                  <li key={s.key}>
                    <span
                      className="savings-legend"
                      style={{ background: `var(--chart-${i + 1})` }}
                      aria-hidden="true"
                    />
                    {s.label}
                    <strong>{s.percent.toLocaleString("vi-VN")}%</strong>
                    <span>{money(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      {!compact && (
        <>
          <section className="panel">
            <h2>Tài sản theo danh mục · {r.asOf}</h2>
            <div
              className="savings-table-scroll"
              role="region"
              aria-label="Tài sản theo danh mục"
              tabIndex={0}
            >
              <table className="savings-table">
                <caption>
                  VND · Giá trị cuối kỳ, không cộng số dư các tháng
                </caption>
                <thead>
                  <tr>
                    <th>Danh mục</th>
                    <th>Đầu kỳ</th>
                    <th>Cuối kỳ</th>
                    <th>Số lượng</th>
                    <th>Giá vốn còn lại</th>
                    <th>Lãi/lỗ chưa chốt</th>
                    <th>Kết quả kỳ</th>
                    <th>Ngày giá</th>
                    <th>Nạp ròng ngoài</th>
                    <th>Chuyển ròng nội bộ</th>
                    <th>Lãi thực nhận</th>
                    <th>Lãi/lỗ đã chốt</th>
                    <th>Phí / thuế</th>
                  </tr>
                </thead>
                <tbody>
                  {r.categories.map((c) => (
                    <tr key={c.id}>
                      <th scope="row">
                        {c.emoji} {c.name}
                      </th>
                      <td>{display(c.startValue)}</td>
                      <td>{display(c.value)}</td>
                      <td>
                        {c.kind === "gold"
                          ? `${hidden ? "••••••" : c.quantity} ${c.unit}`
                          : "—"}
                      </td>
                      <td>{money(c.cost)}</td>
                      <td>{c.kind === "gold" ? display(c.unrealized) : "—"}</td>
                      <td>{display(c.result)}</td>
                      <td>
                        {c.priceDate ?? "—"}
                        {c.stale ? " · giá cũ" : ""}
                      </td>
                      <td>{money(c.external)}</td>
                      <td>{money(c.internal)}</td>
                      <td>{money(c.interest)}</td>
                      <td>{money(c.realized)}</td>
                      <td>{money(c.fees)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Tổng</th>
                    <td>{display(r.before.total)}</td>
                    <td>{display(r.after.total)}</td>
                    <td colSpan={10}>Giá trị tại cuối kỳ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <section className="panel">
            <h2>Bảng theo tháng</h2>
            <div
              className="savings-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Bảng tiết kiệm theo tháng"
            >
              <table className="savings-table">
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>Tài sản cuối kỳ</th>
                    <th>Nạp ngoài</th>
                    <th>Rút ngoài</th>
                    <th>Kết quả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {r.months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row">{m.month}</th>
                      <td>{m.value === null ? "—" : money(m.value)}</td>
                      <td>{m.inflow === null ? "—" : money(m.inflow)}</td>
                      <td>{m.outflow === null ? "—" : money(m.outflow)}</td>
                      <td>{m.result === null ? "—" : money(m.result)}</td>
                      <td>
                        {m.provisional
                          ? "Tạm tính"
                          : m.missing.length
                            ? "Thiếu giá"
                            : m.value === null
                              ? "Chưa phát sinh"
                              : "Đã ghi nhận"}
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
