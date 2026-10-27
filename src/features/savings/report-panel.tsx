"use client";
import { sliceOffsets } from "@/lib/chart-data";

import { formatDate, formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { ColumnTable } from "@/components/column-table";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import type { SavingsReport } from "@/domain/savings/reports";
import { donutSlices } from "@/lib/chart-data";
import { ratio } from "@/domain/shared/money";
import { formatDecimal } from "@/i18n/format";
import { useState } from "react";
import { useChartTooltip } from "./chart-tooltip";
import { kindNames } from "./editor-config";
export function SavingsReports({
  report: r,
  compact = false,
}: {
  report: SavingsReport;
  compact?: boolean;
}) {
  const { t: tr, numberLocale, config: localize, locale } = useI18n("savings");

  const money = useMoney(),
    hidden = useMoneyHidden();
  const [chart, setChart] = useState("assets"),
    [composition, setComposition] = useState("category");
  const timeline = useChartTooltip(),
    allocation = useChartTooltip();
  const display = (v: string | null) =>
    v === null ? tr("Thiếu dữ liệu") : money(v);
  const groups =
    composition === "category"
      ? r.categories.map((c) => ({
          key: c.id,
          label: c.name,
          spent: c.value ?? "0",
        }))
      : Object.entries(localize(kindNames)).map(([key, label]) => ({
          key,
          label,
          spent: r.categories
            .filter((c) => c.kind === key)
            .reduce((n, c) => n + BigInt(c.value ?? 0), 0n)
            .toString(),
        }));
  const slices = donutSlices(groups, tr("Khác"));
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
            ? tr("Tài sản cuối tháng")
            : series === "inflow"
              ? tr("Nạp bên ngoài")
              : tr("Rút bên ngoài");
        const value = m[series];
        const amount =
          value === null
            ? m.month > r.asOf.slice(0, 7)
              ? tr("Chưa phát sinh")
              : tr("Thiếu dữ liệu")
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
  const offsets = sliceOffsets(slices);
  return (
    <>
      {!compact && (
        <div className="savings-metrics">
          <article className="metric">
            <h3>
              {tr("Tài sản cuối kỳ")}
              {r.provisional ? tr(" · tạm tính") : ""}
            </h3>
            <strong>{display(r.after.total)}</strong>
            {r.after.total === null && (
              <p>
                {tr("Đã định giá:")} {money(r.after.knownValue)}
              </p>
            )}
          </article>
          <article className="metric">
            <h3>{tr("Vốn nạp ròng ngoài hệ thống")}</h3>
            <strong>{money(r.activity.external)}</strong>
            <p>
              {tr("Nạp")} {money(r.activity.inflow)} {tr("· rút")}{" "}
              {money(r.activity.outflow)}
            </p>
          </article>
          <article className="metric">
            <h3>{tr("Kết quả trong kỳ")}</h3>
            <strong>{display(r.result)}</strong>
            <p>{tr("Đã loại vốn mở đầu và dòng tiền chuyển")}</p>
          </article>
          <article className="metric">
            <h3>{tr("Lãi thực nhận / đã chốt")}</h3>
            <strong>
              {money(r.activity.interest)} / {money(r.activity.realized)}
            </strong>
            <p>
              {tr("Phí và thuế:")} {money(r.activity.fees)}
            </p>
          </article>
        </div>
      )}
      {r.activityFiltered && (
        <p className="expense-notice">
          {tr(
            "Bộ lọc loại giao dịch áp dụng dòng tiền, lãi/phí và danh sách giao dịch. Tài sản và kết quả trong kỳ luôn đối chiếu toàn bộ giao dịch.",
          )}
        </p>
      )}
      {r.after.missing.length > 0 && (
        <p className="expense-notice">
          {tr("Thiếu giá:")}{" "}
          {r.categories
            .filter((c) => c.value === null)
            .map((c) => c.name)
            .join(", ")}
          {tr(". Tổng tài sản và tỷ trọng chưa đầy đủ.")}
        </p>
      )}
      <div className="savings-chart-grid">
        <section className="panel savings-chart">
          <div className="expense-section-heading">
            <h2>{tr("Diễn biến theo tháng")}</h2>
            <label>
              {tr("Biểu đồ")}
              <select
                aria-label={tr("Biểu đồ")}
                value={chart}
                onChange={(e) => {
                  timeline.close();
                  setChart(e.target.value);
                }}
              >
                <option value="assets">{tr("Tài sản cuối tháng")}</option>
                <option value="flow">{tr("Tiền nạp / rút bên ngoài")}</option>
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
                    ? tr("Tài sản cuối từng tháng; bảng dữ liệu phía dưới")
                    : tr("Tiền nạp và rút từng tháng; bảng dữ liệu phía dưới")
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
                        `${m.month}: ${m.label}, ${m.amount}${m.provisional ? tr(", tạm tính") : ""}`,
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
                    {tr("Tháng")} {selectedMark.month.slice(5)}/
                    {selectedMark.month.slice(0, 4)}
                    {selectedMark.provisional ? tr(" · tạm tính") : ""}
                  </strong>
                  <span>{selectedMark.label}</span>
                  <b>{selectedMark.amount}</b>
                </>
              ),
            )}
          </div>
          {compact && (
            <details>
              <summary>{tr("Xem bảng diễn biến")}</summary>
              <div className="savings-table-scroll">
                <ColumnTable
                  tableId="savings-report-panel-1"
                  className="savings-table"
                >
                  <thead>
                    <tr>
                      <th>{tr("Tháng")}</th>
                      <th>{tr("Tài sản cuối kỳ")}</th>
                      <th>{tr("Nạp ngoài")}</th>
                      <th>{tr("Rút ngoài")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.months.map((m) => (
                      <tr key={m.month}>
                        <th scope="row">{formatMonth(m.month!, locale)}</th>
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
            {chart === "flow" ? tr("Cột trái: nạp · cột phải: rút. ") : ""}
            {tr(
              "Không nối đường qua tháng thiếu giá hoặc tháng tương lai. Rê chuột, chạm hoặc dùng Tab để xem số liệu; Escape để đóng chú thích.",
            )}
          </p>
        </section>
        <section className="panel savings-chart">
          <div className="expense-section-heading">
            <h2>{tr("Phân bố tài sản")}</h2>
            <label>
              {tr("Phân bố theo")}
              <select
                aria-label={tr("Phân bố theo")}
                value={composition}
                onChange={(e) => {
                  allocation.close();
                  setComposition(e.target.value);
                }}
              >
                <option value="category">{tr("Danh mục")}</option>
                <option value="kind">{tr("Loại tài sản")}</option>
              </select>
            </label>
          </div>
          {r.after.total === null ? (
            <p className="expense-empty">
              {tr("Cần đủ giá để tính tỷ trọng.")}
            </p>
          ) : !slices.length ? (
            <p className="expense-empty">
              {tr("Chưa có tài sản để thể hiện tỷ trọng.")}
            </p>
          ) : (
            <div {...allocation.container}>
              <div className="savings-composition">
                <svg
                  viewBox="0 0 220 220"
                  role="group"
                  aria-label={tr(
                    "Tỷ trọng tài sản cuối kỳ, chi tiết trong chú giải",
                  )}
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
                    const start = offsets[i];
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
                          `${s.label}: ${money(s.value)}, ${s.percent.toLocaleString(numberLocale)}%`,
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
                        `${s.label}: ${money(s.value)}, ${s.percent.toLocaleString(numberLocale)}%`,
                      )}
                    >
                      <span
                        className="savings-legend"
                        style={{ background: `var(--chart-${i + 1})` }}
                        aria-hidden="true"
                      />
                      {s.label}
                      <strong>{s.percent.toLocaleString(numberLocale)}%</strong>
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
                      {selectedSlice.percent.toLocaleString(numberLocale)}
                      {tr("% tài sản cuối kỳ ·")} {formatDate(r.asOf!, locale)}
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
            <h2>
              {tr("Tài sản theo danh mục ·")} {formatDate(r.asOf!, locale)}
            </h2>
            <div className="savings-table-scroll">
              <ColumnTable
                tableId="savings-report-panel-2"
                className="savings-table"
                scrollLabel={tr("Tài sản theo danh mục")}
              >
                <caption>
                  {tr("VND · Giá trị cuối kỳ, không cộng số dư các tháng")}
                </caption>
                <thead>
                  <tr>
                    <th>{tr("Danh mục")}</th>
                    <th>{tr("Đầu kỳ")}</th>
                    <th>{tr("Cuối kỳ")}</th>
                    <th>{tr("Số lượng")}</th>
                    <th>{tr("Giá vốn còn lại")}</th>
                    <th>{tr("Lãi/lỗ chưa chốt")}</th>
                    <th>{tr("Kết quả kỳ")}</th>
                    <th>{tr("Ngày giá")}</th>
                    <th>{tr("Nạp ròng ngoài")}</th>
                    <th>{tr("Chuyển ròng nội bộ")}</th>
                    <th>{tr("Lãi thực nhận")}</th>
                    <th>{tr("Lãi/lỗ đã chốt")}</th>
                    <th>{tr("Phí / thuế")}</th>
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
                          ? `${hidden ? "••••••" : formatDecimal(c.quantity, locale)} ${tr(c.unit ?? "")}`
                          : "—"}
                      </td>
                      <td>{money(c.cost)}</td>
                      <td>{c.kind === "gold" ? display(c.unrealized) : "—"}</td>
                      <td>{display(c.result)}</td>
                      <td>
                        {c.priceDate ?? "—"}
                        {c.stale ? tr(" · giá cũ") : ""}
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
                    <th>{tr("Tổng")}</th>
                    <td>{display(r.before.total)}</td>
                    <td>{display(r.after.total)}</td>
                    <td colSpan={10}>{tr("Giá trị tại cuối kỳ")}</td>
                  </tr>
                </tfoot>
              </ColumnTable>
            </div>
          </section>
          <section className="panel">
            <h2>{tr("Bảng theo tháng")}</h2>
            <div className="savings-table-scroll">
              <ColumnTable
                tableId="savings-report-panel-3"
                className="savings-table"
                scrollLabel={tr("Bảng tiết kiệm theo tháng")}
              >
                <thead>
                  <tr>
                    <th>{tr("Tháng")}</th>
                    <th>{tr("Tài sản cuối kỳ")}</th>
                    <th>{tr("Nạp ngoài")}</th>
                    <th>{tr("Rút ngoài")}</th>
                    <th>{tr("Kết quả")}</th>
                    <th>{tr("Trạng thái")}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row">{formatMonth(m.month!, locale)}</th>
                      <td>{m.value === null ? "—" : money(m.value)}</td>
                      <td>{m.inflow === null ? "—" : money(m.inflow)}</td>
                      <td>{m.outflow === null ? "—" : money(m.outflow)}</td>
                      <td>{m.result === null ? "—" : money(m.result)}</td>
                      <td>
                        {m.provisional
                          ? tr("Tạm tính")
                          : m.missing.length
                            ? tr("Thiếu giá")
                            : m.value === null
                              ? tr("Chưa phát sinh")
                              : tr("Đã ghi nhận")}
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
