"use client";
import { useEffect, useRef, useState } from "react";
import { useChartTooltip } from "@/components/chart-tooltip";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useI18n } from "@/i18n/provider";
import type { Report } from "@/domain/reports/model";

export function ReportChart({ report }: { report: Report }) {
  const { t, numberLocale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden(),
    tooltip = useChartTooltip();
  const options = report.tables.flatMap((table) =>
    table.columns
      .filter((c) => c.type === "money")
      .map((c) => ({
        key: `${table.id}:${c.key}`,
        title: `${t(table.title)} · ${t(c.label)}`,
        time: table.id.endsWith(".months") || table.id === "expenses.date",
        data: table.rows.map((r) => ({
          id: r.id,
          label: r.month ?? r.name ?? r.id,
          value: r[c.key],
        })),
      })),
  );
  const [selection, setSelection] = useState("");
  const selected = options.find((o) => o.key === selection) ?? options[0];
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const data = selected?.data.slice(0, selected.time ? 12 : 20) ?? [],
    values = data.flatMap((r) => (r.value == null ? [] : [BigInt(r.value)]));
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const measure = () =>
      setWidth(Math.max(240, Math.round(element.clientWidth)));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [selected?.key, values.length]);
  if (!selected) return null;
  const peak = values.reduce(
    (a, b) => ((b < 0n ? -b : b) > a ? (b < 0n ? -b : b) : a),
    1n,
  );
  const maximum = peak + (peak / 10n || 1n);
  const signed = values.some((v) => v < 0n),
    zero = signed ? 130 : 215;
  const scale = (v: string) => Number((BigInt(v) * 10000n) / maximum) / 10000;
  const x = (i: number) =>
      76 +
      (data.length === 1
        ? (width - 100) / 2
        : (i * (width - 100)) / (data.length - 1)),
    y = (v: string) => zero - scale(v) * (signed ? 85 : 165);
  const active = data.find((d) => d.id === tooltip.active);
  const segments: string[] = [];
  let points: string[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].value == null) {
      if (points.length) segments.push(points.join(" "));
      points = [];
    } else points.push(`${x(i)},${y(data[i].value!)}`);
  }
  if (points.length) segments.push(points.join(" "));
  const compact = new Intl.NumberFormat(numberLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return (
    <section
      className="panel reports-chart"
      aria-label={t("Diễn biến trong kỳ")}
    >
      <div className="reports-chart-heading">
        <h2>
          {t(
            report.query.tab === "goals"
              ? "Mục tiêu hiện tại"
              : "Diễn biến trong kỳ",
          )}
        </h2>
        <label>
          {t("Chỉ số biểu đồ")}
          <select
            value={selected.key}
            onChange={(e) => {
              setSelection(e.target.value);
              tooltip.close();
            }}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>{selected.title} · VND</p>
      <div ref={plot}>
        {!values.length ? (
          <p>{t("Chưa có dữ liệu trong kỳ.")}</p>
        ) : selected.time ? (
          <div {...tooltip.container}>
            <svg viewBox={`0 0 ${width} 275`} aria-label={selected.title}>
              {(signed ? [-1, -0.5, 0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map(
                (step) => {
                  const tick = (maximum * BigInt(step * 100)) / 100n;
                  return (
                    <g key={step}>
                      <line
                        x1="64"
                        x2={width - 12}
                        y1={y(tick.toString())}
                        y2={y(tick.toString())}
                        className="reports-gridline"
                      />
                      <text x="58" y={y(tick.toString()) + 4} textAnchor="end">
                        {hidden ? "•••" : compact.format(Number(tick))}
                      </text>
                    </g>
                  );
                },
              )}
              {data.length >= 4 &&
                segments.map((segment, i) => (
                  <polyline
                    key={i}
                    points={segment}
                    fill="none"
                    className="reports-trend"
                  />
                ))}
              {data.map((d, i) => (
                <g key={d.id}>
                  {data.length >= 4 &&
                    d.value != null &&
                    data[i - 1]?.value == null &&
                    data[i + 1]?.value == null && (
                      <circle
                        cx={x(i)}
                        cy={y(d.value)}
                        r="3"
                        className="reports-bar"
                      />
                    )}
                  {d.value != null && (
                    <rect
                      x={x(i) - (data.length < 4 ? 18 : 12)}
                      y={data.length < 4 ? Math.min(zero, y(d.value)) : 35}
                      width={data.length < 4 ? 36 : 24}
                      height={
                        data.length < 4
                          ? Math.max(2, Math.abs(zero - y(d.value)))
                          : 190
                      }
                      className={
                        data.length < 4 ? "reports-bar" : "reports-hit"
                      }
                      {...tooltip.trigger(
                        d.id,
                        `${d.label}: ${money(d.value)}`,
                      )}
                    />
                  )}
                  {(data.length <= 6 ||
                    i % Math.ceil(data.length / 6) === 0 ||
                    i === data.length - 1) && (
                    <text x={x(i)} y="255" textAnchor="middle">
                      {width < 550 && /^\d{4}-\d{2}$/.test(d.label)
                        ? d.label.slice(5)
                        : d.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            {tooltip.tooltip(
              active && (
                <>
                  <strong>{active.label}</strong>
                  <span>
                    {active.value == null
                      ? t("Thiếu dữ liệu")
                      : money(active.value)}
                  </span>
                </>
              ),
            )}
          </div>
        ) : (
          <div className="reports-composition">
            {data.map((d) => (
              <div key={d.id}>
                <span>{d.label}</span>
                <div className="reports-bar-track">
                  <div
                    style={{
                      width: `${d.value == null ? 0 : Math.abs(scale(d.value)) * 100}%`,
                    }}
                  />
                </div>
                <strong>{d.value == null ? "—" : money(d.value)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
