"use client";
import { sliceOffsets } from "@/lib/chart-data";

import { useI18n } from "@/i18n/provider";

import { useChartTooltip } from "@/components/chart-tooltip";
import { Garden } from "@/components/garden";
import { useMoney } from "@/components/privacy";
import type { ReportItem } from "@/domain/expenses/reports";
import { useId, useState } from "react";
import { donutSlices } from "./chart-data";
import { ratio } from "./format";

export function ChartEmpty() {
  const { t: tr } = useI18n("expenses");

  return (
    <div className="chart-empty">
      <Garden variant="balance" />
      <p>{tr("Chưa có giá trị để vẽ biểu đồ.")}</p>
      <span>
        {tr("Các khoản trong kỳ hoặc bộ lọc khác sẽ xuất hiện ở đây.")}
      </span>
    </div>
  );
}

export function DonutChart({
  items,
  table = false,
}: {
  items: ReportItem[];
  table?: boolean;
}) {
  const { t: tr, numberLocale } = useI18n("expenses");

  const money = useMoney();
  const tooltip = useChartTooltip();
  const [active, setActive] = useState<string | null>(null);
  const slices = donutSlices(
    items.filter((r) => !r.planned),
    tr("Khác"),
  );
  if (!slices.length) return <ChartEmpty />;
  const total = slices.reduce((n, r) => n + BigInt(r.value), 0n).toString();
  const selected =
    slices.find((r) => r.key === (tooltip.active ?? active)) ?? slices[0];
  const offsets = sliceOffsets(slices);
  return (
    <div
      {...tooltip.container}
      className="donut-section savings-chart-interactive"
    >
      <div className="donut-layout">
        <div className="donut-visual">
          <svg
            viewBox="0 0 220 220"
            role="img"
            aria-label={tr(
              "Cơ cấu thực chi. Chọn một mục trong chú giải để xem giá trị, đơn vị VND.",
            )}
          >
            <circle
              cx="110"
              cy="110"
              r="83"
              fill="none"
              stroke="var(--surface-alt)"
              strokeWidth="15"
            />
            {slices.map((r, i) => {
              const start = offsets[i];
              return (
                <circle
                  key={r.key}
                  {...tooltip.trigger(
                    r.key,
                    `${r.label}: ${money(r.value)} · ${r.percent.toLocaleString(numberLocale)}%`,
                  )}
                  cx="110"
                  cy="110"
                  r="83"
                  pathLength="100"
                  fill="none"
                  stroke={`var(--chart-${i + 1})`}
                  strokeWidth={r.key === selected.key ? 19 : 15}
                  strokeDasharray={`${r.percent} ${100 - r.percent}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 110 110)"
                />
              );
            })}
          </svg>
          <div className="donut-center">
            <span>{tr("Tổng thực chi")}</span>
            <strong>{money(total)}</strong>
            <small>
              VND{items.some((r) => r.provisional) ? tr(" · tạm tính") : ""}
            </small>
          </div>
        </div>
        <div className="chart-legend" aria-label={tr("Chú giải cơ cấu chi")}>
          {slices.map((r, i) => (
            <button
              type="button"
              key={r.key}
              aria-pressed={r.key === selected.key}
              onClick={() => setActive(r.key)}
              onFocus={() => setActive(r.key)}
              onPointerEnter={() => setActive(r.key)}
            >
              <span
                className="legend-marker"
                style={{ background: `var(--chart-${i + 1})` }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>{r.label}</span>
              <strong>
                {r.percent.toLocaleString(numberLocale, {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </button>
          ))}
          <p className="chart-tooltip" role="status">
            {selected.label}: <strong>{money(selected.value)}</strong> ·{" "}
            {selected.percent.toLocaleString(numberLocale, {
              maximumFractionDigits: 1,
            })}
            %
          </p>
        </div>
      </div>
      {tooltip.tooltip(
        <>
          <strong>{selected.label}</strong>
          <span>
            {money(selected.value)} ·{" "}
            {selected.percent.toLocaleString(numberLocale)}%
          </span>
        </>,
      )}
      {table && (
        <details className="chart-data-table">
          <summary>{tr("Xem bảng dữ liệu")}</summary>
          <div className="expense-table-scroll">
            <table>
              <caption className="sr-only">
                {tr("Thực chi theo nhóm, đơn vị VND")}
              </caption>
              <thead>
                <tr>
                  <th>{tr("Nhóm")}</th>
                  <th>{tr("Thực chi")}</th>
                  <th>{tr("Tỷ trọng")}</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((r) => (
                  <tr key={r.key}>
                    <th>{r.label}</th>
                    <td>{money(r.value)}</td>
                    <td>{r.percent.toLocaleString(numberLocale)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

export function ReportChart({
  items,
  field,
  trend = false,
  composition = false,
}: {
  items: ReportItem[];
  field: "spent" | "required" | "closing";
  trend?: boolean;
  composition?: boolean;
}) {
  const { t: tr, locale } = useI18n("expenses");

  const money = useMoney();
  const tooltip = useChartTooltip();
  const gradientId = useId().replace(/:/g, "");
  const [active, setActive] = useState<string | null>(null);
  const visible = trend ? items.filter((r) => !r.planned) : items;
  const compare = !trend && !composition && field === "spent";
  const maximum = visible
    .reduce(
      (n, r) =>
        [BigInt(r[field]), compare ? BigInt(r.target) : 0n].reduce(
          (a, b) => (a > b ? a : b),
          n,
        ),
      0n,
    )
    .toString();
  if (composition) return <DonutChart items={items} />;
  if (!visible.length || BigInt(maximum) === 0n) return <ChartEmpty />;
  const label = (r: ReportItem) =>
    /^20\d{2}-\d{2}$/.test(r.label)
      ? tr("Tháng {0}", { 0: Number(r.label.slice(5)) })
      : r.label;
  if (trend) {
    const x = (i: number) =>
      visible.length === 1 ? 350 : 45 + (i * 610) / (visible.length - 1);
    const y = (r: ReportItem) => 190 - ratio(r[field], maximum) * 1.5;
    const points = visible.map((r, i) => `${x(i)},${y(r)}`).join(" ");
    const selected =
      visible.find((r) => r.key === (tooltip.active ?? active)) ??
      visible[visible.length - 1];
    return (
      <div
        {...tooltip.container}
        className="expense-line-chart savings-chart-interactive"
      >
        <div className="chart-scale">
          <span>VND</span>
          <span>
            {tr("Mức cao nhất:")} {money(maximum)}
          </span>
        </div>
        <svg
          viewBox="0 0 700 240"
          role="img"
          aria-label={tr(
            "Diễn biến tiền thực chi theo tháng, đơn vị VND. Các nút tháng bên dưới cung cấp giá trị chính xác.",
          )}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--primary)" stopOpacity=".18" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 90, 140, 190].map((height) => (
            <line
              key={height}
              x1="45"
              x2="655"
              y1={height}
              y2={height}
              className="expense-chart-axis"
            />
          ))}
          <polygon
            points={`${x(0)},190 ${points} ${x(visible.length - 1)},190`}
            fill={`url(#${gradientId})`}
          />
          <polyline points={points} className="expense-chart-line" />
          {visible.map((r, i) => (
            <g
              key={r.key}
              {...tooltip.trigger(r.key, `${label(r)}: ${money(r[field])}`)}
            >
              <circle
                cx={x(i)}
                cy={y(r)}
                r={r.key === selected.key ? 7 : 4}
                className="expense-chart-point"
              />
              <text x={x(i)} y="221" textAnchor="middle">
                {locale === "en" ? "M" : "T"}
                {Number(r.key.slice(5))}
              </text>
            </g>
          ))}
        </svg>
        {tooltip.tooltip(
          <>
            <strong>{label(selected)}</strong>
            <span>
              {money(selected[field])}
              {selected.provisional ? tr(" · tạm tính") : ""}
            </span>
          </>,
        )}
        <div className="chart-months" aria-label={tr("Chọn điểm dữ liệu")}>
          {visible.map((r) => (
            <button
              type="button"
              key={r.key}
              aria-pressed={r.key === selected.key}
              onClick={() => setActive(r.key)}
              onFocus={() => setActive(r.key)}
              onPointerEnter={() => setActive(r.key)}
            >
              {label(r)}
            </button>
          ))}
        </div>
        <p role="status" className="chart-tooltip">
          {label(selected)}: <strong>{money(selected[field])}</strong>
          {selected.provisional ? tr(" · tạm tính") : ""}
        </p>
      </div>
    );
  }
  return (
    <div
      {...tooltip.container}
      className="expense-bar-chart savings-chart-interactive"
      role="list"
      aria-label={tr("Biểu đồ so sánh, đơn vị VND")}
    >
      {visible.map((r) => (
        <div
          key={r.key}
          {...tooltip.trigger(r.key, `${label(r)}: ${money(r[field])}`)}
          role="listitem"
          className="expense-chart-item"
        >
          <div>
            <strong>{label(r)}</strong>
            <span>
              {money(r[field])}
              {r.provisional ? tr(" · tạm tính") : ""}
              {r.planned ? tr(" · kế hoạch") : ""}
            </span>
          </div>
          {compare && (
            <>
              <small className="expense-muted">
                {tr("Mức kế hoạch:")} {money(r.target)}
              </small>
              <div
                className="expense-bar-track expense-bar-budget"
                aria-hidden="true"
              >
                <span style={{ width: `${ratio(r.target, maximum)}%` }} />
              </div>
              <small className="expense-muted">
                {tr("Thực chi")}
                {r.planned ? tr(" chưa phát sinh") : ""}
              </small>
            </>
          )}
          <div className="expense-bar-track" aria-hidden="true">
            <span style={{ width: `${ratio(r[field], maximum)}%` }} />
          </div>
        </div>
      ))}
      {tooltip.tooltip(
        (() => {
          const selected = visible.find((item) => item.key === tooltip.active);
          return (
            selected && (
              <>
                <strong>{label(selected)}</strong>
                <span>
                  {money(selected[field])}
                  {selected.provisional
                    ? tr(" · tạm tính")
                    : selected.planned
                      ? tr(" · kế hoạch")
                      : ""}
                </span>
                {compare && (
                  <span>
                    {tr("Mức kế hoạch:")} {money(selected.target)}
                  </span>
                )}
              </>
            )
          );
        })(),
      )}
    </div>
  );
}
