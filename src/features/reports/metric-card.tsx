"use client";
import Link from "next/link";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useI18n } from "@/i18n/provider";
import { formatDecimal } from "@/i18n/format";
import type { Metric, Report } from "@/domain/reports/model";
import { sourceNames } from "./names";

export function MetricCard({
  report,
  metric,
  disabled,
  onDetail,
  heading: Heading = "h2",
}: {
  report: Report;
  metric: Metric;
  disabled: boolean;
  onDetail: (metric: Metric) => void;
  /** Cards nested under a titled section sit one level lower. */
  heading?: "h2" | "h3";
}) {
  const { t, locale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden();
  return (
    <article>
      <Heading>{t(metric.label)}</Heading>
      {report.sources[metric.source]?.empty &&
        report.metrics.find((item) => item.source === metric.source) ===
          metric && (
          <p className="reports-empty-source">
            <span>
              {t(sourceNames[metric.source])}: {t("Chưa có dữ liệu")}
            </span>{" "}
            <Link
              className="text-link"
              href={`/${metric.source === "expenses" ? "budgets" : metric.source}`}
            >
              {t("Mở {0}", { 0: t(sourceNames[metric.source]) })}
            </Link>
          </p>
        )}
      {report.warnings
        .filter((warning) => warning.startsWith(sourceNames[metric.source]))
        .map((warning) => (
          <p key={warning} className="reports-metric-warning">
            {t(warning)}
          </p>
        ))}
      <button
        className="reports-metric-value"
        disabled={disabled}
        aria-label={`${t("Xem nguồn số liệu")}: ${t(metric.label)}`}
        onClick={() => onDetail(metric)}
      >
        {metric.value === null ? "—" : money(metric.value)}
      </button>
      <p>
        {t("Kỳ trước")}:{" "}
        {metric.previous === null ? "—" : money(metric.previous)}
        {report.warnings.some((warning) => warning.startsWith("Kỳ trước")) && (
          <span className="reports-metric-warning">
            {" "}
            · {t("Kỳ trước có lưu ý")}
          </span>
        )}
      </p>
      <p>
        {t("Chênh lệch")}:{" "}
        {metric.delta === null
          ? "—"
          : `${!hidden && BigInt(metric.delta) > 0n ? "+" : ""}${money(metric.delta)}`}
        {metric.percent !== null && (
          <span>
            {" "}
            ({hidden ? "•••" : formatDecimal(metric.percent, locale)}
            %)
          </span>
        )}
      </p>
    </article>
  );
}
