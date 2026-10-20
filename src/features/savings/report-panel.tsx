"use client";
import { ColumnTable } from "@/components/column-table";
import { useState } from "react";
import type { SavingsReport } from "@/domain/savings/reports";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { donutSlices } from "@/features/expenses/chart-data";
import { ratio } from "@/features/expenses/format";
import { kindNames } from "./editor";
import { useChartTooltip } from "./chart-tooltip";
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
  const timeline = useChartTooltip(),
    allocation = useChartTooltip();
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
  const marks = r.months.flatMap((m, i) =>
      (chart === "assets"
        ? ["value" as const]
        : ["inflow" as const, "outflow" as const]
      ).map((series) => {
        const label =
          series === "value"
            ? "Tài sản cuối tháng"
            : series === "inflow"
              ? "Nạp bên ngoài"
              : "Rút bên ngoài";
        const value = m[series];
        const amount =
          value === null
            ? m.month > r.asOf.slice(0, 7)
              ? "Chưa phát sinh"
              : "Thiếu dữ liệu"
            : money(value);
        return {
          key: `${m.month}-${series}`,
          month: m.month,
          provisional: m.provisional,
          series,
          label,
          amount,
          value,
          i,
        };
      }),
    ),
    selectedMark = marks.find((m) => m.key === timeline.active),
    selectedSlice = slices.find((s) => s.key === allocation.active);
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
                onChange={(e) => {
                  timeline.close();
                  setChart(e.target.value);
                }}
              >
                <option value="assets">Tài sản cuối tháng</option>
                <option value="flow">Tiền nạp / rút bên ngoài</option>
              </select>
            </label>
          </div>
          <div {...timeline.container}>
            <div className="savings-chart-scroll" onScroll={timeline.onScroll}>
              <svg
                viewBox="0 0 720 265"
                role="group"
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
                {marks.map((m) => {
                  const cx =
                      x(m.i) +
                      (m.series === "inflow"
                        ? -7
                        : m.series === "outflow"
                          ? 6
                          : 0),
                    cy = m.value === null ? 195 : y(m.value);
                  return (
                    <g
                      key={m.key}
                      className="savings-chart-mark"
                      {...timeline.trigger(
                        m.key,
                        `${m.month}: ${m.label}, ${m.amount}${m.provisional ? ", tạm tính" : ""}`,
                      )}
                    >
                      {m.series === "value" ? (
                        m.value !== null ? (
                          <>
                            <circle cx={cx} cy={cy} r="16" fill="transparent" />
                            <circle
                              cx={cx}
                              cy={cy}
                              r="5"
                              className="savings-point"
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r="10"
                              className="savings-point-focus"
                            />
                          </>
                        ) : (
                          <>
                            <circle cx={cx} cy={cy} r="16" fill="transparent" />
                            <text x={cx} y="195" textAnchor="middle">
                              —
                            </text>
                            <circle
                              cx={cx}
                              cy={cy}
                              r="10"
                              className="savings-point-focus"
                            />
                          </>
                        )
                      ) : m.value !== null ? (
                        <>
                          <rect
                            x={cx - 6}
                            y={Math.min(cy, 188)}
                            width="12"
                            height={Math.max(22, 210 - cy)}
                            fill="transparent"
                          />
                          <rect
                            x={cx - 5}
                            y={cy}
                            width="10"
                            height={Math.max(1, 210 - cy)}
                            className={
                              m.series === "inflow"
                                ? "savings-point"
                                : "savings-outflow"
                            }
                          />
                          <rect
                            x={cx - 7}
                            y={cy - 2}
                            width="14"
                            height={Math.max(5, 214 - cy)}
                            className="savings-bar-focus"
                          />
                        </>
                      ) : (
                        <>
                          <circle cx={cx} cy={cy} r="6" fill="transparent" />
                          <circle
                            cx={cx}
                            cy={cy}
                            r="6"
                            className="savings-point-focus"
                          />
                        </>
                      )}
                    </g>
                  );
                })}
                {r.months.map((m, i) => (
                  <text key={m.month} x={x(i)} y="239" textAnchor="middle">
                    {m.month.slice(2)}
                  </text>
                ))}
              </svg>
            </div>
            {timeline.tooltip(
              selectedMark && (
                <>
                  <strong>
                    Tháng {selectedMark.month.slice(5)}/
                    {selectedMark.month.slice(0, 4)}
                    {selectedMark.provisional ? " · tạm tính" : ""}
                  </strong>
                  <span>{selectedMark.label}</span>
                  <b>{selectedMark.amount}</b>
                </>
              ),
            )}
          </div>
          {compact && (
            <details>
              <summary>Xem bảng diễn biến</summary>
              <div className="savings-table-scroll">
                <ColumnTable
                  tableId="savings-report-panel-1"
                  className="savings-table"
                >
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
                </ColumnTable>
              </div>
            </details>
          )}
          <p className="expense-muted">
            {chart === "flow" ? "Cột trái: nạp · cột phải: rút. " : ""}Không nối
            đường qua tháng thiếu giá hoặc tháng tương lai. Rê chuột, chạm hoặc
            dùng Tab để xem số liệu; Escape để đóng chú thích.
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
                onChange={(e) => {
                  allocation.close();
                  setComposition(e.target.value);
                }}
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
            <div {...allocation.container}>
              <div className="savings-composition">
                <svg
                  viewBox="0 0 220 220"
                  role="group"
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
                        className="savings-chart-slice"
                        {...allocation.trigger(
                          s.key,
                          `${s.label}: ${money(s.value)}, ${s.percent.toLocaleString("vi-VN")}%`,
                        )}
                      />
                    );
                  })}
                </svg>
                <ul>
                  {slices.map((s, i) => (
                    <li
                      key={s.key}
                      className="savings-chart-legend-item"
                      {...allocation.trigger(
                        s.key,
                        `${s.label}: ${money(s.value)}, ${s.percent.toLocaleString("vi-VN")}%`,
                      )}
                    >
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
              {allocation.tooltip(
                selectedSlice && (
                  <>
                    <strong>{selectedSlice.label}</strong>
                    <b>{money(selectedSlice.value)}</b>
                    <span>
                      {selectedSlice.percent.toLocaleString("vi-VN")}% tài sản
                      cuối kỳ · {r.asOf}
                    </span>
                  </>
                ),
              )}
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
              <ColumnTable
                tableId="savings-report-panel-2"
                className="savings-table"
              >
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
              </ColumnTable>
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
              <ColumnTable
                tableId="savings-report-panel-3"
                className="savings-table"
              >
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
              </ColumnTable>
            </div>
          </section>
        </>
      )}
    </>
  );
}
