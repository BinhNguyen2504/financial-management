"use client";
import { LoadingStatus } from "@/components/loading";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Settings2, ArrowUpRight, Pencil, Archive } from "lucide-react";
import type { ExpenseRow, ExpenseView } from "@/domain/expenses/types";
import { vietnamClock } from "@/domain/expenses/engine";
import { summarize } from "@/domain/expenses/reports";
import { ExpenseEditor, type EditorMode } from "./editor";
import { apiJSON } from "./api";
import { ExpenseReports } from "./report-panel";
import { ExpenseModal } from "./modal";
import { monthName, sum, ratio } from "./format";
import { useMoney } from "@/components/privacy";
import { Garden } from "@/components/garden";
import { DailyNote } from "@/components/daily-note";
import { focusPointerControl } from "@/components/pointer-focus";
import { jarEmoji } from "@/domain/expenses/emoji";

export function ExpenseWorkspace({ configured }: { configured: boolean }) {
  const money = useMoney();
  const [view, setView] = useState<ExpenseView | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [kind, setKind] = useState("");
  const [method, setMethod] = useState("");
  const [group, setGroup] = useState("");
  const [inactive, setInactive] = useState(false);
  const [tab, setTab] = useState("month");
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [detail, setDetail] = useState<ExpenseRow | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(configured);
  const [needsLogin, setNeedsLogin] = useState(false);
  const requestId = useRef(0);
  const calendarYear = useRef<number | null>(null);
  const selectedYearRef = useRef(year);
  selectedYearRef.current = year;
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const next = await apiJSON<ExpenseView>("");
      if (id === requestId.current) {
        if (
          calendarYear.current !== null &&
          calendarYear.current !== next.currentYear &&
          selectedYearRef.current === calendarYear.current
        ) {
          setYear(next.currentYear);
          setMonth(Number(next.today.slice(5, 7)));
          setTab("month");
        }
        calendarYear.current = next.currentYear;
        setView(next);
        setNeedsLogin(false);
        setError("");
        setYear((y) => y ?? next.currentYear);
        setMonth((m) => m ?? Number(next.today.slice(5, 7)));
      }
      return next;
    } catch (e) {
      if (id === requestId.current) {
        const auth =
          e instanceof Error && "code" in e && e.code === "UNAUTHENTICATED";
        if (auth) {
          setNeedsLogin(true);
          setView(null);
          setEditor(null);
          setDetail(null);
        }
        setError(
          e instanceof Error
            ? e.message
            : "Không thể tải dữ liệu. Vui lòng thử lại.",
        );
      }
      throw e;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!configured) return;
    void reload().catch(() => {});
    const foreground = () => {
      if (document.visibilityState === "visible") void reload().catch(() => {});
    };
    window.addEventListener("focus", foreground);
    window.addEventListener("online", foreground);
    document.addEventListener("visibilitychange", foreground);
    return () => {
      window.removeEventListener("focus", foreground);
      window.removeEventListener("online", foreground);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, [configured, reload]);
  useEffect(() => {
    if (!configured || !view) return;
    const nextMidnight =
      new Date(`${view.today}T00:00:00+07:00`).getTime() + 86400000;
    const timer = window.setTimeout(
      () => void reload().catch(() => {}),
      Math.min(86400000, Math.max(1000, nextMidnight - Date.now() + 1000)),
    );
    return () => window.clearTimeout(timer);
  }, [configured, view, reload]);
  function openEditor(next: EditorMode) {
    setEditor(next);
    setEditorKey((k) => k + 1);
  }
  async function saved() {
    setEditor(null);
    setDetail(null);
    setLabelsOpen(false);
    setNotice("Đã lưu thay đổi.");
    try {
      await reload();
    } catch {
      setNotice("Đã lưu thay đổi. Chưa tải lại được dữ liệu; hãy thử tải lại.");
    }
  }
  const currentYear =
    view?.currentYear ?? Number(vietnamClock().today.slice(0, 4));
  const selectedYear = year ?? currentYear;
  const selectedMonth = `${selectedYear}-${String(month ?? 1).padStart(2, "0")}`;
  const period = view?.book?.years.find((y) => y.year === selectedYear);
  const readonly = Boolean(period?.closedAt);
  const rows =
    view?.rows.filter(
      (r) =>
        r.month === selectedMonth &&
        (!kind || r.kind === kind) &&
        (!method || r.method === method) &&
        (!group || r.group === group) &&
        (inactive ||
          r.active ||
          BigInt(r.available) > 0n ||
          BigInt(r.spent) > 0n),
    ) ?? [];
  const yearRows =
    view?.rows.filter((r) => r.month.startsWith(String(selectedYear))) ?? [];
  const archivedTotals =
    selectedYear < currentYear ? summarize(yearRows, () => "year")[0] : null;
  const archivedMonths =
    selectedYear < currentYear ? summarize(yearRows, (r) => r.month) : [];
  const methods = [...new Set(yearRows.map((r) => r.method))].sort();
  const groups = [
    ...new Set(yearRows.map((r) => r.group).filter(Boolean)),
  ].sort();
  const total = (field: "target" | "required" | "spent" | "closing") =>
    sum(rows.map((r) => r[field]));
  const future = view ? selectedMonth > view.today.slice(0, 7) : false;
  const funding = sum(
    rows.map((r) => (BigInt(r.funding) + BigInt(r.extra)).toString()),
  );
  return (
    <div
      className="expenses-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">MỖI KHOẢN TIỀN, MỘT MỤC ĐÍCH</p>
          <h1>Chi tiêu</h1>
          <p className="lead">
            Chuẩn bị cho tháng này. Dành sẵn cho những đợt chi sắp tới.
          </p>
        </div>
        {view?.book && (
          <div className="expense-actions">
            <button
              className="expense-secondary"
              onClick={() => setLabelsOpen(true)}
            >
              <Settings2 size={17} /> Phân loại
            </button>
            {!readonly && (
              <button
                className="expense-primary"
                onClick={() => openEditor({ mode: "create" })}
              >
                <Plus size={18} /> Thêm hũ
              </button>
            )}
          </div>
        )}
      </div>
      <DailyNote />
      {!configured ? (
        <section className="panel expense-setup">
          <Garden variant="jar" />
          <h2>Sẵn sàng cho những khoản chi của bạn</h2>
          <p>
            Cần kết nối dịch vụ đăng nhập và lưu trữ cloud trước khi bắt đầu.
            Khi kết nối xong, bạn chọn tháng bắt đầu và thêm các hũ của mình.
          </p>
          <p className="expense-muted">
            Dữ liệu chi tiêu không được lưu tạm trong trình duyệt.
          </p>
          <Link className="expense-secondary" href="/login">
            Đến trang đăng nhập
          </Link>
        </section>
      ) : (
        <>
          {loading ? (
            <LoadingStatus>Đang tải dữ liệu chi tiêu…</LoadingStatus>
          ) : (
            <p role="status" className="expense-status">
              {notice}
            </p>
          )}
          {error && (
            <div className="expense-notice expense-feedback" role="alert">
              <p>{error}</p>
              {needsLogin ? (
                <Link className="expense-primary" href="/login">
                  Đăng nhập
                </Link>
              ) : (
                <button
                  className="expense-secondary"
                  onClick={() => void reload().catch(() => {})}
                >
                  Thử tải lại
                </button>
              )}
            </div>
          )}
          {view && !view.book && (
            <section className="panel expense-setup">
              <Garden variant="sprout" />
              <h2>Bắt đầu từ tháng bạn chọn</h2>
              <p>
                Thêm các khoản chi định kỳ và khoản cần tích lũy. Ứng dụng tự
                tính tiền cần bỏ hũ; bạn chỉ điều chỉnh những tháng có thay đổi.
              </p>
              <button
                className="expense-primary"
                onClick={() => openEditor({ mode: "initialize" })}
              >
                Chọn tháng bắt đầu
              </button>
            </section>
          )}
          {view?.book && (
            <>
              <div className="expense-toolbar">
                <div className="expense-filters">
                  <label>
                    Năm
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setYear(Number(e.target.value));
                        setMethod("");
                        setGroup("");
                        setTab("month");
                        const min = view.book!.start;
                        if (
                          Number(e.target.value) === Number(min.slice(0, 4)) &&
                          (month ?? 1) < Number(min.slice(5))
                        )
                          setMonth(Number(min.slice(5)));
                      }}
                    >
                      {[...view.book.years].reverse().map((y) => (
                        <option key={y.year} value={y.year}>
                          {y.year}
                          {y.closedAt
                            ? " · Đã chốt"
                            : y.year < currentYear
                              ? " · Chưa chốt"
                              : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tháng
                    <select
                      value={month ?? 1}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option
                          key={i}
                          value={i + 1}
                          disabled={
                            `${selectedYear}-${String(i + 1).padStart(2, "0")}` <
                            view.book!.start
                          }
                        >
                          Tháng {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  className="expense-segment"
                  role="group"
                  aria-label="Nội dung chi tiêu"
                >
                  <button
                    aria-pressed={tab === "month"}
                    onClick={() => setTab("month")}
                  >
                    Theo tháng
                  </button>
                  <button
                    aria-pressed={tab === "reports"}
                    disabled={selectedYear !== currentYear}
                    onClick={() => setTab("reports")}
                  >
                    Báo cáo năm
                  </button>
                </div>
              </div>
              {selectedYear < currentYear && (
                <div className="expense-notice expense-archive-note">
                  <Archive size={20} aria-hidden="true" />
                  <p>
                    {readonly
                      ? `Năm ${selectedYear} đã chốt. Bạn có thể xem lịch sử. Sao lưu toàn bộ dữ liệu trong Cài đặt.`
                      : `Năm ${selectedYear} chưa chốt. Hoàn tất dữ liệu trước khi lưu trữ; số dư năm mới sẽ được cập nhật theo.`}
                  </p>
                  {!readonly && (
                    <button
                      className="expense-primary"
                      onClick={() =>
                        openEditor({ mode: "closeYear", year: selectedYear })
                      }
                    >
                      Chốt năm {selectedYear}
                    </button>
                  )}
                </div>
              )}
              {selectedYear < currentYear && (
                <details className="panel expense-archive-summary">
                  <summary>
                    Tổng kết năm {selectedYear}
                    {readonly ? " · Đã lưu" : " · Chưa chốt"}
                  </summary>
                  <p className="expense-muted">
                    Tổng hợp toàn bộ hũ của năm, không áp dụng bộ lọc bên dưới.
                  </p>
                  {archivedTotals && (
                    <div className="expense-report-totals">
                      <span>
                        Đầu năm:{" "}
                        <strong>{money(archivedTotals.opening)}</strong>
                      </span>
                      <span>
                        Bỏ hũ: <strong>{money(archivedTotals.funding)}</strong>
                      </span>
                      <span>
                        Thực chi: <strong>{money(archivedTotals.spent)}</strong>
                      </span>
                      <span>
                        Cuối năm:{" "}
                        <strong>{money(archivedTotals.closing)}</strong>
                      </span>
                    </div>
                  )}
                  <div className="expense-table-scroll">
                    <table>
                      <caption className="sr-only">
                        Tổng kết từng tháng năm {selectedYear}, đơn vị VND
                      </caption>
                      <thead>
                        <tr>
                          <th>Tháng</th>
                          <th>Bỏ hũ</th>
                          <th>Thực chi</th>
                          <th>Còn lại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedMonths.map((item) => (
                          <tr key={item.key}>
                            <th>{monthName(item.key)}</th>
                            <td>{money(item.funding)}</td>
                            <td>{money(item.spent)}</td>
                            <td>{money(item.closing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <div className="expense-filters expense-filter-panel">
                <label>
                  Loại hũ
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="monthly">Chi trong tháng</option>
                    <option value="accumulation">Tích lũy</option>
                  </select>
                </label>
                <label>
                  Phương thức
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {methods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nhóm mục đích
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="expense-checkbox">
                  <input
                    type="checkbox"
                    checked={inactive}
                    onChange={(e) => setInactive(e.target.checked)}
                  />{" "}
                  Gồm hũ đã ngừng
                </label>
              </div>
              {tab === "reports" ? (
                <ExpenseReports view={view} filters={{ kind, method, group }} />
              ) : (
                <>
                  <section
                    className="expense-metrics"
                    aria-label={`Tổng hợp ${monthName(selectedMonth)}`}
                  >
                    {[
                      { name: "Mức tháng", value: total("target") },
                      { name: "Cần thêm mặc định", value: total("required") },
                      {
                        name: future ? "Dự kiến bỏ hũ" : "Đã ghi nhận bỏ hũ",
                        value: funding,
                      },
                      {
                        name: future
                          ? "Thực chi chưa phát sinh"
                          : selectedMonth === view.today.slice(0, 7)
                            ? "Thực chi · tạm tính"
                            : "Thực chi",
                        value: total("spent"),
                      },
                      {
                        name: future ? "Số dư dự kiến" : "Số còn lại",
                        value: total("closing"),
                      },
                    ].map((metric) => (
                      <article className="metric" key={metric.name}>
                        <h2>{metric.name}</h2>
                        <p>{money(metric.value)}</p>
                      </article>
                    ))}
                  </section>
                  <div className="expense-section-heading">
                    <h2>{monthName(selectedMonth)}</h2>
                    <span className="expense-muted">
                      {rows.length} hũ{future ? " · Kế hoạch" : ""}
                      {readonly ? " · Chỉ xem" : ""}
                    </span>
                  </div>
                  {selectedMonth === view.today.slice(0, 7) && (
                    <p className="expense-notice">
                      Hũ chi tháng mặc định số dư bằng 0, nên thực chi hiện tại
                      là tạm tính. Nhập số dư nếu còn tiền; ứng dụng sẽ tính lại
                      tiền cần thêm của tháng sau.
                    </p>
                  )}
                  {rows.length ? (
                    <>
                      <div className="expense-desktop-table expense-table-scroll">
                        <table>
                          <caption className="sr-only">
                            Các hũ trong {monthName(selectedMonth)}, đơn vị VND
                          </caption>
                          <thead>
                            <tr>
                              <th>Khoản chi</th>
                              <th>Mức tháng</th>
                              <th>Chuyển sang</th>
                              <th>Cần thêm</th>
                              <th>{future ? "Dự kiến bỏ" : "Đã bỏ hũ"}</th>
                              <th>Thực chi</th>
                              <th>Còn lại</th>
                              <th>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.jarId}>
                                <th>
                                  <button
                                    className="expense-name-button"
                                    onClick={() => setDetail(row)}
                                  >
                                    <span
                                      className="jar-emoji"
                                      aria-hidden="true"
                                    >
                                      {jarEmoji(row.name, row.kind, row.emoji)}
                                    </span>
                                    {row.name}
                                    <ArrowUpRight
                                      size={14}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <small>
                                    {row.kind === "monthly"
                                      ? "Chi trong tháng"
                                      : "Tích lũy"}{" "}
                                    · {row.method}
                                    {row.group ? ` · ${row.group}` : ""}
                                    {!row.active ? " · Đã ngừng" : ""}
                                  </small>
                                  <JarProgress row={row} />
                                </th>
                                <td>{money(row.target)}</td>
                                <td>{money(row.opening)}</td>
                                <td>{money(row.required)}</td>
                                <td>
                                  {money(
                                    (
                                      BigInt(row.funding) + BigInt(row.extra)
                                    ).toString(),
                                  )}
                                </td>
                                <td>
                                  {money(row.spent)}
                                  {BigInt(row.over) > 0n && (
                                    <small className="expense-over">
                                      Vượt {money(row.over)}
                                    </small>
                                  )}
                                </td>
                                <td>{money(row.closing)}</td>
                                <td>
                                  <div className="expense-row-actions">
                                    {!readonly && (
                                      <button
                                        className="expense-icon-button"
                                        aria-label={`Điều chỉnh ${row.name}`}
                                        onClick={() =>
                                          openEditor({ mode: "month", row })
                                        }
                                      >
                                        <Pencil size={17} />
                                      </button>
                                    )}
                                    {!readonly &&
                                      !future &&
                                      row.kind === "accumulation" && (
                                        <button
                                          className="expense-secondary"
                                          onClick={() =>
                                            openEditor({ mode: "spend", row })
                                          }
                                        >
                                          Dùng tiền
                                        </button>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="expense-mobile-cards">
                        {rows.map((row) => (
                          <article
                            key={row.jarId}
                            className="panel expense-jar-card"
                          >
                            <div>
                              <button
                                className="expense-name-button"
                                onClick={() => setDetail(row)}
                              >
                                <span className="jar-emoji" aria-hidden="true">
                                  {jarEmoji(row.name, row.kind, row.emoji)}
                                </span>
                                {row.name}
                                <ArrowUpRight size={16} />
                              </button>
                              <p className="expense-muted">
                                {row.kind === "monthly"
                                  ? "Chi trong tháng"
                                  : "Tích lũy"}{" "}
                                · {row.method}
                                {row.group ? ` · ${row.group}` : ""}
                                {!row.active ? " · Đã ngừng" : ""}
                              </p>
                            </div>
                            <div className="jar-balance">
                              <span>
                                {future ? "Số dư dự kiến" : "Còn trong hũ"}
                              </span>
                              <strong>{money(row.closing)}</strong>
                            </div>
                            <JarProgress row={row} />
                            <details className="jar-details">
                              <summary>Các khoản trong hũ</summary>
                              <dl>
                                {[
                                  ["Mức tháng", row.target],
                                  ["Chuyển sang", row.opening],
                                  ["Cần thêm", row.required],
                                  [
                                    future ? "Dự kiến bỏ" : "Đã bỏ hũ",
                                    (
                                      BigInt(row.funding) + BigInt(row.extra)
                                    ).toString(),
                                  ],
                                  ["Thực chi", row.spent],
                                  ["Còn lại", row.closing],
                                ].map(([label, value]) => (
                                  <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{money(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </details>
                            {BigInt(row.over) > 0n && (
                              <p className="expense-over">
                                Vượt mức {money(row.over)}
                              </p>
                            )}
                            {!readonly && (
                              <div className="expense-actions">
                                <button
                                  className="expense-secondary"
                                  onClick={() =>
                                    openEditor({ mode: "month", row })
                                  }
                                >
                                  Điều chỉnh
                                </button>
                                {row.kind === "accumulation" && !future && (
                                  <button
                                    className="expense-primary"
                                    onClick={() =>
                                      openEditor({ mode: "spend", row })
                                    }
                                  >
                                    Dùng tiền
                                  </button>
                                )}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <section className="panel expense-empty">
                      <Garden variant="sprout" />
                      <h3>Chưa có hũ trong tháng hoặc bộ lọc này</h3>
                      <p>
                        Thêm một hũ chi tiêu hoặc thay đổi bộ lọc để xem các
                        khoản đã tạo.
                      </p>
                      {!readonly && (
                        <button
                          className="expense-primary"
                          onClick={() => openEditor({ mode: "create" })}
                        >
                          <Plus size={17} /> Thêm hũ chi tiêu
                        </button>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {editor && view && (
        <ExpenseEditor
          key={editorKey}
          editor={editor}
          view={view}
          month={selectedMonth}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onReload={reload}
        />
      )}
      {detail && view?.book && (
        <ExpenseModal title={detail.name} onClose={() => setDetail(null)}>
          <p>{detail.description || "Chưa có mô tả."}</p>
          <p className="expense-muted">
            {detail.method}
            {detail.group ? ` · ${detail.group}` : ""} ·{" "}
            {detail.kind === "monthly" ? "Chi trong tháng" : "Tích lũy"}
          </p>
          {!readonly && (
            <div className="expense-actions">
              <button
                className="expense-secondary"
                onClick={() => openEditor({ mode: "emoji", row: detail })}
              >
                Đổi biểu tượng
              </button>
              <button
                className="expense-secondary"
                onClick={() => openEditor({ mode: "configure", row: detail })}
              >
                Sửa hũ / mức mặc định
              </button>
              <button
                className="expense-secondary"
                onClick={() => openEditor({ mode: "stop", row: detail })}
              >
                Ngừng cấp tiền
              </button>
            </div>
          )}
          <h3 className="expense-subheading">
            Các tháng trong năm {selectedYear}
          </h3>
          <div className="expense-table-scroll">
            <table>
              <caption className="sr-only">
                Lịch sử từng tháng của {detail.name}
              </caption>
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th>Mức tháng</th>
                  <th>Bỏ hũ</th>
                  <th>Thực chi</th>
                  <th>Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {yearRows
                  .filter((r) => r.jarId === detail.jarId)
                  .map((r) => (
                    <tr key={r.month}>
                      <th>
                        {Number(r.month.slice(5))}
                        {r.status === "planned"
                          ? " · kế hoạch"
                          : r.status === "provisional"
                            ? " · tạm tính"
                            : ""}
                      </th>
                      <td>{money(r.target)}</td>
                      <td>
                        {money(
                          (BigInt(r.funding) + BigInt(r.extra)).toString(),
                        )}
                      </td>
                      <td>{money(r.spent)}</td>
                      <td>{money(r.closing)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {detail.kind === "accumulation" && (
            <>
              <h3 className="expense-subheading">Các lần sử dụng</h3>
              {view.book.spends
                .filter(
                  (s) =>
                    s.jarId === detail.jarId &&
                    s.date.startsWith(String(selectedYear)),
                )
                .map((s) => (
                  <div key={s.id} className="expense-history-item">
                    <div>
                      <strong>
                        {money(s.amount)}
                        {s.deleted ? " · Đã xóa" : ""}
                      </strong>
                      <p>
                        {s.date} · {s.note || "Không có ghi chú"}
                      </p>
                    </div>
                    {!readonly && !s.deleted && (
                      <div className="expense-actions">
                        <button
                          className="expense-secondary"
                          onClick={() =>
                            openEditor({ mode: "spend", row: detail, spend: s })
                          }
                        >
                          Sửa
                        </button>
                        <button
                          className="expense-secondary"
                          onClick={() =>
                            openEditor({ mode: "deleteSpend", spend: s })
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              {!view.book.spends.some(
                (s) =>
                  s.jarId === detail.jarId &&
                  s.date.startsWith(String(selectedYear)),
              ) && <p className="expense-muted">Chưa có lần sử dụng.</p>}
            </>
          )}
          <h3 className="expense-subheading">Lịch sử thay đổi</h3>
          {view.book.audit
            .filter((a) => {
              const d = a.detail as Record<string, unknown>;
              return (
                d.jarId === detail.jarId ||
                d.id === detail.jarId ||
                view.book!.spends.some(
                  (s) => s.jarId === detail.jarId && s.id === d.id,
                )
              );
            })
            .slice(-20)
            .reverse()
            .map((a) => (
              <div className="expense-history-item" key={a.version}>
                <p>
                  {new Date(a.at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                  <br />
                  <strong>
                    {(
                      {
                        createJar: "Tạo hũ",
                        setJarEmoji: "Đổi biểu tượng",
                        configureJar: "Đổi cấu hình",
                        editMonth: "Điều chỉnh tháng",
                        stopJar: "Ngừng cấp tiền",
                        upsertSpend: "Ghi / sửa lần sử dụng",
                        deleteSpend: "Xóa lần sử dụng",
                      } as Record<string, string>
                    )[a.action] ?? a.action}
                  </strong>
                </p>
                <span>#{a.version}</span>
              </div>
            ))}
        </ExpenseModal>
      )}
      {labelsOpen && view?.book && (
        <ExpenseModal
          title="Phương thức và nhóm"
          onClose={() => setLabelsOpen(false)}
        >
          <p className="expense-muted">
            Gợi ý giúp nhập nhanh. Các hũ giữ thông tin phân loại theo tháng.
          </p>
          <div className="expense-actions">
            <button
              className="expense-primary"
              onClick={() => openEditor({ mode: "label" })}
            >
              <Plus size={16} /> Thêm phân loại
            </button>
          </div>
          {["method", "group"].map((type) => (
            <section key={type}>
              <h3 className="expense-subheading">
                {type === "method" ? "Phương thức" : "Nhóm mục đích"}
              </h3>
              {view
                .book!.labels.filter((l) => l.kind === type)
                .map((l) => (
                  <div key={l.id} className="expense-history-item">
                    <span>{l.name}</span>
                    <div className="expense-actions">
                      <button
                        className="expense-secondary"
                        onClick={() => openEditor({ mode: "label", label: l })}
                      >
                        Sửa
                      </button>
                      <button
                        className="expense-secondary"
                        onClick={() =>
                          openEditor({ mode: "deleteLabel", label: l })
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              {!view.book!.labels.some((l) => l.kind === type) && (
                <p className="expense-muted">
                  Chưa có gợi ý. Bạn cũng có thể nhập trực tiếp khi tạo hũ.
                </p>
              )}
            </section>
          ))}
        </ExpenseModal>
      )}
    </div>
  );
}

function JarProgress({ row }: { row: ExpenseRow }) {
  if (row.kind === "accumulation")
    return (
      <p className="jar-growth">
        <span aria-hidden="true">🌱</span>{" "}
        {row.status === "planned"
          ? "Dành sẵn cho tương lai"
          : "Từng chút vun đắp"}
      </p>
    );
  if (row.status === "planned")
    return <p className="jar-growth">Kế hoạch cho tháng tới</p>;
  if (BigInt(row.target) === 0n)
    return <p className="jar-growth">Chưa đặt mức tháng</p>;
  const used = ratio(row.spent, row.target);
  return (
    <div className={`jar-progress ${used > 100 ? "is-over" : ""}`}>
      <span>
        Đã dùng {used.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
        mức tháng
      </span>
      <div aria-hidden="true">
        <span style={{ width: `${Math.min(100, used)}%` }} />
      </div>
    </div>
  );
}
