"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";

import { DailyNote } from "@/components/daily-note";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";
import { useMoney } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { hasRecordedIncome, ruleAt } from "@/domain/income/engine";
import { buildReport, type ReportFilter } from "@/domain/income/reports";
import type { IncomeRow, IncomeView } from "@/domain/income/types";
import { monthName } from "@/features/expenses/format";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Trash2 as DeleteActionIcon,
  Trash2 as DeleteCommandGlyph,
  Download,
  Pencil as EditActionIcon,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IncomeAPIError, incomeJSON } from "./api";
import { IncomeDetails } from "./details";
import { IncomeEditor, type EditorMode } from "./editor";
import { MissingIncome } from "./missing-income";
import { IncomeReports, useDisplayMoney } from "./report-panel";

export function IncomeWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const { t: tr, locale } = useI18n("income");

  const toast = useToast();
  const money = useMoney();
  const displayMoney = useDisplayMoney();
  const [year, setYear] = useState(Number(initialToday.slice(0, 4)));
  const [month, setMonth] = useState(Number(initialToday.slice(5, 7)));
  const [view, setView] = useState<IncomeView | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tab, setTab] = useState("month");
  const [kind, setKind] = useState<ReportFilter["kind"]>("all");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [details, setDetails] = useState<{ month?: string } | null>(null);
  const requestId = useRef(0);
  const reload = useForegroundRefresh(
    useCallback(async () => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const next = await incomeJSON<IncomeView>(`?year=${year}`);
        if (id === requestId.current) {
          setView(next);
          setNeedsLogin(false);
          setError("");
        }
        return next;
      } catch (e) {
        if (id === requestId.current) {
          setError(
            e instanceof Error
              ? e.message
              : tr("Không thể tải dữ liệu. Hãy thử lại."),
          );
          if (e instanceof IncomeAPIError && e.status === 401) {
            setNeedsLogin(true);
            setView(null);
          }
        }
        throw e;
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, [year]),
    configured,
  );
  useEffect(() => {
    if (!configured) return;
    setLoading(true);
    setView(null);
    void reload().catch(() => {});
    return () => {
      requestId.current++;
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!view) return;
    const midnight =
      new Date(`${view.today}T00:00:00+07:00`).getTime() + 86400000;
    const timer = window.setTimeout(
      () => void reload().catch(() => {}),
      Math.min(86400000, Math.max(1000, midnight - Date.now() + 1000)),
    );
    return () => window.clearTimeout(timer);
  }, [view, reload]);
  const today = view?.today ?? initialToday;
  const selectedMonth = `${year}-${String(month).padStart(2, "0")}`;
  const future = selectedMonth > today.slice(0, 7);
  const filter: ReportFilter = {
    year,
    from,
    to,
    kind,
    categoryId: categoryId || undefined,
  };
  const report = view?.year === year ? buildReport(view, filter) : null;
  const rows = view?.rows.filter((r) => r.month === selectedMonth) ?? [];
  const fixedRows = rows.filter((r) => r.kind === "fixed");
  const oneOffRows = rows.filter((r) => r.kind === "oneoff");
  const total = rows.some((r) => r.amount !== null)
    ? rows.reduce((n, r) => n + BigInt(r.amount ?? 0), 0n).toString()
    : null;
  const missing = future
    ? 0
    : fixedRows.filter((r) => r.amount === null).length;
  const categories = view?.book?.categories.filter((c) => !c.deleted) ?? [];
  function open(mode: EditorMode) {
    setEditor(mode);
    setEditorKey((k) => k + 1);
    setNotice("");
  }
  async function saved() {
    setEditor(null);
    setNotice("");
    try {
      await reload();
    } catch {
      setNotice(
        tr("Đã lưu trên server. Chưa tải lại được dữ liệu; hãy thử tải lại."),
      );
      toast("warning", tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."));
    }
  }
  function navigateMonth(delta: number) {
    const index = year * 12 + month - 1 + delta;
    const nextYear = Math.floor(index / 12);
    if (nextYear < 2000 || nextYear > 2099) return;
    setYear(nextYear);
    setMonth((index % 12) + 1);
  }
  async function download() {
    try {
      const params = new URLSearchParams({
        year: String(year),
        from: String(from),
        to: String(to),
        kind,
        format: "csv",
        locale,
        ...(categoryId ? { categoryId } : {}),
      });
      const response = await fetch(`/api/v1/income/reports?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `income-${year}-${from}-${to}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Không thể xuất CSV. Hãy thử lại."),
      );
    }
  }
  function oneOffList(list: IncomeRow[]) {
    return list.length ? (
      <div className="income-list">
        {list.map((r) => (
          <article className="income-item is-oneoff" key={r.key}>
            <div>
              <h3>
                <Sparkles size={17} aria-hidden="true" /> {r.name}
              </h3>
              <span className="status-badge">{tr("Thu phát sinh")}</span>
              <p className="expense-muted">{monthName(r.month, locale)}</p>
              {r.description && (
                <p className="expense-muted">{r.description}</p>
              )}
            </div>
            <div className="income-receipt">
              <p className="income-amount">{money(r.amount!)}</p>
            </div>
            <div className="expense-actions">
              <button
                className="expense-secondary icon-action action-edit"
                onClick={() => open({ type: "oneoff", row: r })}
                aria-label={tr("Sửa {0}", { 0: r.name })}
                title={tr("Sửa")}
              >
                <EditActionIcon size={18} aria-hidden="true" />
              </button>
              <button
                className="expense-secondary icon-action action-delete"
                onClick={() => open({ type: "deleteOneOff", row: r })}
                aria-label={tr("Xóa {0}", { 0: r.name })}
                title={tr("Xóa")}
              >
                <DeleteActionIcon size={18} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p className="expense-empty">
        {tr("Chưa có khoản thu phát sinh trong kỳ này.")}
      </p>
    );
  }
  return (
    <div
      className="income-workspace expenses-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">{tr("THỰC NHẬN THEO THÁNG")}</p>
          <HelpPageTitle>{tr("Thu nhập")}</HelpPageTitle>
          <p className="lead">
            {tr(
              "Ghi nguồn thu đều đặn và khoản phát sinh, theo dõi từng tháng trong năm.",
            )}
          </p>
        </div>
        <Garden variant="harvest" />
      </div>
      <DailyNote />
      {!configured ? (
        <section className="panel">
          <h2>{tr("Chưa kết nối cloud")}</h2>
          <p>
            {tr(
              "Thiết lập đăng nhập và cơ sở dữ liệu để lưu thu nhập riêng, đồng bộ giữa các thiết bị.",
            )}
          </p>
          <a
            className="text-link"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            {tr("Mở Supabase")}
          </a>
        </section>
      ) : (
        <>
          {error && (
            <div className="expense-error expense-feedback" role="alert">
              <p>{tr(error)}</p>
              <button
                className="expense-secondary"
                disabled={loading}
                aria-busy={loading}
                onClick={() => void reload().catch(() => {})}
              >
                {loading && <LoadingSpinner />} {tr("Thử tải lại")}
              </button>
            </div>
          )}
          {needsLogin && (
            <section className="panel">
              <h2>{tr("Đăng nhập để quản lý thu nhập")}</h2>
              <Link className="expense-primary" href="/login?next=/income">
                {tr("Đăng nhập")}
              </Link>
            </section>
          )}
          {loading && !view && (
            <LoadingStatus>{tr("Đang tải thu nhập…")}</LoadingStatus>
          )}
          <p className="expense-status" role="status">
            {tr(notice)}
          </p>
          {view && (
            <>
              <div className="expense-toolbar">
                <div className="expense-actions income-period-controls">
                  <button
                    className="expense-icon-button"
                    aria-label={tr("Tháng trước")}
                    disabled={year === 2000 && month === 1}
                    onClick={() => navigateMonth(-1)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <label className="income-select">
                    {tr("Năm")}
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 100 }, (_, i) => 2000 + i).map(
                        (y) => (
                          <option key={y}>{y}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="income-select">
                    {tr("Tháng")}
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {tr("Tháng")} {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="expense-icon-button"
                    aria-label={tr("Tháng sau")}
                    disabled={year === 2099 && month === 12}
                    onClick={() => navigateMonth(1)}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                <button
                  className="expense-primary"
                  onClick={() => open({ type: "oneoff" })}
                  disabled={future}
                >
                  <Plus size={17} aria-hidden="true" />
                  {tr("Thêm thu phát sinh")}
                </button>
              </div>
              <ScrollTabs
                as="nav"
                className="expense-segment"
                aria-label={tr("Khu vực thu nhập")}
              >
                {[
                  ["month", tr("Nhập thu nhập")],
                  ["reports", tr("Báo cáo")],
                  ["categories", tr("Danh mục cố định")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </ScrollTabs>
              {tab === "month" && (
                <>
                  <section
                    className="income-summary"
                    aria-label={tr("Tóm tắt thu nhập tháng")}
                  >
                    <article>
                      <h2>
                        {tr("Tổng đã ghi nhận ·")}{" "}
                        {monthName(selectedMonth, locale)}
                      </h2>
                      <strong>{displayMoney(total)}</strong>
                      <p>
                        {future
                          ? tr(
                              "Tháng tương lai: chỉ xem danh mục, chưa ghi thực nhận.",
                            )
                          : missing
                            ? tr("{0} danh mục chưa nhập trong {1}.", {
                                0: missing,
                                1: monthName(selectedMonth, locale),
                              })
                            : tr("Đã ghi nhận đủ các danh mục đến hạn.")}
                      </p>
                    </article>
                    <article>
                      <h3>{tr("Cố định / Phát sinh")}</h3>
                      <p>
                        {displayMoney(
                          fixedRows.some((r) => r.amount !== null)
                            ? fixedRows
                                .reduce((n, r) => n + BigInt(r.amount ?? 0), 0n)
                                .toString()
                            : null,
                        )}{" "}
                        /{" "}
                        {displayMoney(
                          oneOffRows.length
                            ? oneOffRows
                                .reduce((n, r) => n + BigInt(r.amount!), 0n)
                                .toString()
                            : null,
                        )}
                      </p>
                      <p className="expense-muted">
                        {tr(
                          "Số thu không tự tăng số dư tài khoản hoặc cấp tiền vào hũ.",
                        )}
                      </p>
                    </article>
                  </section>
                  {!future && (
                    <MissingIncome
                      rows={fixedRows}
                      today={today}
                      onEnter={(row) => open({ type: "monthly", row })}
                    />
                  )}
                  <p className="expense-muted">
                    {tr(
                      "Chưa nhập nghĩa là chưa ghi nhận thu nhập. Nhập 0 ₫ để xác nhận tháng này không có thu nhập từ danh mục này.",
                    )}
                  </p>
                  <div className="expense-section-heading">
                    <h2>
                      {tr("Danh mục cố định ·")}{" "}
                      {monthName(selectedMonth, locale)}
                    </h2>
                    <HelpButton
                      pageId="income"
                      sectionId="fixed"
                      label={tr("Danh mục cố định là gì?")}
                    />
                    <button
                      className="expense-secondary"
                      onClick={() => open({ type: "create" })}
                    >
                      {tr("Thêm danh mục")}
                    </button>
                  </div>
                  {!fixedRows.length && (
                    <p className="expense-empty">
                      {tr(
                        "Chưa có danh mục hoạt động trong tháng này. Thêm danh mục để nhập thu nhập định kỳ.",
                      )}
                    </p>
                  )}
                  <div className="income-list">
                    {fixedRows.map((r) => (
                      <article
                        key={r.key}
                        className={`income-item${!r.active ? " is-inactive" : r.amount === null && !future ? " is-missing" : ""}`}
                      >
                        <div>
                          <h3>{r.name}</h3>
                          {r.description && (
                            <p className="expense-muted">{r.description}</p>
                          )}
                        </div>
                        <div className="income-receipt">
                          <p className="income-amount">
                            {r.amount === null ? (
                              <span className="status-badge status-missing">
                                <CircleAlert size={15} aria-hidden="true" />
                                {future
                                  ? tr("Chưa đến kỳ nhập")
                                  : tr("Chưa nhập")}
                              </span>
                            ) : (
                              money(r.amount)
                            )}
                            {!r.active && tr(" · đã ngừng")}
                          </p>
                          {r.note && r.note !== r.description && (
                            <p className="expense-muted">{r.note}</p>
                          )}
                        </div>
                        <div className="expense-actions">
                          <button
                            className="expense-secondary"
                            disabled={future}
                            aria-label={tr("Nhập {0}", { 0: r.name })}
                            onClick={() => open({ type: "monthly", row: r })}
                          >
                            {r.amount === null ? (
                              <Plus size={17} aria-hidden="true" />
                            ) : (
                              <Pencil size={17} aria-hidden="true" />
                            )}
                            {r.amount === null
                              ? tr("Nhập tiền")
                              : tr("Sửa số thu")}
                          </button>
                          {r.amount !== null && (
                            <button
                              className="expense-secondary"
                              aria-label={tr("Xóa số thu {0}", { 0: r.name })}
                              onClick={() => open({ type: "clear", row: r })}
                            >
                              <DeleteCommandGlyph
                                size={17}
                                aria-hidden="true"
                              />
                              {tr("Xóa số thu")}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="expense-section-heading">
                    <h2>
                      {tr("Thu phát sinh ·")} {monthName(selectedMonth, locale)}
                    </h2>
                    <HelpButton
                      pageId="income"
                      sectionId="oneoff"
                      label={tr("Thu phát sinh là gì?")}
                    />
                  </div>
                  {oneOffList(oneOffRows)}
                </>
              )}
              {tab === "categories" && (
                <>
                  <div className="expense-section-heading">
                    <h2>{tr("Danh mục cố định")}</h2>
                    <button
                      className="expense-primary"
                      onClick={() => open({ type: "create" })}
                    >
                      {tr("Thêm danh mục")}
                    </button>
                  </div>
                  <p className="expense-muted income-configuration-note">
                    {tr("Cấu hình tại")} {monthName(selectedMonth, locale)}
                    {tr(
                      ". Danh mục tự tiếp tục qua năm mới; tiền mỗi tháng nhập riêng.",
                    )}
                  </p>
                  {!categories.length && (
                    <p className="expense-empty">
                      {tr("Chưa có danh mục cố định.")}
                    </p>
                  )}
                  <div className="income-list">
                    {categories.map((c) => {
                      const rule = ruleAt(c, selectedMonth) ?? c.rules[0];
                      const hasMoney = hasRecordedIncome(view.book!, c.id);
                      return (
                        <article
                          className={`income-item${selectedMonth >= c.start && !rule.active ? " is-inactive" : ""}`}
                          key={c.id}
                        >
                          <div>
                            <h3>{rule.name}</h3>
                            <p className="expense-muted">
                              {tr("Từ")} {monthName(c.start, locale)} ·{" "}
                              <span
                                className={`status-badge ${!rule.active ? "status-inactive" : ""}`}
                              >
                                {selectedMonth < c.start
                                  ? tr("Chưa bắt đầu")
                                  : rule.active
                                    ? tr("Đang hoạt động")
                                    : tr("Đã ngừng")}
                              </span>
                            </p>
                            {rule.description && <p>{rule.description}</p>}
                          </div>
                          <div className="expense-actions">
                            <button
                              className="expense-secondary icon-action action-edit"
                              onClick={() =>
                                open({ type: "configure", category: c })
                              }
                              aria-label={tr("Sửa danh mục {0}", {
                                0: rule.name,
                              })}
                              title={tr("Sửa")}
                            >
                              <EditActionIcon size={18} aria-hidden="true" />
                            </button>
                            {(!hasMoney ||
                              (selectedMonth >= c.start && rule.active)) && (
                              <button
                                className={
                                  hasMoney
                                    ? "expense-secondary expense-warning"
                                    : "expense-secondary expense-danger"
                                }
                                onClick={() =>
                                  open({
                                    type: hasMoney ? "stop" : "deleteCategory",
                                    category: c,
                                  })
                                }
                                aria-label={tr("{0} danh mục {1}", {
                                  0: hasMoney ? tr("Ngừng") : tr("Xóa"),
                                  1: rule.name,
                                })}
                              >
                                {hasMoney && (
                                  <Archive size={17} aria-hidden="true" />
                                )}
                                {hasMoney ? tr("Ngừng từ tháng…") : tr("Xóa")}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
              {tab === "reports" && report && (
                <>
                  <div className="income-filters">
                    <label className="income-select">
                      {tr("Kỳ")}
                      <select
                        value={
                          from === 1 && to === 12
                            ? "year"
                            : to - from === 2 && from % 3 === 1
                              ? String(Math.ceil(from / 3))
                              : "custom"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "custom") return;
                          if (v === "year") {
                            setFrom(1);
                            setTo(12);
                          } else {
                            setFrom((Number(v) - 1) * 3 + 1);
                            setTo(Number(v) * 3);
                          }
                        }}
                      >
                        <option value="year">{tr("Cả năm")}</option>
                        {[1, 2, 3, 4].map((q) => (
                          <option key={q} value={q}>
                            {tr("Quý")} {q}
                          </option>
                        ))}
                        <option value="custom">
                          {tr("Khoảng tháng tùy chọn")}
                        </option>
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Từ tháng")}
                      <select
                        value={from}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setFrom(m);
                          if (m > to) setTo(m);
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Đến tháng")}
                      <select
                        value={to}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setTo(m);
                          if (m < from) setFrom(m);
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Loại thu")}
                      <select
                        value={kind}
                        onChange={(e) => {
                          setKind(e.target.value as ReportFilter["kind"]);
                          if (e.target.value === "oneoff") setCategoryId("");
                        }}
                      >
                        <option value="all">{tr("Tất cả")}</option>
                        <option value="fixed">{tr("Cố định")}</option>
                        <option value="oneoff">{tr("Phát sinh")}</option>
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Danh mục")}
                      <select
                        value={categoryId}
                        disabled={kind === "oneoff"}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">{tr("Tất cả danh mục")}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {(ruleAt(c, `${year}-12`) ?? c.rules[0]).name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="expense-secondary"
                      onClick={() => void download()}
                    >
                      <Download size={17} aria-hidden="true" />
                      {tr("Xuất CSV")}
                    </button>
                  </div>
                  <section className="income-summary">
                    <article>
                      <h2>{tr("Tổng đã ghi nhận trong kỳ")}</h2>
                      <strong>{displayMoney(report.total)}</strong>
                      {report.missing > 0 && (
                        <p className="status-badge status-missing">
                          <CircleAlert size={15} aria-hidden="true" />
                          {report.missing}{" "}
                          {tr("khoản thu cố định cần bổ sung.")}
                        </p>
                      )}
                    </article>
                    <article>
                      <h3>
                        {tr("Năm")} {year} {tr("· tháng")} {from}–{to}
                      </h3>
                      <p>
                        {report.categories.length} {tr("danh mục ·")}{" "}
                        {report.oneOffs.length} {tr("khoản phát sinh")}
                      </p>
                    </article>
                  </section>
                  <MissingIncome
                    rows={report.rows}
                    today={today}
                    onEnter={(row) => open({ type: "monthly", row })}
                  />
                  <IncomeReports
                    today={today}
                    onEnter={(row) => open({ type: "monthly", row })}
                    report={report}
                    onDetails={(m) => setDetails({ month: m })}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
      {editor && view && (
        <IncomeEditor
          key={editorKey}
          mode={editor}
          month={selectedMonth}
          today={today}
          version={view.book?.version ?? 0}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onReload={reload}
        />
      )}
      {details && report && (
        <IncomeDetails
          key={details.month ?? "period"}
          rows={report.oneOffs}
          month={details.month}
          onClose={() => setDetails(null)}
          onEdit={open}
        />
      )}
    </div>
  );
}
