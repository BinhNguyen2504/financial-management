"use client";
import { AnimatedDetails } from "@/components/animated-details";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatDecimal, formatMonth } from "@/i18n/format";
import type { Fact, Indicator, Rating } from "@/domain/reports/model";

const ratings: Record<Rating, { label: string; tone: StatusTone }> = {
  good: { label: "Tốt", tone: "success" },
  attention: { label: "Cần chú ý", tone: "warning" },
  improve: { label: "Cần cải thiện", tone: "danger" },
  insufficient: { label: "Chưa đủ dữ liệu", tone: "neutral" },
};

/** Each indicator is rated on its own; there is deliberately no combined score. */
export function ReportHealth({
  indicators,
  asOf,
}: {
  indicators: Indicator[];
  asOf: string;
}) {
  const { t, locale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden();
  const format = ({ type, value }: Fact) => {
    if (value === null) return "—";
    if (type === "money") return money(value);
    if (type === "count") return value;
    if (type === "month") return formatMonth(value, locale);
    if (type === "percent")
      return hidden ? "••• %" : `${formatDecimal(value, locale)}%`;
    return t("{value} tháng", {
      value: hidden ? "•••" : formatDecimal(value, locale),
    });
  };
  function basis(item: Indicator) {
    if (item.id === "emergency")
      return t("Số dư tại ngày {date}.", { date: formatDate(asOf, locale) });
    if (item.id === "goals")
      return t("Theo trạng thái hôm nay, không phụ thuộc kỳ báo cáo.");
    if (!item.months.length) return null;
    if (item.fallback)
      return t(
        "Kỳ đang chọn chưa có tháng kết thúc nên xét tháng gần nhất: {month}.",
        { month: formatMonth(item.months[0].month, locale) },
      );
    return t("Tính trên {used}/{total} tháng đã kết thúc.", {
      used: item.months.filter((m) => !m.excluded).length,
      total: item.months.length,
    });
  }
  return (
    <section
      className="panel reports-health"
      aria-labelledby="reports-health-title"
    >
      <header className="reports-card-heading">
        <h2 id="reports-health-title">{t("Sức khỏe tài chính")}</h2>
        <span>{t("Đánh giá riêng từng chỉ số từ dữ liệu đã ghi.")}</span>
      </header>
      <div className="reports-indicators">
        {indicators.map((item) => {
          const skipped = item.months.filter((m) => m.excluded);
          const list = skipped.length > 0 && (
            <ul className="reports-skipped">
              {skipped.map((m) => (
                <li key={m.month}>
                  {t("Không tính {month}", {
                    month: formatMonth(m.month, locale),
                  })}
                  : {t(m.excluded!)}
                </li>
              ))}
            </ul>
          );
          const unrated = item.rating === "insufficient";
          const note = basis(item);
          return (
            <article key={item.id} data-indicator={item.id}>
              <header>
                <h3>{t(item.label)}</h3>
                <StatusBadge tone={ratings[item.rating].tone}>
                  {t(ratings[item.rating].label)}
                </StatusBadge>
              </header>
              {item.value && (
                <p className="reports-indicator-value">
                  <strong>{format(item.value)}</strong>
                  <span>{t(item.value.label)}</span>
                </p>
              )}
              {item.reason && <p>{t(item.reason)}</p>}
              {item.facts.length > 0 && (
                <dl>
                  {item.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt>{t(fact.label)}</dt>
                      <dd>{format(fact)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {note && <p className="reports-indicator-basis">{note}</p>}
              {unrated && list}
              <p className="reports-indicator-suggestion">
                {t(item.suggestion)}
              </p>
              <AnimatedDetails>
                <summary>{t("Cách tính")}</summary>
                <p>{t(item.formula)}</p>
                {!unrated && list}
              </AnimatedDetails>
            </article>
          );
        })}
      </div>
    </section>
  );
}
