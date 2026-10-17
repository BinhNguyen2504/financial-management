"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMoney } from "@/components/privacy";
import { DailyNote } from "@/components/daily-note";
import { Garden } from "@/components/garden";
import { focusPointerControl } from "@/components/pointer-focus";
import { Plus, ArrowLeft, ArrowRight, Download } from "lucide-react";
import type { IncomeRow, IncomeView } from "@/domain/income/types";
import { ruleAt, hasRecordedIncome } from "@/domain/income/engine";
import { buildReport, type ReportFilter } from "@/domain/income/reports";
import { monthName } from "@/features/expenses/format";
import { ExpenseModal } from "@/features/expenses/modal";
import { incomeJSON, IncomeAPIError } from "./api";
import { IncomeEditor, type EditorMode } from "./editor";
import { useDisplayMoney, IncomeReports } from "./report-panel";

export function IncomeWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
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
  const reload = useCallback(async () => {
    const id = ++requestId.current;
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
            : "Không thể tải dữ liệu. Hãy thử lại.",
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
  }, [year]);
  useEffect(() => {
    if (!configured) return;
    setLoading(true);
    setView(null);
    void reload().catch(() => {});
    const refresh = () => {
      if (document.visibilityState === "visible") void reload().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      requestId.current++;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
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
    setDetails(null);
    setNotice("Đã lưu thay đổi.");
    try {
      await reload();
    } catch {
      setNotice(
        "Đã lưu trên server. Chưa tải lại được dữ liệu; hãy thử tải lại.",
      );
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
        e instanceof Error ? e.message : "Không thể xuất CSV. Hãy thử lại.",
      );
    }
  }
  function oneOffList(list: IncomeRow[]) {
    return list.length ? (
      <div className="income-list">
        {list.map((r) => (
          <article className="income-item" key={r.key}>
            <div>
              <h3>{r.name}</h3>
              <p className="expense-muted">{monthName(r.month)}</p>
              {r.description && (
                <p className="expense-muted">{r.description}</p>
              )}
            </div>
            <div className="income-receipt">
              <p className="income-amount">{money(r.amount!)}</p>
            </div>
            <div className="expense-actions">
              <button
                className="expense-secondary"
                onClick={() => open({ type: "oneoff", row: r })}
                aria-label={`Sửa ${r.name}`}
              >
                Sửa
              </button>
              <button
                className="expense-secondary"
                onClick={() => open({ type: "deleteOneOff", row: r })}
                aria-label={`Xóa ${r.name}`}
              >
                Xóa
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p className="expense-empty">Chưa có khoản thu phát sinh trong kỳ này.</p>
    );
  }
  return (
    <div
      className="income-workspace expenses-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">THỰC NHẬN THEO THÁNG</p>
          <h1>Thu nhập</h1>
          <p className="lead">
            Ghi nguồn thu đều đặn và khoản phát sinh, theo dõi từng tháng trong
            năm.
          </p>
        </div>
        <Garden variant="harvest" />
      </div>
      <DailyNote />
      {!configured ? (
        <section className="panel">
          <h2>Chưa kết nối cloud</h2>
          <p>
            Thiết lập đăng nhập và cơ sở dữ liệu để lưu thu nhập riêng, đồng bộ
            giữa các thiết bị.
          </p>
          <a
            className="text-link"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Mở Supabase
          </a>
        </section>
      ) : (
        <>
          {error && (
            <div className="expense-error expense-feedback" role="alert">
              <p>{error}</p>
              <button
                className="expense-secondary"
                onClick={() => void reload().catch(() => {})}
              >
                Thử tải lại
              </button>
            </div>
          )}
          {needsLogin && (
            <section className="panel">
              <h2>Đăng nhập để quản lý thu nhập</h2>
              <Link className="expense-primary" href="/login?next=/income">
                Đăng nhập
              </Link>
            </section>
          )}
          {loading && <p role="status">Đang tải thu nhập…</p>}
          <p className="expense-status" role="status">
            {notice}
          </p>
          {view && (
            <>
              <div className="expense-toolbar">
                <div className="expense-actions income-period-controls">
                  <label className="income-select">
                    Năm
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
                    Tháng
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="expense-icon-button"
                    aria-label="Tháng trước"
                    disabled={year === 2000 && month === 1}
                    onClick={() => navigateMonth(-1)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    className="expense-icon-button"
                    aria-label="Tháng sau"
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
                  Thêm thu phát sinh
                </button>
              </div>
              <nav className="expense-segment" aria-label="Khu vực thu nhập">
                {[
                  ["month", "Nhập thu nhập"],
                  ["reports", "Báo cáo"],
                  ["categories", "Danh mục cố định"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab === "month" && (
                <>
                  <section
                    className="income-summary"
                    aria-label="Tóm tắt thu nhập tháng"
                  >
                    <article>
                      <h2>Tổng đã ghi nhận · {monthName(selectedMonth)}</h2>
                      <strong>{displayMoney(total)}</strong>
                      <p>
                        {future
                          ? "Tháng tương lai: chỉ xem danh mục, chưa ghi thực nhận."
                          : `${missing} danh mục còn chưa nhập. Số 0 là đã ghi nhận không có thu.`}
                      </p>
                    </article>
                    <article>
                      <h3>Cố định / Phát sinh</h3>
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
                        Số thu không tự tăng số dư tài khoản hoặc cấp tiền vào
                        hũ.
                      </p>
                    </article>
                  </section>
                  <div className="expense-section-heading">
                    <h2>Danh mục cố định · {monthName(selectedMonth)}</h2>
                    <button
                      className="expense-secondary"
                      onClick={() => open({ type: "create" })}
                    >
                      Thêm danh mục
                    </button>
                  </div>
                  {!fixedRows.length && (
                    <p className="expense-empty">
                      Chưa có danh mục hoạt động trong tháng này. Thêm danh mục
                      để nhập thu nhập định kỳ.
                    </p>
                  )}
                  <div className="income-list">
                    {fixedRows.map((r) => (
                      <article key={r.key} className="income-item">
                        <div>
                          <h3>{r.name}</h3>
                          {r.description && (
                            <p className="expense-muted">{r.description}</p>
                          )}
                        </div>
                        <div className="income-receipt">
                          <p className="income-amount">
                            {r.amount === null ? "Chưa nhập" : money(r.amount)}
                            {!r.active && " · đã ngừng"}
                          </p>
                          {r.note && r.note !== r.description && (
                            <p className="expense-muted">{r.note}</p>
                          )}
                        </div>
                        <div className="expense-actions">
                          <button
                            className="expense-secondary"
                            disabled={future}
                            aria-label={`Nhập ${r.name}`}
                            onClick={() => open({ type: "monthly", row: r })}
                          >
                            {r.amount === null ? "Nhập tiền" : "Sửa số thu"}
                          </button>
                          {r.amount !== null && (
                            <button
                              className="expense-secondary"
                              aria-label={`Xóa số thu ${r.name}`}
                              onClick={() => open({ type: "clear", row: r })}
                            >
                              Xóa số thu
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="expense-section-heading">
                    <h2>Thu phát sinh · {monthName(selectedMonth)}</h2>
                  </div>
                  {oneOffList(oneOffRows)}
                </>
              )}
              {tab === "categories" && (
                <>
                  <div className="expense-section-heading">
                    <h2>Danh mục cố định</h2>
                    <button
                      className="expense-primary"
                      onClick={() => open({ type: "create" })}
                    >
                      Thêm danh mục
                    </button>
                  </div>
                  <p className="expense-muted">
                    Cấu hình tại {monthName(selectedMonth)}. Danh mục tự tiếp
                    tục qua năm mới; tiền mỗi tháng nhập riêng.
                  </p>
                  {!categories.length && (
                    <p className="expense-empty">Chưa có danh mục cố định.</p>
                  )}
                  <div className="income-list">
                    {categories.map((c) => {
                      const rule = ruleAt(c, selectedMonth) ?? c.rules[0];
                      const hasMoney = hasRecordedIncome(view.book!, c.id);
                      return (
                        <article className="income-item" key={c.id}>
                          <div>
                            <h3>{rule.name}</h3>
                            <p className="expense-muted">
                              Từ {monthName(c.start)} ·{" "}
                              {selectedMonth < c.start
                                ? "Chưa bắt đầu"
                                : rule.active
                                  ? "Đang hoạt động"
                                  : "Đã ngừng"}
                            </p>
                            {rule.description && <p>{rule.description}</p>}
                          </div>
                          <div className="expense-actions">
                            <button
                              className="expense-secondary"
                              onClick={() =>
                                open({ type: "configure", category: c })
                              }
                              aria-label={`Sửa danh mục ${rule.name}`}
                            >
                              Sửa
                            </button>
                            <button
                              className="expense-secondary"
                              onClick={() =>
                                open({
                                  type: hasMoney ? "stop" : "deleteCategory",
                                  category: c,
                                })
                              }
                              aria-label={`${hasMoney ? "Ngừng" : "Xóa"} danh mục ${rule.name}`}
                            >
                              {hasMoney ? "Ngừng từ tháng…" : "Xóa"}
                            </button>
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
                      Kỳ
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
                        <option value="year">Cả năm</option>
                        {[1, 2, 3, 4].map((q) => (
                          <option key={q} value={q}>
                            Quý {q}
                          </option>
                        ))}
                        <option value="custom">Khoảng tháng tùy chọn</option>
                      </select>
                    </label>
                    <label className="income-select">
                      Từ tháng
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
                      Đến tháng
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
                      Loại thu
                      <select
                        value={kind}
                        onChange={(e) => {
                          setKind(e.target.value as ReportFilter["kind"]);
                          if (e.target.value === "oneoff") setCategoryId("");
                        }}
                      >
                        <option value="all">Tất cả</option>
                        <option value="fixed">Cố định</option>
                        <option value="oneoff">Phát sinh</option>
                      </select>
                    </label>
                    <label className="income-select">
                      Danh mục
                      <select
                        value={categoryId}
                        disabled={kind === "oneoff"}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">Tất cả danh mục</option>
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
                      Xuất CSV
                    </button>
                  </div>
                  <section className="income-summary">
                    <article>
                      <h2>Tổng đã ghi nhận trong kỳ</h2>
                      <strong>{displayMoney(report.total)}</strong>
                      <p>
                        {report.missing} danh mục–tháng đã đến còn chưa nhập.
                      </p>
                    </article>
                    <article>
                      <h3>
                        Năm {year} · tháng {from}–{to}
                      </h3>
                      <p>
                        {report.categories.length} danh mục ·{" "}
                        {report.oneOffs.length} khoản phát sinh
                      </p>
                    </article>
                  </section>
                  <IncomeReports
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
        <ExpenseModal
          title={
            details.month
              ? `Thu phát sinh · ${monthName(details.month)}`
              : "Thu phát sinh trong kỳ"
          }
          onClose={() => setDetails(null)}
        >
          {oneOffList(
            report.oneOffs.filter(
              (r) => !details.month || r.month === details.month,
            ),
          )}
        </ExpenseModal>
      )}
    </div>
  );
}
