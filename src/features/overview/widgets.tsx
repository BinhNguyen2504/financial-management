"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatMonth } from "@/i18n/format";
import { useMoney } from "@/components/privacy";
import { DailyNote } from "@/components/daily-note";
import { LoadingStatus, LoadingSpinner } from "@/components/loading";
import { widgetCatalog, type WidgetId } from "@/domain/overview/layout";
import {
  sum,
  type OverviewData,
  type OverviewSummary,
  type SourceId,
} from "@/domain/overview/summary";
import { widgetSources } from "@/domain/overview/summary";

export function OverviewWidget({
  id,
  sources,
  staleSources,
  loading,
  today,
  jarIds,
  onRetry,
}: {
  id: WidgetId;
  sources: OverviewSummary["sources"];
  staleSources: Set<SourceId>;
  loading: boolean;
  today: string;
  jarIds: string[];
  onRetry: () => void;
}) {
  const { t, locale, numberLocale } = useI18n("overview"),
    money = useMoney();
  const [expanded, setExpanded] = useState(false);
  const catalog = widgetCatalog[id],
    needed = widgetSources[id];
  const failed = needed.some(
    (k) => sources[k]?.status === "error" || staleSources.has(k),
  );
  const pending = needed.some((k) => !sources[k]);
  const data = <K extends SourceId>(key: K): OverviewData[K] | undefined => {
    const result = sources[key];
    return result?.status === "ready" ? result.data : undefined;
  };
  const number = (v: number) => new Intl.NumberFormat(numberLocale).format(v);
  const amount = (v: string | null) =>
    v === null ? t("Chưa đủ dữ liệu") : money(v);
  const metric = (label: string, v: string | null, main = false) => (
    <div className={main ? "overview-value-main" : "overview-value"}>
      <dt>{t(label)}</dt>
      <dd>{amount(v)}</dd>
    </div>
  );
  const empty = (
    <p className="overview-empty">
      {t("Chưa có dữ liệu. Mở module để bắt đầu ghi nhận.")}
    </p>
  );
  let content: ReactNode = null;
  if (id === "peace") content = <DailyNote />;
  if (id === "income") {
    const v = data("income");
    if (v)
      content = v.empty ? (
        empty
      ) : (
        <>
          <dl>
            {metric("Tổng thực nhận", v.total, true)}
            {metric("Thu cố định", v.fixed)}
            {metric("Thu phát sinh", v.oneoff)}
          </dl>
          <p className={v.missing ? "overview-warning" : "expense-muted"}>
            {t("{0} khoản thu cố định chưa nhập", { 0: number(v.missing) })}
          </p>
        </>
      );
  }
  if (id === "expenses") {
    const v = data("expenses");
    if (v)
      content =
        v.empty || !v.total ? (
          empty
        ) : (
          <>
            <dl>
              {metric("Thực chi", v.total.spent, true)}
              {metric("Mức tháng", v.total.target)}
              {metric("Còn trong hũ", v.total.closing)}
            </dl>
            {v.total.provisional && (
              <p className="expense-muted">
                {t("Tạm tính · đối chiếu số dư hũ để chính xác hơn.")}
              </p>
            )}
          </>
        );
  }
  if (id === "savings") {
    const v = data("savings");
    if (v)
      content = v.empty ? (
        empty
      ) : (
        <>
          <dl>
            {metric(
              v.missing ? "Giá trị đã biết" : "Giá trị trong Tiết kiệm",
              v.missing ? v.knownValue : v.total,
              true,
            )}
            {v.kinds.map((k) => (
              <div key={k.kind}>
                {metric(
                  k.kind === "cash"
                    ? "Tiền"
                    : k.kind === "deposit"
                      ? "Sổ tiết kiệm"
                      : "Vàng",
                  k.value,
                )}
              </div>
            ))}
          </dl>
          {v.missing > 0 && (
            <p className="overview-warning">
              {t("{0} danh mục chưa định giá", { 0: number(v.missing) })}
            </p>
          )}
          {v.stale > 0 && (
            <p className="expense-muted">
              {t("{0} danh mục có định giá cũ hoặc thiếu giá", {
                0: number(v.stale),
              })}
            </p>
          )}
        </>
      );
  }
  if (id === "investments") {
    const v = data("investments");
    if (v)
      content = v.empty ? (
        empty
      ) : (
        <>
          <dl>
            {metric(
              v.missing
                ? "Giá trị đã biết trong Đầu tư"
                : "Giá trị trong Đầu tư",
              v.missing ? v.knownValue : v.total,
              true,
            )}
            {metric("Khoản đầu tư", v.value)}
            {metric("Vốn còn giữ", v.cost)}
            {metric("Lãi/lỗ chưa chốt", v.unrealized)}
            {metric("Tiền chờ", v.cash)}
          </dl>
          {(v.missing > 0 || v.stale > 0) && (
            <p className="overview-warning">
              {t("{0} danh mục có định giá cũ hoặc thiếu giá", {
                0: number(v.stale),
              })}
            </p>
          )}
        </>
      );
  }
  if (id === "funds") {
    const v = data("funds");
    if (v)
      content = v.empty ? (
        empty
      ) : (
        <>
          <dl>{metric("Tổng dự phòng", v.total, true)}</dl>
          <div className="overview-fund-rows">
            {v.funds.map((f) => (
              <div key={f.id}>
                <div>
                  <span>
                    {f.id === "emergency"
                      ? "Emergency"
                      : f.id === "rainy_day"
                        ? "Rainy Day"
                        : "Sinking"}
                  </span>
                  <span>
                    {money(f.balance)} / {money(f.target)}
                  </span>
                </div>
                <progress
                  max={100}
                  value={Math.min(100, Number(f.percent))}
                  aria-label={
                    f.id === "emergency"
                      ? "Emergency"
                      : f.id === "rainy_day"
                        ? "Rainy Day"
                        : "Sinking"
                  }
                />
              </div>
            ))}
          </div>
          <p className="expense-muted">
            {t("Emergency đủ trang trải {0} tháng", {
              0: new Intl.NumberFormat(numberLocale, {
                maximumFractionDigits: 2,
              }).format(Number(v.emergencyMonths)),
            })}
          </p>
          {v.sourceChanged && (
            <p className="overview-warning">
              {t(
                "Nguồn tính mục tiêu quỹ đã thay đổi. Mở Quỹ an toàn để kiểm tra.",
              )}
            </p>
          )}
        </>
      );
  }
  if (id === "allocation") {
    const v = data("expenses");
    if (v) {
      const groups = v.groups.filter((g) => BigInt(g.value) > 0n),
        total = BigInt(sum(groups.map((g) => g.value))),
        items =
          groups.length > 4
            ? [
                ...groups.slice(0, 4),
                {
                  name: t("Khác"),
                  value: sum(groups.slice(4).map((g) => g.value)),
                  unlabeled: false,
                },
              ]
            : groups;
      content = !items.length ? (
        <p>{t("Chưa có thực chi để phân bổ.")}</p>
      ) : (
        <>
          <table className="overview-allocation">
            <caption className="sr-only">
              {t("Thực chi theo nhóm mục đích")}
            </caption>
            <thead className="sr-only">
              <tr>
                <th>{t("Nhóm")}</th>
                <th>{t("Thực chi")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g, index) => (
                <tr key={`${index}:${g.name}`}>
                  <th scope="row">
                    {g.unlabeled ? t(g.name) : g.name}
                    <span className="overview-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${Number((BigInt(g.value) * 10000n) / total) / 100}%`,
                        }}
                      />
                    </span>
                  </th>
                  <td>
                    {money(g.value)}
                    <small>
                      {new Intl.NumberFormat(numberLocale, {
                        style: "percent",
                        maximumFractionDigits: 1,
                      }).format(
                        Number((BigInt(g.value) * 10000n) / total) / 10000,
                      )}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {v.total?.provisional && (
            <p className="expense-muted">
              {t("Tạm tính · đối chiếu số dư hũ để chính xác hơn.")}
            </p>
          )}
        </>
      );
    }
  }
  if (id === "jars") {
    const v = data("expenses");
    if (v)
      content = !jarIds.length ? (
        <p>{t("Chọn hũ trong Tùy chỉnh Tổng quan để bắt đầu theo dõi.")}</p>
      ) : (
        <ul className="overview-list">
          {jarIds.map((jarId) => {
            const j = v.jars.find((j) => j.jarId === jarId);
            return (
              <li key={jarId}>
                <span>
                  <strong>
                    {j?.name ?? t("Hũ không còn trong tháng này")}
                  </strong>
                  <small>
                    {!j || !j.active
                      ? t("Đã ngừng")
                      : j.kind === "monthly"
                        ? t("Chi trong tháng")
                        : t("Đang tích lũy")}
                    {j?.status === "provisional" ? ` · ${t("Tạm tính")}` : ""}
                  </small>
                </span>
                <span>
                  {j ? money(j.closing) : "—"}
                  {j && BigInt(j.over) > 0n && (
                    <small className="overview-warning">{t("Vượt mức")}</small>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      );
  }
  if (id === "maturities") {
    const v = data("savings");
    if (v)
      content = !v.due.length ? (
        <p>{t("Không có sổ đến hạn trong 7 ngày tới.")}</p>
      ) : (
        <>
          <ul className="overview-list">
            {v.due.slice(0, 5).map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.name}</strong>
                  <small>
                    {formatDate(s.maturity, locale)} ·{" "}
                    {t(s.maturity <= today ? "Đã đến hạn" : "Sắp đến hạn")}
                  </small>
                </span>
                <span>{money(s.principal)}</span>
              </li>
            ))}
          </ul>
          {v.due.length > 5 && (
            <p>
              {t("Còn {0} sổ. Mở Tiết kiệm để xem tất cả.", {
                0: number(v.due.length - 5),
              })}
            </p>
          )}
        </>
      );
  }
  if (id === "attention") {
    const e = data("expenses"),
      i = data("income"),
      s = data("savings"),
      inv = data("investments"),
      f = data("funds");
    const items = [
      {
        count: s?.due.length ?? 0,
        label: "Sổ đã hoặc sắp đến hạn",
        href: "/savings",
        hint: "Trong 7 ngày tới, gồm sổ đã đến hạn chưa xử lý.",
      },
      {
        count: e?.over ?? 0,
        label: "Hũ vượt mức tháng",
        href: "/budgets",
        hint: e?.total?.provisional ? "Có số tạm tính; cần đối chiếu." : "",
      },
      {
        count: i?.missing ?? 0,
        label: "Thu cố định chưa nhập",
        href: "/income",
        hint: "Trong tháng hiện tại.",
      },
      {
        count: s?.stale ?? 0,
        label: "Tiết kiệm cần kiểm tra định giá",
        href: "/savings",
        hint: "Giá đã cũ theo tháng hoặc chưa có giá.",
      },
      {
        count: inv?.stale ?? 0,
        label: "Đầu tư cần kiểm tra định giá",
        href: "/investments",
        hint: "Giá đã cũ theo tháng hoặc chưa có giá.",
      },
      {
        count: f?.sourceChanged ? 1 : 0,
        label: "Nguồn tính quỹ thay đổi",
        href: "/funds",
        hint: f?.sourceUnavailable
          ? "Nguồn chi phí sinh hoạt không còn đầy đủ."
          : "Mở Quỹ an toàn để xem trước và áp dụng.",
      },
    ].filter((v) => v.count > 0);
    content = (
      <>
        {!items.length && !pending && (
          <p>
            {t(
              failed
                ? "Chưa kiểm tra đủ các module."
                : "Chưa có khoản cần chú ý từ dữ liệu đã ghi.",
            )}
          </p>
        )}
        <ul className="overview-attention">
          {(expanded ? items : items.slice(0, 5)).map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <span>
                  <strong>{t(item.label)}</strong>
                  <small>{t(item.hint)}</small>
                </span>
                <span>{number(item.count)} →</span>
              </Link>
            </li>
          ))}
        </ul>
        {items.length > 5 && (
          <button
            className="text-link"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {t(expanded ? "Thu gọn" : "Xem tất cả")}
          </button>
        )}
      </>
    );
  }
  return (
    <section
      className="panel overview-widget"
      data-widget={id}
      aria-labelledby={`overview-widget-${id}`}
      aria-busy={loading && pending}
    >
      <header>
        <div>
          <h2 id={`overview-widget-${id}`}>{t(catalog.title)}</h2>
          {id !== "peace" && (
            <p>
              {id === "income" ||
              id === "expenses" ||
              id === "allocation" ||
              id === "jars"
                ? formatMonth(today.slice(0, 7), locale)
                : t("Đến {0}", { 0: formatDate(today, locale) })}
            </p>
          )}
        </div>
        {catalog.href && (
          <Link className="text-link" href={catalog.href}>
            {t("Mở module")}
            <span className="sr-only"> · {t(catalog.title)}</span>
            <span aria-hidden="true"> →</span>
          </Link>
        )}
      </header>
      {failed && (
        <div className="overview-source-error" role="status">
          <p>
            {t(
              staleSources.size && needed.some((s) => staleSources.has(s))
                ? "Chưa cập nhật được. Đang hiển thị số liệu lần tải trước."
                : "Chưa tải được nguồn dữ liệu của widget.",
            )}
          </p>
          <button
            disabled={loading}
            aria-busy={loading}
            className="text-link"
            onClick={onRetry}
          >
            {loading && <LoadingSpinner />}
            {t("Thử tải lại")}
          </button>
        </div>
      )}
      {pending && loading && (
        <LoadingStatus>{t("Đang tải widget…")}</LoadingStatus>
      )}
      {content}
    </section>
  );
}
