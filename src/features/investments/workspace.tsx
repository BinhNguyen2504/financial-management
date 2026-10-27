"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { formatDate } from "@/i18n/format";

import { ColumnTable } from "@/components/column-table";
import { Garden } from "@/components/garden";
import { AssetScene } from "@/components/asset-scene";
import { LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";

import { ruleAt } from "@/domain/investments/engine";

import type { Position } from "@/domain/investments/types";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import { Pencil as EditCommandGlyph } from "lucide-react";
import Link from "next/link";

import { InvestmentDetails, InvestmentTransactionDetails } from "./details";
import { InvestmentEditor } from "./editor";

import { transactionNames } from "./editor-config";
import { formatROI } from "./format";
import { InvestmentReports } from "./report-panel";
import { useInvestmentWorkspace } from "./use-investment-workspace";

export function InvestmentWorkspace(
  props: Parameters<typeof useInvestmentWorkspace>[0],
) {
  const controller = useInvestmentWorkspace(props);
  const {
    setDetails,
    tr,
    open,
    display,
    money,
    locale,
    configured,
    date,
    initialToday,
    setDate,
    view,
    loading,
    load,
    error,
    status,
    notice,
    localizedTabs,
    tab,
    setTab,
    state,
    sum,
    investments,
    wallets,
    realized,
    unrealized,
    categories,
    from,
    setFrom,
    to,
    setTo,
    activityCategory,
    setActivityCategory,
    name,
    activityKind,
    setActivityKind,
    localize,
    includeCancelled,
    setIncludeCancelled,
    visible,
    setTransaction,
    report,
    filter,
    setFilter,
    download,
    selected,
    transaction,
    editor,
    saved,
    setEditor,
    hidden,
  } = controller;
  function positionActions(p: Position) {
    return (
      <div className="expense-actions">
        <button className="expense-secondary" onClick={() => setDetails(p.id)}>
          {tr("Chi tiết")} <span className="sr-only">{p.name}</span>
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
            {p.kind === "cash" ? tr("Nạp") : "Mua"}
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
            {tr("Định giá")}
            <span className="sr-only"> {p.name}</span>
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
            <dt>{tr("Vốn còn lại")}</dt>
            <dd>{money(p.cost)}</dd>
          </div>
          <div>
            <dt>{tr("Chưa chốt")}</dt>
            <dd>{display(p.unrealized)}</dd>
          </div>
          <div>
            <dt>{tr("Đã chốt")}</dt>
            <dd>{money(p.realized)}</dd>
          </div>
          <div>
            <dt>{tr("ROI chưa chốt")}</dt>
            <dd>{formatROI(p.roi, locale)}</dd>
          </div>
        </dl>
        <p className="expense-muted">
          {p.kind === "cash"
            ? tr("Số dư theo giao dịch")
            : tr("Định giá {0}{1}", {
                0: p.valueDate ?? tr("chưa có"),
                1: p.stale ? tr(" · từ kỳ trước") : "",
              })}
        </p>
        {positionActions(p)}
      </article>
    );
  }
  return (
    <div
      className="investment-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <header className="investment-heading illustrated-heading">
        <div className="heading-copy">
          <p className="eyebrow">{tr("Vốn và giá trị hiện tại")}</p>
          <HelpPageTitle>{tr("Đầu tư")}</HelpPageTitle>
          <p className="lead">
            {tr(
              "Theo dõi từng danh mục, giữ rõ dòng tiền và những thay đổi theo thời gian.",
            )}
          </p>
        </div>
        <div className="heading-art">
          <AssetScene kind="investments" />
        </div>
      </header>
      {!configured ? (
        <section className="panel">
          <h2>{tr("Kết nối dữ liệu Đầu tư")}</h2>
          <p>
            {tr(
              "Cần cấu hình Auth, database và áp dụng migration Đầu tư để sử dụng.",
            )}
          </p>
        </section>
      ) : (
        <>
          <div className="investment-toolbar">
            <label>
              {tr("Xem tài sản tại ngày")}
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
                {tr("Ghi giao dịch")}
              </button>
              <button
                className="expense-secondary"
                disabled={!view || loading}
                onClick={() => open({ type: "create" })}
              >
                {tr("Thêm danh mục")}
              </button>
              <button
                className="expense-secondary"
                disabled={loading}
                onClick={() => void load().catch(() => {})}
              >
                {tr("Tải lại")}
              </button>
            </div>
          </div>
          {error && (
            <div className="expense-error" role="alert">
              {tr(error)}
              {status === 401 && (
                <Link href="/login?next=/investments">
                  {" "}
                  {tr("Đăng nhập lại")}
                </Link>
              )}
              {status === 503 && (
                <p>
                  {tr(
                    "Kiểm tra kết nối và migration Đầu tư; nội dung trong form được giữ.",
                  )}
                </p>
              )}
            </div>
          )}
          {notice && (
            <p role="status" className="expense-notice">
              {tr(notice)}
            </p>
          )}
          {loading && <LoadingStatus>{tr("Đang tải danh mục…")}</LoadingStatus>}
          {view && (
            <>
              <ScrollTabs
                role="tablist"
                aria-label={tr("Đầu tư")}
                className="investment-tabs"
              >
                {localizedTabs.map(([id, label], i) => (
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
                      if (e.key === "ArrowRight")
                        next = (i + 1) % localizedTabs.length;
                      else if (e.key === "ArrowLeft")
                        next =
                          (i + localizedTabs.length - 1) % localizedTabs.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = localizedTabs.length - 1;
                      else return;
                      e.preventDefault();
                      setTab(localizedTabs[next][0]);
                      document
                        .getElementById(
                          `investment-tab-${localizedTabs[next][0]}`,
                        )
                        ?.focus({ preventScroll: true });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </ScrollTabs>
              <div
                role="tabpanel"
                id={`investment-panel-${tab}`}
                aria-labelledby={`investment-tab-${tab}`}
              >
                {tab === "portfolio" && (
                  <>
                    <div className="investment-metrics">
                      {[
                        [tr("Tài sản trong Đầu tư"), state!.total],
                        [
                          tr("Vốn còn giữ"),
                          sum(investments.map((p) => p.cost)),
                        ],
                        [tr("Tiền chờ"), sum(wallets.map((p) => p.cash))],
                        [tr("Lãi/lỗ đã chốt"), realized],
                        [tr("Lãi/lỗ chưa chốt"), unrealized],
                        [
                          tr("Tổng lãi/lỗ"),
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
                      {tr(
                        "Đã chốt từ ngày bắt đầu theo dõi; chưa chốt tính trên giá vốn còn giữ, kể cả vốn mở đầu. Tiền chờ không có ROI.",
                      )}
                    </p>
                    {!categories.length ? (
                      <section className="panel investment-empty">
                        <Garden variant="sprout" />
                        <h2>{tr("Bắt đầu từ những gì bạn đang có")}</h2>
                        <p>
                          {tr(
                            "Tạo danh mục hoặc ví, rồi ghi số dư mở đầu tại ngày bắt đầu theo dõi. Có thể mua trực tiếp từ Bên ngoài.",
                          )}
                        </p>
                        <button
                          className="expense-primary"
                          onClick={() => open({ type: "create" })}
                        >
                          {tr("Tạo danh mục đầu tiên")}
                        </button>
                      </section>
                    ) : (
                      <>
                        <section className="panel investment-desktop">
                          <h2>{tr("Danh mục đầu tư")}</h2>
                          <HelpButton
                            pageId="investments"
                            sectionId="profit"
                            label={tr("Hiểu kết quả đầu tư")}
                          />
                          <div className="investment-table-scroll">
                            <ColumnTable
                              tableId="investments-workspace-1"
                              className="investment-table"
                            >
                              <thead>
                                <tr>
                                  <th>{tr("Danh mục")}</th>
                                  <th>{tr("Vốn còn lại")}</th>
                                  <th>{tr("Giá trị hiện tại")}</th>
                                  <th>{tr("Chưa chốt / ROI")}</th>
                                  <th>{tr("Đã chốt")}</th>
                                  <th>{tr("Định giá")}</th>
                                  <th>{tr("Thao tác")}</th>
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
                                        <small>
                                          {formatROI(p.roi, locale)}
                                        </small>
                                      </td>
                                      <td>{money(p.realized)}</td>
                                      <td>
                                        {p.valueDate ?? tr("Chưa có")}
                                        {p.stale && (
                                          <small>{tr("Từ kỳ trước")}</small>
                                        )}
                                      </td>
                                      <td>{positionActions(p)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </ColumnTable>
                          </div>
                        </section>
                        <div className="investment-mobile investment-card-grid">
                          {investments
                            .filter((p) => p.active)
                            .map(positionCard)}
                        </div>
                        <section className="panel">
                          <h2>{tr("Ví tiền chờ")}</h2>
                          <HelpButton
                            pageId="investments"
                            sectionId="portfolio"
                            label={tr("Tiền chờ là gì?")}
                          />
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
                              {tr(
                                "Chưa có ví tiền chờ. Bạn vẫn có thể mua/bán với nguồn Bên ngoài.",
                              )}
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
                        {tr("Từ ngày giao dịch")}
                        <input
                          type="date"
                          value={from}
                          max={date}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        {tr("Đến ngày giao dịch")}
                        <input
                          type="date"
                          value={to}
                          max={date}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                      <label>
                        {tr("Danh mục / ví giao dịch")}
                        <select
                          value={activityCategory}
                          onChange={(e) => setActivityCategory(e.target.value)}
                        >
                          <option value="">{tr("Tất cả")}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {name(c.id)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Loại giao dịch lọc")}
                        <select
                          value={activityKind}
                          onChange={(e) => setActivityKind(e.target.value)}
                        >
                          <option value="">{tr("Tất cả loại")}</option>
                          {Object.entries(localize(transactionNames)).map(
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
                        {tr("Hiện cả giao dịch đã hủy")}
                      </label>
                    </section>
                    <section className="panel">
                      <h2>{tr("Nhật ký giao dịch")}</h2>
                      {!visible.length ? (
                        <p>{tr("Chưa có giao dịch phù hợp bộ lọc.")}</p>
                      ) : (
                        visible.map(({ t, cancelled }) => {
                          const e = state!.effects.find((e) => e.id === t.id);
                          return (
                            <article className="investment-activity" key={t.id}>
                              <div>
                                <h3>
                                  {localize(transactionNames)[t.kind]} ·{" "}
                                  {name(t.categoryId)}
                                  {cancelled ? tr(" · đã hủy") : ""}
                                </h3>
                                <p>
                                  {formatDate(t.date!, locale)}
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
                                {tr("Xem giao dịch")}
                                <span className="sr-only">
                                  {" "}
                                  {formatDate(t.date!, locale)}{" "}
                                  {name(t.categoryId)}
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
                      q.set("locale", locale);
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
                      <h2>{tr("Danh mục và ví")}</h2>
                      <p className="expense-muted">
                        {tr(
                          "Xóa khỏi danh sách đang dùng bằng cách lưu trữ khi hết tài sản. Toàn bộ lịch sử vẫn được giữ.",
                        )}
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
                                  ? tr("Ví tiền chờ")
                                  : tr("Danh mục đầu tư")}{" "}
                                {tr("· từ")} {formatDate(c.start!, locale)}
                                {r?.active === false ? tr(" · đã lưu trữ") : ""}
                              </p>
                            </div>
                            <div className="expense-actions">
                              <button
                                className="expense-secondary"
                                onClick={() =>
                                  open({ type: "configure", categoryId: c.id })
                                }
                              >
                                <EditCommandGlyph
                                  size={17}
                                  aria-hidden="true"
                                />
                                {tr("Sửa")}
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
                                {tr("Mở đầu")}
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
                                  ? tr("Khôi phục")
                                  : tr("Xóa / lưu trữ")}
                                <span className="sr-only"> {name(c.id)}</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      {!categories.length && <p>{tr("Chưa có danh mục.")}</p>}
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
      {selected && view && (
        <InvestmentDetails
          key={selected.id}
          view={view}
          position={selected}
          onClose={() => setDetails(null)}
          onEdit={open}
          onTransaction={setTransaction}
        />
      )}
      {transaction && view && (
        <InvestmentTransactionDetails
          key={transaction}
          view={view}
          id={transaction}
          onClose={() => setTransaction(null)}
          onEdit={open}
        />
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
      {hidden && <p className="sr-only">{tr("Số tiền đang được che.")}</p>}
    </div>
  );
}
