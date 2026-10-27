"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { formatDate } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { Garden } from "@/components/garden";
import { AssetScene } from "@/components/asset-scene";
import { LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import {
  activeTransactions,
  endOfMonth,
  ruleAt,
} from "@/domain/savings/engine";
import { buildReport, type ReportFilter } from "@/domain/savings/reports";
import { monthSchema } from "@/domain/savings/schema";
import type { CategoryPosition, SavingsView } from "@/domain/savings/types";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { formatDecimal } from "@/i18n/format";
import { Download, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SavingsAPIError, downloadSavings, savingsJSON } from "./api";
import { SavingsDetails } from "./details";
import { SavingsCategoryTable, SavingsTransactionTable } from "./ledger-tables";
import {
  SavingsEditor,
  kindNames,
  transactionNames,
  type EditorMode,
} from "./editor";
import { SavingsReports } from "./report-panel";
export function SavingsWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");

  const toast = useToast();
  const money = useMoney(),
    hidden = useMoneyHidden();
  const [month, setMonth] = useState(initialToday.slice(0, 7)),
    [view, setView] = useState<SavingsView | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [status, setStatus] = useState(0),
    [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorMode | null>(null),
    [details, setDetails] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({
    from: `${initialToday.slice(0, 4)}-01-01`,
    to: initialToday,
  });
  const [activityCategory, setActivityCategory] = useState(""),
    [activityKind, setActivityKind] = useState("");
  const request = useRef(0);
  const load = useCallback(async () => {
    const n = ++request.current;
    setLoading(true);
    try {
      const v = await savingsJSON<SavingsView>(`?month=${month}`);
      if (request.current === n) {
        setView(v);
        setError("");
        setStatus(0);
      }
      return v;
    } catch (e) {
      if (request.current === n) {
        setError(e instanceof Error ? e.message : tr("Chưa tải được dữ liệu."));
        setStatus(e instanceof SavingsAPIError ? e.status : 0);
      }
      throw e;
    } finally {
      if (request.current === n) setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    if (configured) void load().catch(() => {});
    else setLoading(false);
  }, [configured, load]);
  const today = view?.today ?? initialToday;
  const categories = view?.book?.categories ?? [];
  const report = (() => {
    if (!view) return null;
    try {
      return buildReport(view.book, filter, {
        today,
        now: `${today}T00:00:00Z`,
      });
    } catch {
      return null;
    }
  })();
  const monthly = view
    ? buildReport(
        view.book,
        { from: `${month}-01`, to: endOfMonth(month) },
        { today, now: `${today}T00:00:00Z` },
      )
    : null;
  const overviewReport = view
    ? buildReport(
        view.book,
        { from: `${month.slice(0, 4)}-01-01`, to: endOfMonth(month) },
        { today, now: `${today}T00:00:00Z` },
      )
    : null;
  const transactions = view?.book
    ? activeTransactions(view.book).map((r) => r.transaction)
    : [];
  const selected = details
    ? view?.state.positions.find((p) => p.id === details)
    : undefined;
  const display = (v: string | null) =>
    v === null ? tr("Thiếu định giá") : money(v);
  async function download(path: string, name: string) {
    try {
      await downloadSavings(path, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Chưa xuất được dữ liệu."));
    }
  }
  function position(p: CategoryPosition) {
    return (
      <>
        <div>
          <h3>
            <span aria-hidden="true">{p.emoji}</span> {p.name}
          </h3>
          <p className="expense-muted">
            {localize(kindNames)[p.kind]}
            {!p.active ? tr(" · đã lưu trữ") : ""}
          </p>
        </div>
        <strong className="savings-value">{display(p.value)}</strong>
        <div className="savings-position-meta">
          {p.kind === "gold" ? (
            <>
              <span>
                {hidden ? "••••••" : formatDecimal(p.quantity, locale)}{" "}
                {tr(p.unit ?? "")}
              </span>
              <span>
                {tr("Giá vốn")} {money(p.cost)}
              </span>
              <span>
                {tr("Lãi/lỗ")} {display(p.unrealized)}
              </span>
              <span>
                {tr("Giá")} {p.priceDate ?? tr("chưa có")}
                {p.stale ? tr(" · cần cập nhật") : ""}
              </span>
            </>
          ) : (
            <span>
              {p.kind === "deposit"
                ? tr("Gốc đang gửi")
                : tr("Số dư theo giao dịch")}
            </span>
          )}
        </div>
        <button
          className="expense-secondary"
          onClick={() => setDetails(p.id)}
          aria-label={tr("Chi tiết {0}", { 0: p.name })}
        >
          {tr("Chi tiết")}
        </button>
      </>
    );
  }
  const monthlyTransactions = transactions.filter(
    (t) =>
      t.date >= `${month}-01` &&
      t.date <= endOfMonth(month) &&
      (!activityCategory ||
        t.categoryId === activityCategory ||
        ("cashCategoryId" in t && t.cashCategoryId === activityCategory)) &&
      (!activityKind || t.kind === activityKind),
  );
  const reportIds = new Set(report?.effects.map((effect) => effect.id));
  const reportTransactions = transactions.filter((t) => reportIds.has(t.id));
  return (
    <div className="savings-workspace" onMouseDownCapture={focusPointerControl}>
      <div className="expense-page-heading illustrated-heading">
        <div className="heading-copy">
          <p className="eyebrow">{tr("TÍCH LŨY CÓ LỊCH SỬ")}</p>
          <HelpPageTitle>
            {tr("Chăm chút")} <span>{tr("ngày mai.")}</span>
          </HelpPageTitle>
          <p className="lead">
            {tr("Tiền, sổ tiết kiệm và vàng — từng bước vun đắp theo tháng.")}
          </p>
        </div>
        <div className="heading-art">
          <AssetScene kind="savings" />
        </div>
      </div>
      {!configured ? (
        <section className="panel">
          <h2>{tr("Chưa kết nối dữ liệu Tiết kiệm")}</h2>
          <p>
            {tr(
              "Cấu hình Supabase và PostgreSQL theo hướng dẫn dự án để sử dụng.",
            )}
          </p>
        </section>
      ) : (
        <>
          {error && (
            <div role="alert" className="expense-error expense-feedback">
              <p>{tr(error)}</p>
              {status === 401 ? (
                <Link href="/login?next=/savings" className="expense-primary">
                  {tr("Đăng nhập")}
                </Link>
              ) : (
                <button
                  className="expense-secondary"
                  onClick={() => void load().catch(() => {})}
                >
                  {tr("Thử lại")}
                </button>
              )}
            </div>
          )}
          {loading && (
            <LoadingStatus>
              {view
                ? tr("Đang cập nhật sổ tiết kiệm…")
                : tr("Đang mở sổ tiết kiệm…")}
            </LoadingStatus>
          )}
          {view && (
            <>
              <div className="savings-toolbar">
                <label>
                  {tr("Tháng đang xem")}
                  <input
                    type="month"
                    value={month}
                    min="2000-01"
                    max={today.slice(0, 7)}
                    onChange={(e) => {
                      if (
                        monthSchema.safeParse(e.target.value).success &&
                        e.target.value <= today.slice(0, 7)
                      )
                        setMonth(e.target.value);
                    }}
                  />
                </label>
                <span className="pill">
                  {view.closed.includes(month)
                    ? tr("Đã chốt")
                    : month === today.slice(0, 7)
                      ? tr("Tạm tính")
                      : tr("Chưa chốt")}
                </span>
                <div className="expense-actions">
                  <button
                    className="expense-secondary"
                    onClick={() => void load().catch(() => {})}
                    disabled={loading}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {tr("Tải lại")}
                  </button>
                  <button
                    className="expense-secondary"
                    onClick={() =>
                      setEditor({
                        type: view.closed.includes(month) ? "reopen" : "close",
                      })
                    }
                  >
                    {view.closed.includes(month)
                      ? tr("Mở lại tháng")
                      : tr("Chốt tháng")}
                  </button>
                </div>
              </div>
              <div className="expense-actions savings-main-actions">
                <button
                  className="expense-primary"
                  onClick={() => setEditor({ type: "transaction" })}
                  disabled={!categories.length || loading}
                >
                  <Plus size={17} aria-hidden="true" />
                  {tr("Ghi giao dịch")}
                </button>
                <button
                  className="expense-secondary"
                  onClick={() => setEditor({ type: "create" })}
                >
                  {tr("Thêm danh mục")}
                </button>
                <button
                  className="expense-secondary"
                  onClick={() => setEditor({ type: "price" })}
                  disabled={!categories.some((c) => c.kind === "gold")}
                >
                  {tr("Cập nhật giá vàng")}
                </button>
              </div>
              <ScrollTabs
                className="savings-tabs"
                role="tablist"
                aria-label={tr("Tiết kiệm")}
              >
                {Object.entries({
                  overview: tr("Tổng quan"),
                  transactions: tr("Giao dịch"),
                  reports: tr("Báo cáo"),
                  categories: tr("Danh mục"),
                }).map(([id, label], i) => (
                  <button
                    id={`savings-tab-${id}`}
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    aria-controls="savings-tabpanel"
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={(e) => {
                      const ids = [
                        "overview",
                        "transactions",
                        "reports",
                        "categories",
                      ];
                      if (
                        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const next =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 3
                              : (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                        setTab(ids[next]);
                        document
                          .getElementById(`savings-tab-${ids[next]}`)
                          ?.focus({ preventScroll: true });
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </ScrollTabs>
              <div
                role="tabpanel"
                id="savings-tabpanel"
                aria-labelledby={`savings-tab-${tab}`}
                aria-busy={loading}
              >
                {tab === "overview" && monthly && (
                  <>
                    <div className="savings-metrics">
                      <article className="metric">
                        <h3>
                          {tr("Tài sản tiết kiệm ·")}{" "}
                          {formatDate(view.state.asOf!, locale)}
                        </h3>
                        <strong>{display(view.state.total)}</strong>
                        {view.state.total === null && (
                          <p>
                            {tr("Đã định giá")} {money(view.state.knownValue)}
                          </p>
                        )}
                      </article>
                      <article className="metric">
                        <h3>{tr("Biến động tháng")}</h3>
                        <strong>
                          {monthly.before.total === null ||
                          monthly.after.total === null
                            ? tr("Thiếu dữ liệu")
                            : money(
                                (
                                  BigInt(monthly.after.total) -
                                  BigInt(monthly.before.total)
                                ).toString(),
                              )}
                        </strong>
                      </article>
                      <article className="metric">
                        <h3>{tr("Vốn nạp ròng tháng")}</h3>
                        <strong>{money(monthly.activity.external)}</strong>
                        <p>{tr("Không gồm chuyển nội bộ / mở đầu")}</p>
                      </article>
                      <article className="metric">
                        <h3>{tr("Kết quả tháng")}</h3>
                        <strong>{display(monthly.result)}</strong>
                        <p>{tr("Đã loại vốn mở đầu và nạp/rút")}</p>
                      </article>
                    </div>
                    {view.due.length > 0 && (
                      <section className="panel savings-alert">
                        <h2>
                          {tr("Sổ đã đến hạn / sắp đến hạn trong 7 ngày")}
                        </h2>
                        {view.due.map((c) => (
                          <p key={c.id}>
                            {c.name} · {formatDate(c.maturity!, locale)} ·{" "}
                            {money(c.principal)}
                          </p>
                        ))}
                      </section>
                    )}
                    {view.state.positions.some((p) => p.stale) && (
                      <p className="expense-notice">
                        {tr("Cần cập nhật giá:")}{" "}
                        {view.state.positions
                          .filter((p) => p.stale)
                          .map((p) => p.name)
                          .join(", ")}
                        {tr(". Giá cũ đang được mang tiếp đến")}{" "}
                        {formatDate(view.state.asOf!, locale)}.
                      </p>
                    )}
                    <section className="panel">
                      <div className="expense-section-heading">
                        <h2>{tr("Các khoản đang tích lũy")}</h2>
                        <HelpButton
                          pageId="savings"
                          sectionId="valuation"
                          label={tr("Vốn và lãi/lỗ")}
                        />
                        <span className="expense-muted">
                          {tr("Mỗi tài sản được tính một lần")}
                        </span>
                      </div>
                      <div className="savings-positions">
                        {view.state.positions
                          .filter((p) => p.active || p.value !== "0")
                          .map((p) => (
                            <article className="savings-position" key={p.id}>
                              {position(p)}
                            </article>
                          ))}
                      </div>
                      {!categories.length && (
                        <div className="expense-empty">
                          <Garden variant="jar" />
                          <h3>{tr("Bắt đầu bằng một khoản nhỏ")}</h3>
                          <p>
                            {tr(
                              "Thêm danh mục, rồi ghi số dư mở đầu hoặc giao dịch đầu tiên.",
                            )}
                          </p>
                        </div>
                      )}
                    </section>
                    <SavingsReports
                      report={overviewReport ?? monthly}
                      compact
                    />
                    <p className="expense-muted">
                      {tr(
                        "Xem tab Báo cáo để đọc bảng số liệu và xuất dữ liệu.",
                      )}
                    </p>
                  </>
                )}
                {tab === "transactions" && (
                  <section className="panel">
                    <h2>
                      {tr("Giao dịch tháng")} {month}
                    </h2>
                    <div className="savings-filters">
                      <label>
                        {tr("Danh mục giao dịch")}
                        <select
                          aria-label={tr("Danh mục giao dịch")}
                          value={activityCategory}
                          onChange={(e) => setActivityCategory(e.target.value)}
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {(ruleAt(c, month) ?? c.rules[0]).name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Loại giao dịch lọc")}
                        <select
                          aria-label={tr("Loại giao dịch lọc")}
                          value={activityKind}
                          onChange={(e) => setActivityKind(e.target.value)}
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {Object.entries(localize(transactionNames)).map(
                            ([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                    <SavingsTransactionTable
                      transactions={monthlyTransactions}
                      categories={categories}
                      effects={view.state.effects}
                      label={`${tr("Giao dịch tháng")} ${month}`}
                      onEdit={setEditor}
                    />
                    <details>
                      <summary>
                        {tr("Lịch sử thay đổi (")}
                        {view.book?.audit.length ?? 0})
                      </summary>
                      {[...(view.book?.audit ?? [])].reverse().map((a) => (
                        <p key={a.version}>
                          #{a.version} · {a.at} · {a.action.type}
                          {"reason" in a.action ? ` · ${a.action.reason}` : ""}
                        </p>
                      ))}
                    </details>
                  </section>
                )}
                {tab === "categories" && (
                  <section className="panel">
                    <h2>{tr("Danh mục tiết kiệm")}</h2>
                    <p className="expense-muted">
                      {tr(
                        "Thay đổi theo tháng hiệu lực. Lưu trữ giữ nguyên lịch sử.",
                      )}
                    </p>
                    <SavingsCategoryTable
                      categories={categories}
                      month={month}
                      onEdit={setEditor}
                    />
                  </section>
                )}
                {tab === "reports" && (
                  <>
                    <section className="panel savings-filters">
                      <label>
                        {tr("Kỳ báo cáo")}
                        <select
                          aria-label={tr("Kỳ báo cáo")}
                          defaultValue="custom"
                          onChange={(e) => {
                            const y = month.slice(0, 4),
                              m = Number(month.slice(5));
                            if (e.target.value === "month")
                              setFilter((f) => ({
                                ...f,
                                from: `${month}-01`,
                                to: endOfMonth(month),
                              }));
                            if (e.target.value === "quarter") {
                              const q = String(
                                Math.floor((m - 1) / 3) * 3 + 1,
                              ).padStart(2, "0");
                              setFilter((f) => ({
                                ...f,
                                from: `${y}-${q}-01`,
                                to: endOfMonth(
                                  `${y}-${String(Number(q) + 2).padStart(2, "0")}`,
                                ),
                              }));
                            }
                            if (e.target.value === "year")
                              setFilter((f) => ({
                                ...f,
                                from: `${y}-01-01`,
                                to: `${y}-12-31`,
                              }));
                          }}
                        >
                          <option value="custom">
                            {tr("Khoảng tùy chọn")}
                          </option>
                          <option value="month">{tr("Tháng đang xem")}</option>
                          <option value="quarter">{tr("Quý đang xem")}</option>
                          <option value="year">{tr("Năm đang xem")}</option>
                        </select>
                      </label>
                      <label>
                        {tr("Từ ngày")}
                        <input
                          type="date"
                          value={filter.from}
                          max={today}
                          onChange={(e) =>
                            setFilter((f) => ({ ...f, from: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        {tr("Đến ngày")}
                        <input
                          type="date"
                          value={filter.to}
                          onChange={(e) =>
                            setFilter((f) => ({ ...f, to: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        {tr("Danh mục báo cáo")}
                        <select
                          aria-label={tr("Danh mục báo cáo")}
                          value={filter.categoryId ?? ""}
                          onChange={(e) =>
                            setFilter((f) => ({
                              ...f,
                              categoryId: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {
                                (ruleAt(c, filter.to.slice(0, 7)) ?? c.rules[0])
                                  .name
                              }
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Loại tài sản lọc")}
                        <select
                          aria-label={tr("Loại tài sản lọc")}
                          value={filter.kind ?? ""}
                          onChange={(e) =>
                            setFilter((f) => ({
                              ...f,
                              kind:
                                (e.target.value as ReportFilter["kind"]) ||
                                undefined,
                            }))
                          }
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {Object.entries(localize(kindNames)).map(([k, v]) => (
                            <option value={k} key={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Loại giao dịch báo cáo")}
                        <select
                          aria-label={tr("Loại giao dịch báo cáo")}
                          value={filter.transactionKind ?? ""}
                          onChange={(e) =>
                            setFilter((f) => ({
                              ...f,
                              transactionKind: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {Object.entries(localize(transactionNames)).map(
                            ([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <button
                        className="expense-secondary"
                        disabled={!report}
                        onClick={() => {
                          const p = new URLSearchParams(
                            Object.fromEntries(
                              Object.entries(filter).filter(([, v]) => v),
                            ) as Record<string, string>,
                          );
                          void download(
                            `/reports?${p}&format=csv&locale=${locale}`,
                            `savings-${filter.from}-${filter.to}.csv`,
                          );
                        }}
                      >
                        <Download size={16} aria-hidden="true" />
                        {tr("Xuất CSV")}
                      </button>
                    </section>
                    {report ? (
                      <>
                        <SavingsReports report={report} />
                        <section className="panel">
                          <h2>{tr("Giao dịch nguồn trong kỳ")}</h2>
                          <SavingsTransactionTable
                            transactions={reportTransactions}
                            categories={categories}
                            effects={report.effects}
                            label={tr("Giao dịch nguồn trong kỳ")}
                            report
                            onEdit={setEditor}
                          />
                        </section>
                      </>
                    ) : (
                      <p role="alert" className="expense-error">
                        {tr("Kiểm tra khoảng ngày báo cáo.")}
                      </p>
                    )}
                  </>
                )}
              </div>
              {selected && (
                <SavingsDetails
                  key={selected.id}
                  view={view}
                  position={selected}
                  onClose={() => setDetails(null)}
                  onEdit={setEditor}
                />
              )}
              {editor && (
                <SavingsEditor
                  mode={editor}
                  view={view}
                  month={month}
                  onClose={() => setEditor(null)}
                  onReload={load}
                  onSaved={async () => {
                    setEditor(null);
                    try {
                      await load();
                    } catch {
                      toast(
                        "warning",
                        tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."),
                      );
                    }
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
