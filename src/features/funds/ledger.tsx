"use client";
import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";
import { activeTransactions } from "@/domain/funds/engine";
import type { FundId, FundTransaction } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import {
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
import type { EditorMode } from "./editor";
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
    [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [fund, setFund] = useState(fundId ?? ""),
    [location, setLocation] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
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
      `${t.note} ${fundNames[t.fundId]} ${place(t.locationId)} ${t.kind === "transfer" ? fundNames[t.toFundId] + " " + place(t.toLocationId) : ""}`
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
    pages = Math.max(1, Math.ceil(items.length / 20)),
    current = Math.min(page, pages);
  return (
    <section className="fund-ledger">
      <div className="fund-section-heading">
        <h3>{tr("Giao dịch")}</h3>
        <button
          className="expense-secondary"
          onClick={() => onEdit({ type: "transaction", fundId })}
        >
          {tr("Ghi giao dịch")}
        </button>
      </div>
      <div className="fund-filters" onChange={() => setPage(1)}>
        <label>
          {tr("Tìm giao dịch")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Lý do, quỹ hoặc nơi giữ")}
          />
        </label>
        <label>
          {tr("Quỹ lọc")}
          <select
            aria-label={tr("Quỹ lọc")}
            value={fund}
            onChange={(e) => setFund(e.target.value)}
          >
            <option value="">{tr("Tất cả quỹ")}</option>
            {Object.entries(fundNames).map(([k, v]) => (
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
            {Object.entries(localize(transactionNamesSource)).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
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
              {items.slice((current - 1) * 20, current * 20).map((t) => (
                <article
                  key={t.id}
                  className="fund-transaction"
                  data-transaction-id={t.id}
                >
                  <div>
                    <strong>{localize(transactionNamesSource)[t.kind]}</strong>
                    <small>
                      {displayTime(t.occurredAt, locale)} {tr("· Giờ Việt Nam")}
                    </small>
                    <span>
                      {fundNames[t.fundId]} · {place(t.locationId)}
                    </span>
                    {t.kind === "transfer" && (
                      <span>
                        → {fundNames[t.toFundId]} · {place(t.toLocationId)}
                      </span>
                    )}
                    <p>{t.note || tr("Không có ghi chú")}</p>
                  </div>
                  <strong>{money(t.amount)}</strong>
                  <div className="fund-actions">
                    <button
                      className="expense-secondary icon-action action-edit"
                      onClick={() => onEdit({ type: "revise", transaction: t })}
                      aria-label={tr("Sửa")}
                      title={tr("Sửa")}
                    >
                      <EditActionIcon size={18} aria-hidden="true" />
                    </button>
                    <button
                      className="expense-secondary"
                      onClick={() => onEdit({ type: "cancel", transaction: t })}
                    >
                      <CancelEntryIcon size={17} aria-hidden="true" />
                      {tr("Hủy giao dịch")}
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
              Trang sau
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
