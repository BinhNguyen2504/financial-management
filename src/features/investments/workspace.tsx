"use client";
import { LoadingStatus } from "@/components/loading";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Garden } from "@/components/garden";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { activeTransactions, ruleAt } from "@/domain/investments/engine";
import { buildReport, type ReportFilter } from "@/domain/investments/reports";
import type {
  InvestmentView,
  Position,
  InvestmentTransaction,
} from "@/domain/investments/types";
import { InvestmentEditor, type EditorMode, transactionNames } from "./editor";
import { InvestmentReports } from "./report-panel";
import { investmentsJSON, downloadInvestment, InvestmentAPIError } from "./api";
import { ExpenseModal } from "@/features/expenses/modal";
import { formatROI } from "./format";
const tabs = [
  ["portfolio", "Danh mục"],
  ["transactions", "Giao dịch"],
  ["reports", "Báo cáo"],
  ["manage", "Quản lý"],
] as const;
export function InvestmentWorkspace({
  configured,
  initialToday,
}: {
  configured: boolean;
  initialToday: string;
}) {
  const money = useMoney(),
    hidden = useMoneyHidden(),
    [date, setDate] = useState(initialToday),
    [view, setView] = useState<InvestmentView | null>(null),
    [tab, setTab] = useState("portfolio"),
    [error, setError] = useState(""),
    [status, setStatus] = useState(0),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<EditorMode | null>(null),
    [details, setDetails] = useState<string | null>(null),
    [transaction, setTransaction] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({
      from: `${initialToday.slice(0, 4)}-01-01`,
      to: initialToday,
    }),
    [activityCategory, setActivityCategory] = useState(""),
    [activityKind, setActivityKind] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(initialToday),
    [includeCancelled, setIncludeCancelled] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const n = ++request.current;
    setLoading(true);
    try {
      const v = await investmentsJSON<InvestmentView>(`?asOf=${date}`);
      if (n === request.current) {
        setView(v);
        setError("");
        setStatus(0);
      }
      return v;
    } catch (e) {
      if (n === request.current) {
        setError(e instanceof Error ? e.message : "Không thể tải dữ liệu.");
        setStatus(e instanceof InvestmentAPIError ? e.status : 0);
      }
      throw e;
    } finally {
      if (n === request.current) setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    if (configured) void load().catch(() => {});
    else setLoading(false);
  }, [configured, load]);
  const book = view?.book,
    categories = book?.categories ?? [],
    state = view?.state;
  const name = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (ruleAt(c, date)?.name ?? c.rules[0].name) : id;
  };
  const display = (v: string | null) =>
    v === null ? "Thiếu định giá" : money(v);
  const sum = (values: (string | null)[]) =>
    values.reduce<bigint>((n, x) => n + BigInt(x ?? "0"), 0n).toString();
  const investments =
      state?.positions.filter((p) => p.kind === "investment") ?? [],
    wallets = state?.positions.filter((p) => p.kind === "cash") ?? [];
  const realized = sum(investments.map((p) => p.realized)),
    unrealized = investments.some((p) => p.unrealized === null)
      ? null
      : sum(investments.map((p) => p.unrealized));
  const report = (() => {
    try {
      return view
        ? buildReport(view.book, filter, {
            today: view.today,
            now: `${view.today}T00:00:00Z`,
          })
        : null;
    } catch {
      return null;
    }
  })();
  const live = book ? activeTransactions(book) : [];
  const rows: { t: InvestmentTransaction; cancelled: boolean }[] = live.map(
    (r) => ({ t: r.transaction, cancelled: false }),
  );
  if (includeCancelled && book) {
    const ids = new Set(live.map((r) => r.transaction.id));
    for (const r of book.revisions.filter(
      (r) => r.id === r.rootId && r.transaction && !ids.has(r.rootId),
    ))
      rows.push({ t: r.transaction!, cancelled: true });
  }
  const visible = rows
    .filter(
      ({ t }) =>
        t.date <= date &&
        (!from || t.date >= from) &&
        (!to || t.date <= to) &&
        (!activityKind || t.kind === activityKind) &&
        (!activityCategory ||
          t.categoryId === activityCategory ||
          ("cashCategoryId" in t && t.cashCategoryId === activityCategory)),
    )
    .sort(
      (a, b) =>
        b.t.date.localeCompare(a.t.date) ||
        (book?.revisions.find((r) => r.id === b.t.id)?.sequence ?? 0) -
          (book?.revisions.find((r) => r.id === a.t.id)?.sequence ?? 0),
    );
  const selected = state?.positions.find((p) => p.id === details),
    selectedT = transaction
      ? book?.revisions
          .slice()
          .reverse()
          .find((r) => r.rootId === transaction && r.transaction)?.transaction
      : null;
  const currentT = transaction
    ? live.find((r) => r.transaction.id === transaction)?.transaction
    : null;
  async function download(path: string, filename: string) {
    try {
      await downloadInvestment(path, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xuất dữ liệu.");
    }
  }
  function saved() {
    setEditor(null);
    setNotice("Đã lưu thay đổi.");
    void load().catch(() => {});
  }
  function open(mode: EditorMode) {
    setDetails(null);
    setTransaction(null);
    setNotice("");
    setEditor(mode);
  }
  function positionActions(p: Position) {
    return (
      <div className="expense-actions">
        <button className="expense-secondary" onClick={() => setDetails(p.id)}>
          Chi tiết <span className="sr-only">{p.name}</span>
        </button>
        {p.active && (
          <button
            className="expense-secondary"
            onClick={() =>
              open({
                type: "transaction",
                kind: p.kind === "cash" ? "deposit" : "buy",
                categoryId: p.id,
              })
            }
          >
            {p.kind === "cash" ? "Nạp" : "Mua"}
            <span className="sr-only"> {p.name}</span>
          </button>
        )}
        {p.active && p.kind === "investment" && (
          <button
            className="expense-secondary"
            onClick={() =>
              open({ type: "transaction", kind: "valuation", categoryId: p.id })
            }
          >
            Định giá<span className="sr-only"> {p.name}</span>
          </button>
        )}
      </div>
    );
  }
  function positionCard(p: Position) {
    return (
      <article className="panel investment-card" key={p.id}>
        <h3>
          <span aria-hidden="true">{p.emoji}</span> {p.name}
        </h3>
        <strong className="investment-card-value">{display(p.value)}</strong>
        <dl>
          <div>
            <dt>Vốn còn lại</dt>
            <dd>{money(p.cost)}</dd>
          </div>
          <div>
            <dt>Chưa chốt</dt>
            <dd>{display(p.unrealized)}</dd>
          </div>
          <div>
            <dt>Đã chốt</dt>
            <dd>{money(p.realized)}</dd>
          </div>
          <div>
            <dt>ROI chưa chốt</dt>
            <dd>{formatROI(p.roi)}</dd>
          </div>
        </dl>
        <p className="expense-muted">
          {p.kind === "cash"
            ? "Số dư theo giao dịch"
            : `Định giá ${p.valueDate ?? "chưa có"}${p.stale ? " · từ kỳ trước" : ""}`}
        </p>
        {positionActions(p)}
      </article>
    );
  }
  return (
    <div className="investment-workspace">
      <header className="investment-heading">
        <div>
          <p className="eyebrow">Vốn và giá trị hiện tại</p>
          <h1>Đầu tư</h1>
          <p className="lead">
            Theo dõi từng danh mục, giữ rõ dòng tiền và những thay đổi theo thời
            gian.
          </p>
        </div>
        <Garden variant="grove" />
      </header>
      {!configured ? (
        <section className="panel">
          <h2>Kết nối dữ liệu Đầu tư</h2>
          <p>
            Cần cấu hình Auth, database và áp dụng migration Đầu tư để sử dụng.
          </p>
        </section>
      ) : (
        <>
          <div className="investment-toolbar">
            <label>
              Xem tài sản tại ngày
              <input
                type="date"
                value={date}
                max={initialToday}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </label>
            <div className="expense-actions">
              <button
                className="expense-primary"
                disabled={!view || loading}
                onClick={() => open({ type: "transaction" })}
              >
                Ghi giao dịch
              </button>
              <button
                className="expense-secondary"
                disabled={!view || loading}
                onClick={() => open({ type: "create" })}
              >
                Thêm danh mục
              </button>
              <button
                className="expense-secondary"
                disabled={loading}
                onClick={() => void load().catch(() => {})}
              >
                Tải lại
              </button>
            </div>
          </div>
          {error && (
            <div className="expense-error" role="alert">
              {error}
              {status === 401 && (
                <Link href="/login?next=/investments"> Đăng nhập lại</Link>
              )}
              {status === 503 && (
                <p>
                  Kiểm tra kết nối và migration Đầu tư; nội dung trong form được
                  giữ.
                </p>
              )}
            </div>
          )}
          {notice && (
            <p role="status" className="expense-notice">
              {notice}
            </p>
          )}
          {loading && <LoadingStatus>Đang tải danh mục…</LoadingStatus>}
          {view && (
            <>
              <div
                role="tablist"
                aria-label="Đầu tư"
                className="investment-tabs"
              >
                {tabs.map(([id, label], i) => (
                  <button
                    key={id}
                    role="tab"
                    id={`investment-tab-${id}`}
                    aria-selected={tab === id}
                    aria-controls={`investment-panel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={(e) => {
                      let next = i;
                      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
                      else if (e.key === "ArrowLeft")
                        next = (i + tabs.length - 1) % tabs.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = tabs.length - 1;
                      else return;
                      e.preventDefault();
                      setTab(tabs[next][0]);
                      document
                        .getElementById(`investment-tab-${tabs[next][0]}`)
                        ?.focus();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`investment-panel-${tab}`}
                aria-labelledby={`investment-tab-${tab}`}
              >
                {tab === "portfolio" && (
                  <>
                    <div className="investment-metrics">
                      {[
                        ["Tài sản trong Đầu tư", state!.total],
                        ["Vốn còn giữ", sum(investments.map((p) => p.cost))],
                        ["Tiền chờ", sum(wallets.map((p) => p.cash))],
                        ["Lãi/lỗ đã chốt", realized],
                        ["Lãi/lỗ chưa chốt", unrealized],
                        [
                          "Tổng lãi/lỗ",
                          unrealized === null
                            ? null
                            : (
                                BigInt(realized) + BigInt(unrealized)
                              ).toString(),
                        ],
                      ].map(([label, v]) => (
                        <article className="panel metric" key={label}>
                          <span>{label}</span>
                          <strong>{display(v)}</strong>
                        </article>
                      ))}
                    </div>
                    <p className="expense-muted">
                      Đã chốt từ ngày bắt đầu theo dõi; chưa chốt tính trên giá
                      vốn còn giữ, kể cả vốn mở đầu. Tiền chờ không có ROI.
                    </p>
                    {!categories.length ? (
                      <section className="panel investment-empty">
                        <Garden variant="grove" />
                        <h2>Bắt đầu từ những gì bạn đang có</h2>
                        <p>
                          Tạo danh mục hoặc ví, rồi ghi số dư mở đầu tại ngày
                          bắt đầu theo dõi. Có thể mua trực tiếp từ Bên ngoài.
                        </p>
                        <button
                          className="expense-primary"
                          onClick={() => open({ type: "create" })}
                        >
                          Tạo danh mục đầu tiên
                        </button>
                      </section>
                    ) : (
                      <>
                        <section className="panel investment-desktop">
                          <h2>Danh mục đầu tư</h2>
                          <div className="investment-table-scroll">
                            <table className="investment-table">
                              <thead>
                                <tr>
                                  <th>Danh mục</th>
                                  <th>Vốn còn lại</th>
                                  <th>Giá trị hiện tại</th>
                                  <th>Chưa chốt / ROI</th>
                                  <th>Đã chốt</th>
                                  <th>Định giá</th>
                                  <th>Thao tác</th>
                                </tr>
                              </thead>
                              <tbody>
                                {investments
                                  .filter((p) => p.active)
                                  .map((p) => (
                                    <tr key={p.id}>
                                      <th scope="row">
                                        {p.emoji} {p.name}
                                      </th>
                                      <td>{money(p.cost)}</td>
                                      <td>{display(p.value)}</td>
                                      <td>
                                        {display(p.unrealized)}
                                        <small>{formatROI(p.roi)}</small>
                                      </td>
                                      <td>{money(p.realized)}</td>
                                      <td>
                                        {p.valueDate ?? "Chưa có"}
                                        {p.stale && <small>Từ kỳ trước</small>}
                                      </td>
                                      <td>{positionActions(p)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                        <div className="investment-mobile investment-card-grid">
                          {investments
                            .filter((p) => p.active)
                            .map(positionCard)}
                        </div>
                        <section className="panel">
                          <h2>Ví tiền chờ</h2>
                          {wallets.filter((p) => p.active).length ? (
                            wallets
                              .filter((p) => p.active)
                              .map((p) => (
                                <div className="investment-wallet" key={p.id}>
                                  <div>
                                    <h3>
                                      {p.emoji} {p.name}
                                    </h3>
                                    <strong>{money(p.cash)}</strong>
                                  </div>
                                  {positionActions(p)}
                                </div>
                              ))
                          ) : (
                            <p>
                              Chưa có ví tiền chờ. Bạn vẫn có thể mua/bán với
                              nguồn Bên ngoài.
                            </p>
                          )}
                        </section>
                      </>
                    )}
                  </>
                )}
                {tab === "transactions" && (
                  <>
                    <section className="panel investment-filters">
                      <label>
                        Từ ngày giao dịch
                        <input
                          type="date"
                          value={from}
                          max={date}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        Đến ngày giao dịch
                        <input
                          type="date"
                          value={to}
                          max={date}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                      <label>
                        Danh mục / ví giao dịch
                        <select
                          value={activityCategory}
                          onChange={(e) => setActivityCategory(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {name(c.id)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Loại giao dịch lọc
                        <select
                          value={activityKind}
                          onChange={(e) => setActivityKind(e.target.value)}
                        >
                          <option value="">Tất cả loại</option>
                          {Object.entries(transactionNames).map(
                            ([id, name]) => (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label className="investment-checkbox">
                        <input
                          type="checkbox"
                          checked={includeCancelled}
                          onChange={(e) =>
                            setIncludeCancelled(e.target.checked)
                          }
                        />
                        Hiện cả giao dịch đã hủy
                      </label>
                    </section>
                    <section className="panel">
                      <h2>Nhật ký giao dịch</h2>
                      {!visible.length ? (
                        <p>Chưa có giao dịch phù hợp bộ lọc.</p>
                      ) : (
                        visible.map(({ t, cancelled }) => {
                          const e = state!.effects.find((e) => e.id === t.id);
                          return (
                            <article className="investment-activity" key={t.id}>
                              <div>
                                <h3>
                                  {transactionNames[t.kind]} ·{" "}
                                  {name(t.categoryId)}
                                  {cancelled ? " · đã hủy" : ""}
                                </h3>
                                <p>
                                  {t.date}
                                  {"cashCategoryId" in t && t.cashCategoryId
                                    ? ` · ${name(t.cashCategoryId)}`
                                    : ""}
                                  {t.note ? ` · ${t.note}` : ""}
                                </p>
                                <strong>{e ? money(e.net) : "—"}</strong>
                              </div>
                              <button
                                className="expense-secondary"
                                onClick={() => setTransaction(t.id)}
                              >
                                Xem giao dịch
                                <span className="sr-only">
                                  {" "}
                                  {t.date} {name(t.categoryId)}
                                </span>
                              </button>
                            </article>
                          );
                        })
                      )}
                    </section>
                  </>
                )}
                {tab === "reports" && (
                  <InvestmentReports
                    report={report}
                    filter={filter}
                    onFilter={setFilter}
                    categories={categories}
                    today={view.today}
                    onExport={() => {
                      const q = new URLSearchParams(
                        Object.entries(filter).filter(
                          ([, v]) => v !== undefined,
                        ) as [string, string][],
                      );
                      q.set("format", "csv");
                      void download(
                        `/reports?${q}`,
                        `investments-${filter.from}-${filter.to}.csv`,
                      );
                    }}
                  />
                )}
                {tab === "manage" && (
                  <>
                    <section className="panel">
                      <h2>Danh mục và ví</h2>
                      <p className="expense-muted">
                        Xóa khỏi danh sách đang dùng bằng cách lưu trữ khi hết
                        tài sản. Toàn bộ lịch sử vẫn được giữ.
                      </p>
                      {categories.map((c) => {
                        const r = ruleAt(c, date);
                        return (
                          <article key={c.id} className="investment-activity">
                            <div>
                              <h3>
                                {r?.emoji ?? c.rules[0].emoji} {name(c.id)}
                              </h3>
                              <p>
                                {c.kind === "cash"
                                  ? "Ví tiền chờ"
                                  : "Danh mục đầu tư"}{" "}
                                · từ {c.start}
                                {r?.active === false ? " · đã lưu trữ" : ""}
                              </p>
                            </div>
                            <div className="expense-actions">
                              <button
                                className="expense-secondary"
                                onClick={() =>
                                  open({ type: "configure", categoryId: c.id })
                                }
                              >
                                Sửa
                                <span className="sr-only"> {name(c.id)}</span>
                              </button>
                              <button
                                className="expense-secondary"
                                onClick={() =>
                                  open({
                                    type: "transaction",
                                    kind:
                                      c.kind === "cash"
                                        ? "openingCash"
                                        : "openingInvestment",
                                    categoryId: c.id,
                                  })
                                }
                              >
                                Mở đầu
                                <span className="sr-only"> {name(c.id)}</span>
                              </button>
                              <button
                                className="expense-secondary"
                                onClick={() =>
                                  open({
                                    type:
                                      r?.active === false
                                        ? "restore"
                                        : "archive",
                                    categoryId: c.id,
                                  })
                                }
                              >
                                {r?.active === false
                                  ? "Khôi phục"
                                  : "Xóa / lưu trữ"}
                                <span className="sr-only"> {name(c.id)}</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      {!categories.length && <p>Chưa có danh mục.</p>}
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
      {selected && (
        <ExpenseModal title={selected.name} onClose={() => setDetails(null)}>
          <div className="investment-details">
            <p>{selected.description}</p>
            <dl>
              <div>
                <dt>Giá trị</dt>
                <dd>{display(selected.value)}</dd>
              </div>
              <div>
                <dt>Giá vốn còn lại</dt>
                <dd>{money(selected.cost)}</dd>
              </div>
              <div>
                <dt>Lãi/lỗ đã chốt</dt>
                <dd>{money(selected.realized)}</dd>
              </div>
              <div>
                <dt>Lãi/lỗ chưa chốt</dt>
                <dd>{display(selected.unrealized)}</dd>
              </div>
            </dl>
            <p>
              {selected.kind === "cash"
                ? "Số dư tính từ giao dịch"
                : `Định giá ${selected.valueDate ?? "chưa có"}${selected.stale ? " · từ kỳ trước" : ""}`}
            </p>
            <div className="expense-actions">
              {selected.active && (
                <>
                  {(selected.kind === "cash"
                    ? ["deposit", "withdraw", "transfer"]
                    : ["buy", "sell", "valuation"]
                  ).map((k) => (
                    <button
                      key={k}
                      className="expense-secondary"
                      onClick={() =>
                        open({
                          type: "transaction",
                          kind: k as InvestmentTransaction["kind"],
                          categoryId: selected.id,
                        })
                      }
                    >
                      {transactionNames[k as InvestmentTransaction["kind"]]}
                    </button>
                  ))}
                </>
              )}
            </div>
            <h3>Giao dịch liên quan</h3>
            {state?.effects
              .filter(
                (e) =>
                  e.categoryId === selected.id ||
                  e.cashCategoryId === selected.id,
              )
              .map((e) => (
                <button
                  key={e.id}
                  className="investment-history-button"
                  onClick={() => {
                    setDetails(null);
                    setTransaction(e.id);
                  }}
                >
                  {e.date} · {transactionNames[e.kind]} · {money(e.net)}
                </button>
              ))}
          </div>
        </ExpenseModal>
      )}
      {selectedT && (
        <ExpenseModal
          title="Chi tiết giao dịch"
          onClose={() => setTransaction(null)}
        >
          <div className="investment-details">
            <p>
              {transactionNames[selectedT.kind]} · {name(selectedT.categoryId)}
            </p>
            {!currentT && <p>Giao dịch đã hủy.</p>}
            {(
              book?.revisions.filter((r) => r.rootId === selectedT.id) ?? []
            ).map((r) => (
              <section className="investment-revision" key={r.id}>
                <h3>
                  Phiên bản {r.sequence} ·{" "}
                  {r.transaction ? "Có hiệu lực tại lần ghi" : "Hủy"}
                </h3>
                <p>
                  {r.at}
                  {r.reason ? ` · ${r.reason}` : ""}
                </p>
                {r.transaction && (
                  <>
                    <p>
                      Ngày {r.transaction.date} ·{" "}
                      {name(r.transaction.categoryId)}
                    </p>
                    {"cashCategoryId" in r.transaction && (
                      <p>
                        Ví:{" "}
                        {r.transaction.cashCategoryId
                          ? name(r.transaction.cashCategoryId)
                          : "Bên ngoài"}
                      </p>
                    )}
                    {[...Object.entries(r.transaction)]
                      .filter(([k]) =>
                        ["amount", "cost", "value", "fee", "tax"].includes(k),
                      )
                      .map(([k, v]) => (
                        <p key={k}>
                          {
                            {
                              amount: "Số tiền trước phí/thuế",
                              cost: "Giá vốn",
                              value: "Giá trị sau giao dịch",
                              fee: "Phí",
                              tax: "Thuế",
                            }[k]
                          }
                          : {money(String(v))}
                        </p>
                      ))}
                    <p>
                      {r.transaction.counterparty} {r.transaction.note}
                    </p>
                  </>
                )}
              </section>
            ))}
            {state?.effects
              .filter((e) => e.id === selectedT.id)
              .map((e) => (
                <section key={e.id}>
                  <h3>Ảnh hưởng đang có hiệu lực</h3>
                  <p>
                    Tiền ròng {money(e.net)} · Lãi/lỗ đã chốt{" "}
                    {money(e.realized)}
                  </p>
                  {Object.keys(e.before).map((id) => (
                    <div key={id}>
                      <h4>{name(id)}</h4>
                      <p>
                        Tiền: {money(e.before[id].cash)} →{" "}
                        {money(e.after[id].cash)}
                      </p>
                      <p>
                        Vốn: {money(e.before[id].cost)} →{" "}
                        {money(e.after[id].cost)}
                      </p>
                      <p>
                        Giá trị: {display(e.before[id].value)} →{" "}
                        {display(e.after[id].value)}
                      </p>
                    </div>
                  ))}
                </section>
              ))}
            {currentT && (
              <div className="expense-actions">
                <button
                  className="expense-secondary"
                  onClick={() =>
                    open({ type: "revise", transaction: currentT })
                  }
                >
                  Sửa giao dịch
                </button>
                <button
                  className="expense-secondary"
                  onClick={() =>
                    open({ type: "cancel", transaction: currentT })
                  }
                >
                  Hủy giao dịch
                </button>
              </div>
            )}
          </div>
        </ExpenseModal>
      )}
      {editor && view && (
        <InvestmentEditor
          key={JSON.stringify(editor)}
          mode={editor}
          view={view}
          refresh={load}
          onSaved={saved}
          onClose={() => setEditor(null)}
        />
      )}
      {hidden && <p className="sr-only">Số tiền đang được che.</p>}
    </div>
  );
}
