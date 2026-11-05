"use client";
import { PageGuide } from "@/features/help/page-guide";
import { useViewState } from "@/components/use-view-state";
import { ViewControls } from "@/components/view-controls";
import { ActionOptions } from "@/components/action-options";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { HelpPageTitle } from "@/features/help/provider";
import { useUser } from "@/features/profile/user-provider";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatDecimal, formatTime } from "@/i18n/format";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { LoadingStatus, LoadingSpinner } from "@/components/loading";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { focusPointerControl } from "@/components/pointer-focus";
import { vietnamClock } from "@/domain/shared/clock";
import {
  parseQuery,
  querySchema,
  tabs,
  type Report,
  type ReportQuery,
  type Metric,
} from "@/domain/reports/model";
import { reportCSV } from "@/i18n/report-exports/reports";
import { reportsJSON, ReportAPIError } from "./api";
import { ReportTable } from "./table";
import { ReportChart } from "./chart";
import { ReportDetails } from "./details";
import "./reports.css";

const tabNames = {
  summary: "Tổng hợp",
  cashflow: "Thu–chi",
  savings: "Tiết kiệm",
  investments: "Đầu tư",
  funds: "Quỹ an toàn",
  goals: "Mục tiêu",
};
const sourceNames = {
  income: "Thu nhập",
  expenses: "Chi tiêu",
  savings: "Tiết kiệm",
  investments: "Đầu tư",
  funds: "Quỹ an toàn",
  goals: "Mục tiêu",
};
const validQuery = (value: unknown) => querySchema.safeParse(value).success;
const encodeQuery = (query: ReportQuery) =>
  new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
  ).toString();
export function ReportsWorkspace({ configured }: { configured: boolean }) {
  const { user } = useUser();
  return (
    <AccountReports key={user?.id ?? "unconfigured"} configured={configured} />
  );
}
function AccountReports({ configured }: { configured: boolean }) {
  const { t, locale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden(),
    search = useSearchParams();
  const [rememberedQuery, rememberQuery] = useViewState<ReportQuery>(
    "reports",
    "query",
    parseQuery({}, vietnamClock()),
    validQuery,
  );
  const raw = search.toString();
  const selection = useMemo(() => {
    try {
      return {
        query: parseQuery(
          raw ? Object.fromEntries(new URLSearchParams(raw)) : rememberedQuery,
          vietnamClock(),
        ),
        invalid: false,
      };
    } catch {
      return { query: parseQuery({}, vietnamClock()), invalid: true };
    }
  }, [raw, rememberedQuery]);
  const query = selection.query,
    key = encodeQuery(query);
  useEffect(() => {
    if (raw && !selection.invalid && key !== encodeQuery(rememberedQuery))
      rememberQuery(query);
  }, [raw, selection.invalid, key, rememberedQuery, rememberQuery, query]);
  const [loaded, setLoaded] = useState<{ key: string; report: Report } | null>(
      null,
    ),
    [busy, setBusy] = useState(configured && !selection.invalid),
    [error, setError] = useState(""),
    [needsLogin, setNeedsLogin] = useState(false),
    [detail, setDetail] = useState<Metric | null>(null);
  const sequence = useRef(0),
    abort = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!configured || selection.invalid) return;
    const id = ++sequence.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      const report = await reportsJSON<Report>(`?${key}`, controller.signal);
      if (id === sequence.current) {
        setLoaded({ key, report });
        setDetail(null);
      }
    } catch (e) {
      if (id === sequence.current && !controller.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : "Chưa tải được Báo cáo. Hãy thử lại.",
        );
        setNeedsLogin(e instanceof ReportAPIError && e.status === 401);
      }
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }, [configured, key, selection.invalid]);
  const reload = useForegroundRefresh(load, configured && !selection.invalid);
  useEffect(() => {
    void reload();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- This counter invalidates pending requests; it is not a DOM ref.
      sequence.current++;
      abort.current?.abort();
    };
  }, [reload]);
  const report =
    loaded?.key === key && !selection.invalid ? loaded.report : null;
  function change(next: Partial<ReportQuery>) {
    setDetail(null);
    rememberQuery({ ...query, ...next });
    window.history.pushState(
      null,
      "",
      `/reports?${encodeQuery({ ...query, ...next })}`,
    );
  }
  function download() {
    if (!report || busy || error || needsLogin) return;
    const url = URL.createObjectURL(
      new Blob([reportCSV(report, locale)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reports-${query.tab}-${report.period.from}-${report.period.to}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="reports-workspace" onMouseDownCapture={focusPointerControl}>
      <header className="reports-heading">
        <div>
          <HelpPageTitle>{t("Báo cáo")}</HelpPageTitle>
          <p>{t("Nhìn lại từng kỳ, hiểu rõ từng sổ.")}</p>
        </div>
        <div className="expense-actions">
          <button
            className="expense-secondary"
            disabled={busy || !configured || selection.invalid}
            aria-busy={busy}
            onClick={() => void reload()}
          >
            {busy ? (
              <LoadingSpinner />
            ) : (
              <RefreshCw size={17} aria-hidden="true" />
            )}
            {t("Cập nhật báo cáo")}
          </button>
          <ActionOptions>
            {" "}
            <button
              className="expense-primary"
              disabled={!report || busy || !!error || needsLogin}
              onClick={download}
            >
              <Download size={17} aria-hidden="true" />
              {t("Xuất bảng dữ liệu")}
            </button>
          </ActionOptions>
        </div>
      </header>
      <section
        className="panel reports-filters"
        aria-label={t("Bộ lọc báo cáo")}
      >
        <label>
          {t("Kỳ báo cáo")}
          <select
            value={query.period}
            onChange={(e) =>
              change({ period: e.target.value as ReportQuery["period"] })
            }
          >
            <option value="month">{t("Tháng")}</option>
            <option value="quarter">{t("Quý")}</option>
            <option value="year">{t("Năm")}</option>
          </select>
        </label>
        <label>
          {t("Năm")}
          <select
            value={query.year}
            onChange={(e) => change({ year: Number(e.target.value) })}
          >
            {Array.from(
              {
                length:
                  Math.max(
                    Number(vietnamClock().today.slice(0, 4)),
                    query.year,
                  ) - 1999,
              },
              (_, i) => 2000 + i,
            ).map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        {query.period !== "year" && (
          <label>
            {t(query.period === "quarter" ? "Quý" : "Tháng")}
            <select
              value={
                query.period === "quarter"
                  ? Math.ceil(query.month / 3)
                  : query.month
              }
              onChange={(e) =>
                change({
                  month:
                    query.period === "quarter"
                      ? (Number(e.target.value) - 1) * 3 + 1
                      : Number(e.target.value),
                })
              }
            >
              {Array.from(
                { length: query.period === "quarter" ? 4 : 12 },
                (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </section>
      <ViewControls
        past={
          query.period !== "month" ||
          query.year !== Number(vietnamClock().today.slice(0, 4)) ||
          query.month !== Number(vietnamClock().today.slice(5, 7))
        }
        onCurrent={() =>
          change({ ...parseQuery({}, vietnamClock()), tab: query.tab })
        }
      />
      <ScrollTabs as="nav" className="reports-tabs" aria-label={t("Báo cáo")}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={query.tab === tab ? "active" : ""}
            aria-pressed={query.tab === tab}
            onClick={() => change({ tab })}
          >
            {t(tabNames[tab])}
          </button>
        ))}
      </ScrollTabs>
      {!configured && (
        <p className="expense-notice">
          {t("Kết nối dịch vụ đăng nhập và lưu trữ để bắt đầu.")}
        </p>
      )}
      {selection.invalid && (
        <div className="expense-notice" role="alert">
          <p>{t("Kỳ báo cáo trên URL không hợp lệ.")}</p>
          <button
            className="expense-secondary"
            onClick={() => change(parseQuery({}, vietnamClock()))}
          >
            {t("Về tháng hiện tại")}
          </button>
        </div>
      )}
      <PageGuide pageId="reports" />
      {error && (
        <div className="expense-notice" role="alert">
          <p>{t(error)}</p>
          <button
            className="expense-secondary"
            disabled={busy}
            onClick={() => void reload()}
          >
            {t("Thử tải lại")}
          </button>
          {needsLogin && (
            <Link href="/login?next=/reports">{t("Đăng nhập")}</Link>
          )}
        </div>
      )}
      {busy && !selection.invalid && (
        <LoadingStatus>{t("Đang tải Báo cáo…")}</LoadingStatus>
      )}
      {report && !needsLogin && (
        <div
          className="reports-content"
          data-report-ready="true"
          aria-busy={busy}
        >
          <div className="reports-period">
            <p>
              <strong>
                {formatDate(report.period.from, locale)} –{" "}
                {formatDate(report.period.to, locale)}
              </strong>{" "}
              · {t("Số liệu đến")} {formatDate(report.period.asOf, locale)}
            </p>
            {report.period.partial && (
              <p className="reports-inline-state">
                {t("Kỳ này chưa kết thúc")}
              </p>
            )}
            {report.period.future && (
              <p className="reports-inline-state">
                {t("Kỳ này chưa diễn ra; chưa có số thực tế.")}
              </p>
            )}
          </div>
          {Object.entries(report.sources)
            .filter(([, state]) => state.status === "error")
            .map(([source]) => (
              <p key={source} role="alert">
                {t(sourceNames[source as keyof typeof sourceNames])}:{" "}
                {t("Lỗi tải nguồn")}
              </p>
            ))}
          <div className="reports-metrics">
            {report.metrics.map((metric) => (
              <article key={metric.id}>
                <h2>{t(metric.label)}</h2>
                {report.sources[metric.source]?.empty &&
                  report.metrics.find(
                    (item) => item.source === metric.source,
                  ) === metric && (
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
                  .filter((warning) =>
                    warning.startsWith(sourceNames[metric.source]),
                  )
                  .map((warning) => (
                    <p key={warning} className="reports-metric-warning">
                      {t(warning)}
                    </p>
                  ))}
                <button
                  className="reports-metric-value"
                  disabled={busy || !!error}
                  aria-label={`${t("Xem nguồn số liệu")}: ${t(metric.label)}`}
                  onClick={() => setDetail(metric)}
                >
                  {metric.value === null ? "—" : money(metric.value)}
                </button>
                <p>
                  {t("Kỳ trước")}:{" "}
                  {metric.previous === null ? "—" : money(metric.previous)}
                  {report.warnings.some((warning) =>
                    warning.startsWith("Kỳ trước"),
                  ) && (
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
            ))}
          </div>
          <details className="reports-explanation">
            <summary>
              {t("Chi tiết kỳ và chất lượng số liệu")} ·{" "}
              {report.warnings.length}
            </summary>
            <p>
              {t("Kỳ trước đầy đủ")}:{" "}
              {formatDate(report.previousPeriod.from, locale)} –{" "}
              {formatDate(report.previousPeriod.to, locale)}
            </p>
            <p>
              {t("Cập nhật lúc")} {formatTime(report.generatedAt, locale)}
            </p>
            {report.period.partial && (
              <p>{t("So sánh kỳ chưa kết thúc với toàn bộ kỳ trước.")}</p>
            )}
            {report.warnings.map((warning) => (
              <p key={warning}>{t(warning)}</p>
            ))}
            {Object.entries(report.sources)
              .filter(
                ([source, state]) =>
                  state.empty &&
                  !report.metrics.some((metric) => metric.source === source),
              )
              .map(([source]) => (
                <p key={source}>
                  {t(sourceNames[source as keyof typeof sourceNames])}:{" "}
                  {t("Chưa có dữ liệu")}
                </p>
              ))}
          </details>
          {(query.tab === "cashflow" || query.tab === "summary") && (
            <p className="reports-note">
              {t(
                "Thu nhập trừ Chi tiêu theo sổ hũ; chưa phải số dư tài khoản hoặc tiền có thể sử dụng.",
              )}
            </p>
          )}
          {query.tab === "goals" && (
            <p className="reports-note">
              {t(
                "Mục tiêu hiển thị tiến độ hiện tại, độc lập với kỳ báo cáo đang chọn.",
              )}
            </p>
          )}
          <ReportChart key={key} report={report} />
          <div className="reports-tables">
            {report.tables.map((table) => (
              <div key={table.id}>
                {table.id === "goals.current" && (
                  <p className="reports-note">
                    {t(
                      "Mục tiêu hiển thị tiến độ hiện tại, độc lập với kỳ báo cáo đang chọn.",
                    )}{" "}
                    · {formatTime(report.generatedAt, locale)}
                  </p>
                )}
                <ReportTable key={`${key}:${table.id}`} table={table} />
              </div>
            ))}
          </div>
          <p className="reports-note">
            {t(
              "Mỗi chức năng là một sổ độc lập; các số dư và tiến độ mục tiêu không được cộng thành tài sản ròng.",
            )}
          </p>
          {detail && (
            <ReportDetails
              key={detail.id}
              report={report}
              metric={detail}
              onClose={() => setDetail(null)}
              onRefresh={() => void reload()}
            />
          )}
        </div>
      )}
    </div>
  );
}
