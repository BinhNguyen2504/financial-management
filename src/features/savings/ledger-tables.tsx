"use client";
import { StatusBadge } from "@/components/status-badge";

import { ColumnTable } from "@/components/column-table";
import { useMoney } from "@/components/privacy";
import { ruleAt } from "@/domain/savings/engine";
import type {
  SavingsCategory,
  SavingsTransaction,
  TransactionEffect,
} from "@/domain/savings/types";
import { formatDate, formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import { Pencil, Trash2 } from "lucide-react";
import { kindNames, transactionNames, type EditorMode } from "./editor-config";

export function SavingsCategoryTable({
  categories,
  month,
  onEdit,
}: {
  categories: SavingsCategory[];
  month: string;
  onEdit: (mode: EditorMode) => void;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");
  return (
    <div className="savings-ledger">
      <p className="savings-ledger-count">
        {tr("{0} danh mục", { 0: categories.length })}
      </p>
      <ColumnTable
        tableId="savings-categories"
        className="savings-ledger-table"
        role="table"
        aria-label={tr("Danh mục tiết kiệm")}
      >
        <thead role="rowgroup">
          <tr role="row">
            <th
              scope="col"
              role="columnheader"
              className="savings-ledger-identity"
            >
              {tr("Danh mục")}
            </th>
            <th scope="col" role="columnheader" className="savings-ledger-text">
              {tr("Loại tài sản")}
            </th>
            <th scope="col" role="columnheader">
              {tr("Tháng bắt đầu")}
            </th>
            <th scope="col" role="columnheader">
              {tr("Trạng thái")}
            </th>
            <th
              scope="col"
              role="columnheader"
              className="savings-ledger-actions"
            >
              {tr("Thao tác")}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {categories.map((c) => {
            const r = ruleAt(c, month) ?? c.rules[0];
            return (
              <tr key={c.id} role="row">
                <th scope="row" role="rowheader">
                  <h3>
                    <span aria-hidden="true">{r.emoji}</span> {r.name}
                  </h3>
                  {r.description && (
                    <p className="savings-ledger-subline savings-ledger-note">
                      {r.description}
                    </p>
                  )}
                </th>
                <td role="cell" className="savings-ledger-text">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Loại tài sản")}
                  </span>
                  <div>
                    {localize(kindNames)[c.kind]}
                    {c.unit && (
                      <p className="savings-ledger-subline">
                        {tr("Đơn vị")}: {tr(c.unit)}
                      </p>
                    )}
                  </div>
                </td>
                <td role="cell">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Tháng bắt đầu")}
                  </span>
                  <time dateTime={c.start}>{formatMonth(c.start, locale)}</time>
                </td>
                <td role="cell">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Trạng thái")}
                  </span>
                  <StatusBadge
                    size="compact"
                    tone={r.active ? "success" : "neutral"}
                  >
                    {r.active ? tr("Đang hoạt động") : tr("Đã lưu trữ")}
                  </StatusBadge>
                </td>
                <td role="cell">
                  <div className="expense-actions">
                    <button
                      type="button"
                      className="expense-secondary icon-action action-edit"
                      aria-label={tr("Sửa danh mục {0}", { 0: r.name })}
                      title={tr("Sửa")}
                      onClick={() => onEdit({ type: "configure", category: c })}
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="expense-secondary"
                      aria-label={`${r.active ? tr("Lưu trữ") : tr("Khôi phục")} ${r.name}`}
                      onClick={() =>
                        onEdit({
                          type: r.active ? "archive" : "restore",
                          category: c,
                        })
                      }
                    >
                      {r.active ? tr("Lưu trữ") : tr("Khôi phục")}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!categories.length && (
            <tr role="row">
              <td role="cell" colSpan={5} className="savings-ledger-empty">
                {tr(
                  "Thêm danh mục, rồi ghi số dư mở đầu hoặc giao dịch đầu tiên.",
                )}
              </td>
            </tr>
          )}
        </tbody>
      </ColumnTable>
    </div>
  );
}

export function SavingsTransactionTable({
  transactions,
  categories,
  effects,
  label,
  report = false,
  onEdit,
}: {
  transactions: SavingsTransaction[];
  categories: SavingsCategory[];
  effects: TransactionEffect[];
  label: string;
  report?: boolean;
  onEdit: (mode: EditorMode) => void;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");
  const money = useMoney();
  const categoryName = (id: string, date: string) => {
    const c = categories.find((category) => category.id === id);
    return c ? (ruleAt(c, date.slice(0, 7)) ?? c.rules[0]).name : "—";
  };
  const effectById = new Map(effects.map((effect) => [effect.id, effect]));
  // Reverse chronological order; stable sorting preserves the original same-day order.
  const rows = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="savings-ledger">
      <p className="savings-ledger-count">
        {tr("{0} giao dịch · Mới nhất trước", { 0: rows.length })}
      </p>
      <ColumnTable
        tableId={
          report ? "savings-report-transactions" : "savings-month-transactions"
        }
        className="savings-ledger-table"
        role="table"
        aria-label={label}
      >
        <thead role="rowgroup">
          <tr role="row">
            <th
              scope="col"
              role="columnheader"
              className="savings-ledger-identity"
            >
              {tr("Giao dịch")}
            </th>
            <th scope="col" role="columnheader" className="savings-ledger-date">
              {tr("Ngày")}
            </th>
            <th scope="col" role="columnheader">
              {tr("Danh mục")}
            </th>
            <th
              scope="col"
              role="columnheader"
              className="is-numeric savings-ledger-amount"
            >
              {tr("Số tiền")}
            </th>
            <th
              scope="col"
              role="columnheader"
              className="savings-ledger-actions"
            >
              {tr("Thao tác")}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((t) => {
            const effect = effectById.get(t.id);
            return (
              <tr key={t.id} role="row">
                <th scope="row" role="rowheader">
                  <h3>{localize(transactionNames)[t.kind]}</h3>
                  {t.note && (
                    <p className="savings-ledger-subline savings-ledger-note">
                      {t.note}
                    </p>
                  )}
                </th>
                <td role="cell">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Ngày")}
                  </span>
                  <time dateTime={t.date}>{formatDate(t.date, locale)}</time>
                </td>
                <td role="cell">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Danh mục")}
                  </span>
                  <div>
                    {categoryName(t.categoryId, t.date)}
                    {"cashCategoryId" in t && t.cashCategoryId && (
                      <p className="savings-ledger-subline">
                        {tr("Ví liên quan")}:{" "}
                        {categoryName(t.cashCategoryId, t.date)}
                      </p>
                    )}
                  </div>
                </td>
                <td role="cell" className="is-numeric">
                  <span className="savings-cell-label" aria-hidden="true">
                    {tr("Số tiền")}
                  </span>
                  <div>
                    <strong>{effect ? money(effect.net) : "—"}</strong>
                    {effect?.kind === "sellGold" && (
                      <p className="savings-ledger-subline">
                        {tr("Lãi/lỗ đã chốt:")} {money(effect.realized)}
                      </p>
                    )}
                  </div>
                </td>
                <td role="cell">
                  <div className="expense-actions">
                    <button
                      type="button"
                      className={`expense-secondary${report ? "" : " icon-action action-edit"}`}
                      aria-label={tr(
                        report
                          ? "Xem / sửa giao dịch {0}"
                          : "Sửa giao dịch {0}",
                        { 0: t.id },
                      )}
                      title={tr("Sửa")}
                      onClick={() =>
                        onEdit({ type: "transaction", transaction: t })
                      }
                    >
                      {report ? (
                        tr("Xem / sửa")
                      ) : (
                        <Pencil size={18} aria-hidden="true" />
                      )}
                    </button>
                    {!report && (
                      <button
                        type="button"
                        className="expense-secondary icon-action action-delete"
                        aria-label={tr("Hủy giao dịch {0}", { 0: t.id })}
                        title={tr("Hủy giao dịch")}
                        onClick={() => onEdit({ type: "void", transaction: t })}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr role="row">
              <td role="cell" colSpan={5} className="savings-ledger-empty">
                {tr("Chưa có giao dịch trong bộ lọc này.")}
              </td>
            </tr>
          )}
        </tbody>
      </ColumnTable>
    </div>
  );
}
