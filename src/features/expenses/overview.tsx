"use client";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";

import { DailyNote } from "@/components/daily-note";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { useMoney } from "@/components/privacy";
import { ThemeIcon, ThemeText } from "@/components/theme-decoration";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { jarEmoji } from "@/domain/expenses/emoji";
import { buildReport, summarize } from "@/domain/expenses/reports";
import type { ExpenseView } from "@/domain/expenses/types";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { ImportSuggestion } from "@/features/settings/import-suggestion";
import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJSON, RequestError } from "./api";
import { DonutChart } from "./charts";
import { monthName } from "./format";

export function ExpenseOverview({ configured }: { configured: boolean }) {
  const { t: tr, locale } = useI18n("expenses");

  const money = useMoney();
  const [view, setView] = useState<ExpenseView | null>(null);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const [loading, setLoading] = useState(configured);
  const request = useRef(0);
  const reload = useForegroundRefresh(
    useCallback(async () => {
      const id = ++request.current;
      setLoading(true);
      try {
        const next = await apiJSON<ExpenseView>("");
        if (id !== request.current) return;
        setView(next);
        setError("");
        setLogin(false);
      } catch (e) {
        if (id !== request.current) return;
        const unauthenticated =
          e instanceof RequestError && e.code === "UNAUTHENTICATED";
        if (unauthenticated) setView(null);
        setLogin(unauthenticated);
        setError(
          e instanceof Error
            ? e.message
            : tr("Chưa tải được dữ liệu. Hãy thử lại."),
        );
        throw e;
      } finally {
        if (id === request.current) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Locale changes must not recreate the request controller or trigger a data reload.
    }, []),
    configured,
  );
  useEffect(() => {
    if (!configured) return;
    void reload().catch(() => {});
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest request sequence on cleanup, including requests started after mount.
      request.current++;
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!view) return;
    const timeout = Math.max(
      1000,
      Math.min(
        86400000,
        Date.parse(`${view.today}T00:00:00+07:00`) +
          86400000 -
          Date.now() +
          1000,
      ),
    );
    const timer = window.setTimeout(
      () => void reload().catch(() => {}),
      timeout,
    );
    return () => window.clearTimeout(timer);
  }, [view, reload]);
  const current = view?.today.slice(0, 7);
  const rows = view?.rows.filter((r) => r.month === current) ?? [];
  const total = summarize(rows, () => "month")[0];
  const report =
    view && current
      ? buildReport(
          rows,
          {
            year: view.currentYear,
            from: Number(current.slice(5)),
            to: Number(current.slice(5)),
          },
          view.currentYear,
        )
      : null;
  return (
    <div className="zen-overview">
      <section className="welcome-garden" aria-labelledby="welcome-title">
        <div>
          <p className="eyebrow">{tr("KHÔNG GIAN TÀI CHÍNH CỦA BẠN")}</p>
          <HelpPageTitle id="welcome-title">
            {tr("Bình tâm hôm nay.")}
            <br />
            <span>{tr("Vun đắp ngày mai.")}</span>
          </HelpPageTitle>
          <p className="lead">
            {tr(
              "Một chút quan tâm mỗi ngày, để tiền bạc trở thành điểm tựa cho những điều bạn yêu.",
            )}
          </p>
          <Link className="expense-primary" href="/budgets">
            {tr("Chăm sóc các hũ")} <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <Garden />
      </section>
      <DailyNote />
      {configured && <ImportSuggestion />}
      <section aria-labelledby="month-overview-title">
        <div className="section-title overview-month-heading">
          <div>
            <p className="eyebrow">{tr("TỪNG BƯỚC NHỎ, MỖI THÁNG")}</p>
            <h2 id="month-overview-title">
              {current
                ? tr("Các hũ của bạn · {0}", { 0: monthName(current, locale) })
                : tr("Bức tranh tháng này")}
            </h2>
            {total && (
              <p className="overview-month-status status-meta">
                <span>
                  {rows.length} {tr("hũ")}
                </span>
                <StatusBadge
                  size="compact"
                  tone={total.provisional ? "warning" : "success"}
                >
                  {total.provisional ? tr("Có số tạm tính") : tr("Đã ghi nhận")}
                </StatusBadge>
              </p>
            )}
          </div>
          <HelpButton
            pageId="overview"
            sectionId="terms"
            label={tr("Đọc các chỉ số tháng")}
          />
        </div>
        {loading && !view && (
          <LoadingStatus className="overview-loading">
            <ThemeText name="overviewLoading" />
          </LoadingStatus>
        )}
        {error && (
          <div className="expense-notice expense-feedback" role="alert">
            <p>
              {login ? tr("Đăng nhập để trở về với các hũ của bạn.") : error}
            </p>
            {login ? (
              <Link className="expense-secondary" href="/login">
                {tr("Đăng nhập")}
              </Link>
            ) : (
              <button
                type="button"
                className="expense-secondary"
                disabled={loading}
                aria-busy={loading}
                onClick={() => void reload().catch(() => {})}
              >
                {loading && <LoadingSpinner />} {tr("Thử tải lại")}
              </button>
            )}
          </div>
        )}
        {total ? (
          <>
            <div className="overview-metrics">
              {[
                {
                  label: tr("Mức tháng"),
                  value: total.target,
                  hint: tr("Những khoản bạn dự định dành sẵn"),
                  Icon: Wallet,
                },
                {
                  label: tr("Thực chi"),
                  value: total.spent,
                  hint: total.provisional
                    ? tr("Tạm tính · cập nhật số dư để chính xác hơn")
                    : tr("Những khoản đã sử dụng"),
                  Icon: ThemeIcon,
                },
                {
                  label: tr("Còn trong hũ"),
                  value: total.closing,
                  hint: tr("Tiếp tục dành cho những điều sắp tới"),
                  Icon: ThemeIcon,
                },
              ].map(({ label, value, hint, Icon }) => (
                <article key={label} className="metric overview-metric">
                  <span className="metric-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3>{label}</h3>
                  <p className="metric-value">{money(value)}</p>
                  <p>{hint}</p>
                </article>
              ))}
            </div>
            <div className="overview-detail-grid">
              <section className="panel">
                <div className="section-title">
                  <h2>{tr("Tiền đã đi đâu?")}</h2>
                  <span>{tr("Theo nhóm mục đích")}</span>
                </div>
                {report && <DonutChart items={report.byGroup} table />}
              </section>
              <section className="panel overview-jars">
                <div className="section-title">
                  <h2>
                    <ThemeText name="overviewJars" />
                  </h2>
                  <Link href="/budgets" className="text-link">
                    {tr("Xem tất cả")}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
                {rows.slice(0, 5).map((row) => (
                  <Link
                    key={row.jarId}
                    href="/budgets"
                    className="overview-jar"
                  >
                    <span className="jar-emoji" aria-hidden="true">
                      {jarEmoji(row.name, row.kind, row.emoji)}
                    </span>
                    <span>
                      <strong>{row.name}</strong>
                      <small>
                        {row.kind === "accumulation"
                          ? tr("Đang tích lũy")
                          : tr("Chi trong tháng")}
                      </small>
                    </span>
                    <span>
                      <small>{tr("Còn lại")}</small>
                      <strong>{money(row.closing)}</strong>
                    </span>
                  </Link>
                ))}
                <p className="expense-muted">
                  {tr("Mỗi hũ là một khoảng dành riêng cho điều bạn quan tâm.")}
                </p>
              </section>
            </div>
          </>
        ) : (
          (view || (!loading && !error)) && (
            <div className="panel overview-start">
              <Garden variant="jar" />
              <div>
                <h3>
                  {!configured
                    ? tr("Chuẩn bị một góc nhỏ cho tài chính")
                    : !view?.book
                      ? tr("Gieo hạt đầu tiên cho tháng của bạn")
                      : tr("Tháng này đang chờ những hũ đầu tiên")}
                </h3>
                <p>
                  {!configured
                    ? tr(
                        "Kết nối dịch vụ đăng nhập và lưu trữ để bắt đầu. Các khoản tiền của bạn sẽ được giữ riêng và đồng bộ khi kết nối hoàn tất.",
                      )
                    : tr(
                        "Bắt đầu bằng một hũ chi tiêu hoặc khoản tích lũy nhỏ. Bức tranh tháng này sẽ dần hiện ra từ dữ liệu bạn ghi nhận.",
                      )}
                </p>
                <Link href="/budgets" className="expense-primary">
                  {!configured ? tr("Chuẩn bị không gian") : tr("Mở Chi tiêu")}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )
        )}
      </section>
      <section className="next-chapters">
        <h2>{tr("Những mảnh ghép tiếp theo")}</h2>
        <p>
          {tr(
            "Theo dõi tiền, sổ tiết kiệm và vàng trong Tiết kiệm. Tài khoản dùng chung và mục tiêu sẽ tiếp tục được phát triển.",
          )}
        </p>
        <div className="expense-actions">
          <Link href="/income" className="text-link">
            {tr("Theo dõi Thu nhập")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/savings" className="text-link">
            {tr("Theo dõi Tiết kiệm")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/goals" className="text-link">
            {tr("Khám phá hướng phát triển")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
