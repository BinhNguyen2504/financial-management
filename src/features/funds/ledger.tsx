"use client";
import { useViewState } from "@/components/use-view-state";
import { AnimatedDetails } from "@/components/animated-details";
import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";
import { activeTransactions } from "@/domain/funds/engine";
import type { FundId, FundTransaction } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import {
  Plus,
  Trash2 as CancelEntryIcon,
  Pencil as EditActionIcon,
} from "lucide-react";
import { useState } from "react";
import {
  displayTime,
  fundNames,
  localDateTime,
  transactionNames as transactionNamesSource,
} from "./content";
import type { EditorMode } from "./editor-config";
export function FundLedger({
  view,
  fundId,
  onEdit,
}: {
  view: FundView;
  fundId?: FundId;
  onEdit: (mode: EditorMode) => void;
}) {
  const { t: tr, locale, config: localize } = useI18n("funds");

  const money = useMoney(),
    [query, setQuery] = useViewState(
      `funds-ledger-${fundId ?? "all"}`,
      "query",
      "",
    ),
    [kind, setKind] = useViewState(
      `funds-ledger-${fundId ?? "all"}`,
      "kind",
      "",
    ),
    [fund, setFund] = useViewState(
      `funds-ledger-${fundId ?? "all"}`,
      "fund",
      fundId ?? "",
    ),
    [location, setLocation] = useViewState(
      `funds-ledger-${fundId ?? "all"}`,
      "location",
      "",
    ),
    [from, setFrom] = useViewState(
      `funds-ledger-${fundId ?? "all"}`,
      "from",
      "",
    ),
    [to, setTo] = useViewState(`funds-ledger-${fundId ?? "all"}`, "to", ""),
    [page, setPage] = useState(1);
  const place = (id: string) =>
    view.book?.locations.find((l) => l.id === id)?.name ?? "";
  const matches = (t: FundTransaction) => {
    const date = localDateTime(t.occurredAt).slice(0, 10);
    return (
      (!fund ||
        t.fundId === fund ||
        (t.kind === "transfer" && t.toFundId === fund)) &&
      (!kind || t.kind === kind) &&
      (!location ||
        t.locationId === location ||
        (t.kind === "transfer" && t.toLocationId === location)) &&
      (!from || date >= from) &&
      (!to || date <= to) &&
      `${t.note} ${tr(fundNames[t.fundId])} ${place(t.locationId)} ${t.kind === "transfer" ? tr(fundNames[t.toFundId]) + " " + place(t.toLocationId) : ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
    );
  };
  const items = view.book
      ? activeTransactions(view.book)
          .map((r) => r.transaction)
          .reverse()
          .filter(matches)
      : [],
    pages = Math.max(1, Math.ceil(items.length / 10)),
    current = Math.min(page, pages);
  return (
    <section className="fund-ledger">
      <div className="fund-section-heading">
        <h2>{tr("Giao dịch")}</h2>
        <button
          className="expense-secondary"
          onClick={() => onEdit({ type: "transaction", fundId })}
        >
          <Plus size={17} aria-hidden="true" />
          {tr("Ghi giao dịch")}
        </button>
      </div>
      <div className="fund-filters" onChange={() => setPage(1)}>
        <label className="fund-search">
          {tr("Tìm giao dịch")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Lý do, quỹ hoặc nơi giữ")}
          />
        </label>
        <AnimatedDetails className="fund-filter-options" open={undefined}>
          <summary>
            {tr("Bộ lọc giao dịch")} ·{" "}
            {
              [
                fund !== (fundId ?? "") ? fund || "all" : "",
                kind,
                location,
                from,
                to,
              ].filter(Boolean).length
            }
          </summary>
          <div className="fund-filters-grid">
            <label>
              {tr("Quỹ lọc")}
              <select
                aria-label={tr("Quỹ lọc")}
                value={fund}
                onChange={(e) => setFund(e.target.value)}
              >
                <option value="">{tr("Tất cả quỹ")}</option>
                {Object.entries(localize(fundNames)).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Loại giao dịch lọc")}
              <select
                aria-label={tr("Loại giao dịch lọc")}
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="">{tr("Tất cả loại")}</option>
                {Object.entries(localize(transactionNamesSource)).map(
                  ([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {tr("Nơi giữ lọc")}
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">{tr("Tất cả nơi giữ")}</option>
                {view.book?.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Từ ngày")}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              {tr("Đến ngày")}
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        </AnimatedDetails>
      </div>
      {[
        query,
        kind,
        fund !== (fundId ?? "") ? "fund" : "",
        location,
        from,
        to,
      ].some(Boolean) && (
        <button
          className="expense-secondary fund-filter-reset"
          onClick={() => {
            setQuery("");
            setKind("");
            setFund(fundId ?? "");
            setLocation("");
            setFrom("");
            setTo("");
            setPage(1);
          }}
        >
          {tr("Đặt lại bộ lọc")}
        </button>
      )}
      {from && to && from > to ? (
        <p role="alert">{tr("Ngày kết thúc phải từ ngày bắt đầu trở đi.")}</p>
      ) : (
        <>
          {!items.length ? (
            <p className="fund-empty">
              {tr(
                "Chưa có giao dịch phù hợp. Mỗi khoản góp nhỏ đều là một bước chuẩn bị.",
              )}
            </p>
          ) : (
            <div className="fund-transaction-list">
              {items.slice((current - 1) * 10, current * 10).map((t) => (
                <article
                  key={t.id}
                  className="fund-transaction"
                  data-transaction-id={t.id}
                >
                  <div className="fund-transaction-info">
                    <strong>{localize(transactionNamesSource)[t.kind]}</strong>
                    <small>
                      {displayTime(t.occurredAt, locale)} {tr("· Giờ Việt Nam")}
                    </small>
                    <span>
                      {tr(fundNames[t.fundId])} · {place(t.locationId)}
                    </span>
                    {t.kind === "transfer" && (
                      <span>
                        → {tr(fundNames[t.toFundId])} · {place(t.toLocationId)}
                      </span>
                    )}
                    <p>{t.note || tr("Không có ghi chú")}</p>
                  </div>
                  <strong className="fund-transaction-amount">
                    {money(t.amount)}
                  </strong>
                  <div className="fund-actions">
                    <button
                      className="expense-icon-button"
                      onClick={() => onEdit({ type: "revise", transaction: t })}
                      aria-label={tr("Sửa giao dịch")}
                      title={tr("Sửa giao dịch")}
                    >
                      <EditActionIcon size={18} aria-hidden="true" />
                    </button>
                    <button
                      className="expense-icon-button"
                      onClick={() => onEdit({ type: "cancel", transaction: t })}
                      aria-label={tr("Hủy giao dịch")}
                      title={tr("Hủy giao dịch")}
                    >
                      <CancelEntryIcon size={17} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <nav
            className="fund-pagination"
            aria-label={tr("Phân trang giao dịch")}
          >
            <span>
              {items.length > 0 && (
                <>
                  {(current - 1) * 10 + 1}–
                  {Math.min(current * 10, items.length)} /{" "}
                </>
              )}
              {items.length} {tr("giao dịch · Trang")} {current}/{pages}
            </span>
            <button
              className="expense-secondary"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              {tr("Trang trước")}
            </button>
            <button
              className="expense-secondary"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              {tr("Trang sau")}
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
