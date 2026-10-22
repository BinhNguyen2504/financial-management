"use client";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { LoadingStatus, LoadingSpinner } from "@/components/loading";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeIcon, ThemeText } from "@/components/theme-decoration";
import { ArrowRight, Wallet } from "lucide-react";
import type { ExpenseView } from "@/domain/expenses/types";
import { summarize, buildReport } from "@/domain/expenses/reports";
import { jarEmoji } from "@/domain/expenses/emoji";
import { useMoney } from "@/components/privacy";
import { Garden } from "@/components/garden";
import { ImportSuggestion } from "@/features/settings/import-suggestion";
import { DailyNote } from "@/components/daily-note";
import { DonutChart } from "./charts";
import { apiJSON, RequestError } from "./api";
import { monthName } from "./format";

export function ExpenseOverview({ configured }: { configured: boolean }) {
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
            : "Chưa tải được dữ liệu. Hãy thử lại.",
        );
        throw e;
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, []),
    configured,
  );
  useEffect(() => {
    if (!configured) return;
    void reload().catch(() => {});
    return () => {
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
          <p className="eyebrow">KHÔNG GIAN TÀI CHÍNH CỦA BẠN</p>
          <HelpPageTitle id="welcome-title">
            Bình tâm hôm nay.
            <br />
            <span>Vun đắp ngày mai.</span>
          </HelpPageTitle>
          <p className="lead">
            Một chút quan tâm mỗi ngày, để tiền bạc trở thành điểm tựa cho những
            điều bạn yêu.
          </p>
          <Link className="expense-primary" href="/budgets">
            Chăm sóc các hũ <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <Garden />
      </section>
      <DailyNote />
      <HelpButton
        pageId="overview"
        sectionId="terms"
        label="Đọc các chỉ số tháng"
      />
      {configured && <ImportSuggestion />}
      <section aria-labelledby="month-overview-title">
        <div className="section-title">
          <div>
            <p className="eyebrow">TỪNG BƯỚC NHỎ, MỖI THÁNG</p>
            <h2 id="month-overview-title">
              {current
                ? `Các hũ của bạn · ${monthName(current)}`
                : "Bức tranh tháng này"}
            </h2>
          </div>
          {total && (
            <span>
              {rows.length} hũ ·{" "}
              {total.provisional ? "Có số tạm tính" : "Đã ghi nhận"}
            </span>
          )}
        </div>
        {loading && !view && (
          <LoadingStatus className="overview-loading">
            <ThemeText name="overviewLoading" />
          </LoadingStatus>
        )}
        {error && (
          <div className="expense-notice expense-feedback" role="alert">
            <p>{login ? "Đăng nhập để trở về với các hũ của bạn." : error}</p>
            {login ? (
              <Link className="expense-secondary" href="/login">
                Đăng nhập
              </Link>
            ) : (
              <button
                type="button"
                className="expense-secondary"
                disabled={loading}
                aria-busy={loading}
                onClick={() => void reload().catch(() => {})}
              >
                {loading && <LoadingSpinner />} Thử tải lại
              </button>
            )}
          </div>
        )}
        {total ? (
          <>
            <div className="overview-metrics">
              {[
                {
                  label: "Mức tháng",
                  value: total.target,
                  hint: "Những khoản bạn dự định dành sẵn",
                  Icon: Wallet,
                },
                {
                  label: "Thực chi",
                  value: total.spent,
                  hint: total.provisional
                    ? "Tạm tính · cập nhật số dư để chính xác hơn"
                    : "Những khoản đã sử dụng",
                  Icon: ThemeIcon,
                },
                {
                  label: "Còn trong hũ",
                  value: total.closing,
                  hint: "Tiếp tục dành cho những điều sắp tới",
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
                  <h2>Tiền đã đi đâu?</h2>
                  <span>Theo nhóm mục đích</span>
                </div>
                {report && <DonutChart items={report.byGroup} table />}
              </section>
              <section className="panel overview-jars">
                <div className="section-title">
                  <h2>
                    <ThemeText name="overviewJars" />
                  </h2>
                  <Link href="/budgets" className="text-link">
                    Xem tất cả <ArrowRight size={15} aria-hidden="true" />
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
                          ? "Đang tích lũy"
                          : "Chi trong tháng"}
                      </small>
                    </span>
                    <span>
                      <small>Còn lại</small>
                      <strong>{money(row.closing)}</strong>
                    </span>
                  </Link>
                ))}
                <p className="expense-muted">
                  Mỗi hũ là một khoảng dành riêng cho điều bạn quan tâm.
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
                    ? "Chuẩn bị một góc nhỏ cho tài chính"
                    : !view?.book
                      ? "Gieo hạt đầu tiên cho tháng của bạn"
                      : "Tháng này đang chờ những hũ đầu tiên"}
                </h3>
                <p>
                  {!configured
                    ? "Kết nối dịch vụ đăng nhập và lưu trữ để bắt đầu. Các khoản tiền của bạn sẽ được giữ riêng và đồng bộ khi kết nối hoàn tất."
                    : "Bắt đầu bằng một hũ chi tiêu hoặc khoản tích lũy nhỏ. Bức tranh tháng này sẽ dần hiện ra từ dữ liệu bạn ghi nhận."}
                </p>
                <Link href="/budgets" className="expense-primary">
                  {!configured ? "Chuẩn bị không gian" : "Mở Chi tiêu"}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )
        )}
      </section>
      <section className="next-chapters">
        <h2>Những mảnh ghép tiếp theo</h2>
        <p>
          Theo dõi tiền, sổ tiết kiệm và vàng trong Tiết kiệm. Tài khoản dùng
          chung và mục tiêu sẽ tiếp tục được phát triển.
        </p>
        <div className="expense-actions">
          <Link href="/income" className="text-link">
            Theo dõi Thu nhập <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/savings" className="text-link">
            Theo dõi Tiết kiệm <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/goals" className="text-link">
            Khám phá hướng phát triển{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
