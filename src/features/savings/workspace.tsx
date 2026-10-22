"use client";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { Trash2 as DeleteCommandGlyph } from "lucide-react";
import { Pencil as EditActionIcon } from "lucide-react";
import { LoadingStatus } from "@/components/loading";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Plus, RefreshCw } from "lucide-react";
import { Garden } from "@/components/garden";
import { focusPointerControl } from "@/components/pointer-focus";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useToast } from "@/components/toast";
import {
  activeTransactions,
  endOfMonth,
  ruleAt,
} from "@/domain/savings/engine";
import { monthSchema } from "@/domain/savings/schema";
import type { SavingsView, CategoryPosition } from "@/domain/savings/types";
import { buildReport, type ReportFilter } from "@/domain/savings/reports";
import { savingsJSON, SavingsAPIError, downloadSavings } from "./api";
import {
  SavingsEditor,
  kindNames,
  transactionNames,
  type EditorMode,
} from "./editor";
import { SavingsReports } from "./report-panel";
import { SavingsDetails } from "./details";
export function SavingsWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
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
        setError(e instanceof Error ? e.message : "Chưa tải được dữ liệu.");
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
    v === null ? "Thiếu định giá" : money(v);
  async function download(path: string, name: string) {
    try {
      await downloadSavings(path, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa xuất được dữ liệu.");
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
            {kindNames[p.kind]}
            {!p.active ? " · đã lưu trữ" : ""}
          </p>
        </div>
        <strong className="savings-value">{display(p.value)}</strong>
        <div className="savings-position-meta">
          {p.kind === "gold" ? (
            <>
              <span>
                {hidden ? "••••••" : p.quantity} {p.unit}
              </span>
              <span>Giá vốn {money(p.cost)}</span>
              <span>Lãi/lỗ {display(p.unrealized)}</span>
              <span>
                Giá {p.priceDate ?? "chưa có"}
                {p.stale ? " · cần cập nhật" : ""}
              </span>
            </>
          ) : (
            <span>
              {p.kind === "deposit" ? "Gốc đang gửi" : "Số dư theo giao dịch"}
            </span>
          )}
        </div>
        <button
          className="expense-secondary"
          onClick={() => setDetails(p.id)}
          aria-label={`Chi tiết ${p.name}`}
        >
          Chi tiết
        </button>
      </>
    );
  }
  function activityRows(
    from: string,
    to: string,
    categoryId = activityCategory,
    kind = activityKind,
  ) {
    return transactions
      .filter(
        (t) =>
          t.date >= from &&
          t.date <= to &&
          (!categoryId ||
            t.categoryId === categoryId ||
            ("cashCategoryId" in t && t.cashCategoryId === categoryId)) &&
          (!kind || t.kind === kind),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => {
        const c = categories.find((c) => c.id === t.categoryId),
          effect = view?.state.effects.find((e) => e.id === t.id);
        return (
          <article className="savings-activity" key={t.id}>
            <div>
              <h3>{transactionNames[t.kind]}</h3>
              <p>
                {c ? (ruleAt(c, t.date.slice(0, 7)) ?? c.rules[0]).name : ""} ·{" "}
                {t.date}
              </p>
              {t.note && <p>{t.note}</p>}
            </div>
            <div>
              <strong>{effect ? money(effect.net) : "—"}</strong>
              {effect?.kind === "sellGold" && (
                <p>Lãi/lỗ đã chốt: {money(effect.realized)}</p>
              )}
            </div>
            <div className="expense-actions">
              <button
                className="expense-secondary icon-action action-edit"
                onClick={() =>
                  setEditor({ type: "transaction", transaction: t })
                }
                aria-label={`Sửa giao dịch ${t.id}`}
                title="Sửa"
              >
                <EditActionIcon size={18} aria-hidden="true" />
              </button>
              <button
                className="expense-secondary"
                onClick={() => setEditor({ type: "void", transaction: t })}
                aria-label={`Hủy giao dịch ${t.id}`}
              >
                <DeleteCommandGlyph size={17} aria-hidden="true" />
                Hủy giao dịch
              </button>
            </div>
          </article>
        );
      });
  }
  return (
    <div className="savings-workspace" onMouseDownCapture={focusPointerControl}>
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">TÍCH LŨY CÓ LỊCH SỬ</p>
          <HelpPageTitle>
            Chăm chút <span>ngày mai.</span>
          </HelpPageTitle>
          <p className="lead">
            Tiền, sổ tiết kiệm và vàng — từng bước vun đắp theo tháng.
          </p>
        </div>
        <Garden variant="grove" />
      </div>
      {!configured ? (
        <section className="panel">
          <h2>Chưa kết nối dữ liệu Tiết kiệm</h2>
          <p>
            Cấu hình Supabase và PostgreSQL theo hướng dẫn dự án để sử dụng.
          </p>
        </section>
      ) : (
        <>
          {error && (
            <div role="alert" className="expense-error expense-feedback">
              <p>{error}</p>
              {status === 401 ? (
                <Link href="/login?next=/savings" className="expense-primary">
                  Đăng nhập
                </Link>
              ) : (
                <button
                  className="expense-secondary"
                  onClick={() => void load().catch(() => {})}
                >
                  Thử lại
                </button>
              )}
            </div>
          )}
          {loading && (
            <LoadingStatus>
              {view ? "Đang cập nhật sổ tiết kiệm…" : "Đang mở sổ tiết kiệm…"}
            </LoadingStatus>
          )}
          {view && (
            <>
              <div className="savings-toolbar">
                <label>
                  Tháng đang xem
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
                    ? "Đã chốt"
                    : month === today.slice(0, 7)
                      ? "Tạm tính"
                      : "Chưa chốt"}
                </span>
                <div className="expense-actions">
                  <button
                    className="expense-secondary"
                    onClick={() => void load().catch(() => {})}
                    disabled={loading}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    Tải lại
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
                      ? "Mở lại tháng"
                      : "Chốt tháng"}
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
                  Ghi giao dịch
                </button>
                <button
                  className="expense-secondary"
                  onClick={() => setEditor({ type: "create" })}
                >
                  Thêm danh mục
                </button>
                <button
                  className="expense-secondary"
                  onClick={() => setEditor({ type: "price" })}
                  disabled={!categories.some((c) => c.kind === "gold")}
                >
                  Cập nhật giá vàng
                </button>
              </div>
              <div
                className="savings-tabs"
                role="tablist"
                aria-label="Tiết kiệm"
              >
                {Object.entries({
                  overview: "Tổng quan",
                  transactions: "Giao dịch",
                  reports: "Báo cáo",
                  categories: "Danh mục",
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
                          ?.focus();
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                        <h3>Tài sản tiết kiệm · {view.state.asOf}</h3>
                        <strong>{display(view.state.total)}</strong>
                        {view.state.total === null && (
                          <p>Đã định giá {money(view.state.knownValue)}</p>
                        )}
                      </article>
                      <article className="metric">
                        <h3>Biến động tháng</h3>
                        <strong>
                          {monthly.before.total === null ||
                          monthly.after.total === null
                            ? "Thiếu dữ liệu"
                            : money(
                                (
                                  BigInt(monthly.after.total) -
                                  BigInt(monthly.before.total)
                                ).toString(),
                              )}
                        </strong>
                      </article>
                      <article className="metric">
                        <h3>Vốn nạp ròng tháng</h3>
                        <strong>{money(monthly.activity.external)}</strong>
                        <p>Không gồm chuyển nội bộ / mở đầu</p>
                      </article>
                      <article className="metric">
                        <h3>Kết quả tháng</h3>
                        <strong>{display(monthly.result)}</strong>
                        <p>Đã loại vốn mở đầu và nạp/rút</p>
                      </article>
                    </div>
                    {view.due.length > 0 && (
                      <section className="panel savings-alert">
                        <h2>Sổ đã đến hạn / sắp đến hạn trong 7 ngày</h2>
                        {view.due.map((c) => (
                          <p key={c.id}>
                            {c.name} · {c.maturity} · {money(c.principal)}
                          </p>
                        ))}
                      </section>
                    )}
                    {view.state.positions.some((p) => p.stale) && (
                      <p className="expense-notice">
                        Cần cập nhật giá:{" "}
                        {view.state.positions
                          .filter((p) => p.stale)
                          .map((p) => p.name)
                          .join(", ")}
                        . Giá cũ đang được mang tiếp đến {view.state.asOf}.
                      </p>
                    )}
                    <section className="panel">
                      <div className="expense-section-heading">
                        <h2>Các khoản đang tích lũy</h2>
                        <HelpButton
                          pageId="savings"
                          sectionId="valuation"
                          label="Vốn và lãi/lỗ"
                        />
                        <span className="expense-muted">
                          Mỗi tài sản được tính một lần
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
                          <h3>Bắt đầu bằng một khoản nhỏ</h3>
                          <p>
                            Thêm danh mục, rồi ghi số dư mở đầu hoặc giao dịch
                            đầu tiên.
                          </p>
                        </div>
                      )}
                    </section>
                    <SavingsReports
                      report={overviewReport ?? monthly}
                      compact
                    />
                    <p className="expense-muted">
                      Xem tab Báo cáo để đọc bảng số liệu và xuất dữ liệu.
                    </p>
                  </>
                )}
                {tab === "transactions" && (
                  <section className="panel">
                    <h2>Giao dịch tháng {month}</h2>
                    <div className="savings-filters">
                      <label>
                        Danh mục giao dịch
                        <select
                          aria-label="Danh mục giao dịch"
                          value={activityCategory}
                          onChange={(e) => setActivityCategory(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {(ruleAt(c, month) ?? c.rules[0]).name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Loại giao dịch lọc
                        <select
                          aria-label="Loại giao dịch lọc"
                          value={activityKind}
                          onChange={(e) => setActivityKind(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          {Object.entries(transactionNames).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {activityRows(`${month}-01`, endOfMonth(month)).length ? (
                      activityRows(`${month}-01`, endOfMonth(month))
                    ) : (
                      <p className="expense-empty">
                        Chưa có giao dịch trong bộ lọc này.
                      </p>
                    )}
                    <details>
                      <summary>
                        Lịch sử thay đổi ({view.book?.audit.length ?? 0})
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
                    <h2>Danh mục tiết kiệm</h2>
                    <p className="expense-muted">
                      Thay đổi theo tháng hiệu lực. Lưu trữ giữ nguyên lịch sử.
                    </p>
                    {categories.map((c) => {
                      const r = ruleAt(c, month) ?? c.rules[0];
                      return (
                        <article key={c.id} className="savings-activity">
                          <div>
                            <h3>
                              {r.emoji} {r.name}
                            </h3>
                            <p>
                              {kindNames[c.kind]}
                              {c.unit ? ` · ${c.unit}` : ""} · từ {c.start} ·{" "}
                              {r.active ? "Đang hoạt động" : "Đã lưu trữ"}
                            </p>
                            <p>{r.description}</p>
                          </div>
                          <div className="expense-actions">
                            <button
                              className="expense-secondary icon-action action-edit"
                              aria-label={`Sửa danh mục ${r.name}`}
                              onClick={() =>
                                setEditor({ type: "configure", category: c })
                              }
                              title="Sửa"
                            >
                              <EditActionIcon size={18} aria-hidden="true" />
                            </button>
                            <button
                              className="expense-secondary"
                              aria-label={`${r.active ? "Lưu trữ" : "Khôi phục"} ${r.name}`}
                              onClick={() =>
                                setEditor({
                                  type: r.active ? "archive" : "restore",
                                  category: c,
                                })
                              }
                            >
                              {r.active ? "Lưu trữ / xóa" : "Khôi phục"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </section>
                )}
                {tab === "reports" && (
                  <>
                    <section className="panel savings-filters">
                      <label>
                        Kỳ báo cáo
                        <select
                          aria-label="Kỳ báo cáo"
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
                          <option value="custom">Khoảng tùy chọn</option>
                          <option value="month">Tháng đang xem</option>
                          <option value="quarter">Quý đang xem</option>
                          <option value="year">Năm đang xem</option>
                        </select>
                      </label>
                      <label>
                        Từ ngày
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
                        Đến ngày
                        <input
                          type="date"
                          value={filter.to}
                          onChange={(e) =>
                            setFilter((f) => ({ ...f, to: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Danh mục báo cáo
                        <select
                          aria-label="Danh mục báo cáo"
                          value={filter.categoryId ?? ""}
                          onChange={(e) =>
                            setFilter((f) => ({
                              ...f,
                              categoryId: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">Tất cả</option>
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
                        Loại tài sản lọc
                        <select
                          aria-label="Loại tài sản lọc"
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
                          <option value="">Tất cả</option>
                          {Object.entries(kindNames).map(([k, v]) => (
                            <option value={k} key={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Loại giao dịch báo cáo
                        <select
                          aria-label="Loại giao dịch báo cáo"
                          value={filter.transactionKind ?? ""}
                          onChange={(e) =>
                            setFilter((f) => ({
                              ...f,
                              transactionKind: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">Tất cả</option>
                          {Object.entries(transactionNames).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
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
                            `/reports?${p}&format=csv`,
                            `savings-${filter.from}-${filter.to}.csv`,
                          );
                        }}
                      >
                        <Download size={16} aria-hidden="true" />
                        Xuất CSV
                      </button>
                    </section>
                    {report ? (
                      <>
                        <SavingsReports report={report} />
                        <section className="panel">
                          <h2>Giao dịch nguồn trong kỳ</h2>
                          {report.effects.length === 0 ? (
                            <p>Chưa có giao dịch.</p>
                          ) : (
                            report.effects.map((e) => {
                              const t = transactions.find(
                                (t) => t.id === e.id,
                              )!;
                              return (
                                <article
                                  className="savings-activity"
                                  key={e.id}
                                >
                                  <div>
                                    <h3>{transactionNames[t.kind]}</h3>
                                    <p>
                                      {e.date} ·{" "}
                                      {(() => {
                                        const c = categories.find(
                                          (c) => c.id === e.categoryId,
                                        );
                                        return c
                                          ? (
                                              ruleAt(c, e.date.slice(0, 7)) ??
                                              c.rules[0]
                                            ).name
                                          : "";
                                      })()}
                                    </p>
                                    <p>{e.note}</p>
                                  </div>
                                  <strong>{money(e.net)}</strong>
                                  <button
                                    className="expense-secondary"
                                    onClick={() =>
                                      setEditor({
                                        type: "transaction",
                                        transaction: t,
                                      })
                                    }
                                  >
                                    Xem / sửa
                                  </button>
                                </article>
                              );
                            })
                          )}
                        </section>
                      </>
                    ) : (
                      <p role="alert" className="expense-error">
                        Kiểm tra khoảng ngày báo cáo.
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
                        "Đã lưu thay đổi nhưng chưa tải lại được dữ liệu.",
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
