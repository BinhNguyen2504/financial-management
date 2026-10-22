"use client";
import { useI18n } from "@/i18n/provider";

import {
  DialogList,
  DialogNote,
  DialogSummary,
} from "@/components/dialog-content";
import { useMoney } from "@/components/privacy";
import type { IncomeRow } from "@/domain/income/types";
import { monthName } from "@/features/expenses/format";
import { ExpenseModal } from "@/features/expenses/modal";
import {
  Trash2 as DeleteActionIcon,
  Pencil as EditActionIcon,
} from "lucide-react";
import type { EditorMode } from "./editor";

export function IncomeDetails({
  rows,
  month,
  onClose,
  onEdit,
}: {
  rows: IncomeRow[];
  month?: string;
  onClose(): void;
  onEdit(mode: EditorMode): void;
}) {
  const { t: tr, locale } = useI18n("income");

  const money = useMoney();
  const sorted = rows
    .filter((r) => !month || r.month === month)
    .slice()
    .sort(
      (a, b) => b.month.localeCompare(a.month) || b.key.localeCompare(a.key),
    );
  return (
    <ExpenseModal
      title={
        month
          ? tr("Thu phát sinh · {0}", { 0: monthName(month, locale) })
          : tr("Thu phát sinh trong kỳ")
      }
      size="detail"
      onClose={onClose}
    >
      <DialogSummary
        label={tr("Tổng thu phát sinh trong kỳ đang xem")}
        value={money(
          sorted
            .reduce((sum, r) => sum + BigInt(r.amount ?? "0"), 0n)
            .toString(),
        )}
      >
        <p>
          {sorted.length} {tr("khoản thu")}
        </p>
      </DialogSummary>
      <DialogList
        items={sorted}
        rowKey={(r) => r.key}
        label={tr("Các khoản thu phát sinh")}
        searchText={(r) => `${r.name} ${r.description} ${r.note}`}
        columns={[
          { label: tr("Tháng"), render: (r) => monthName(r.month, locale) },
          {
            label: tr("Nội dung"),
            render: (r) => (
              <>
                <strong>{r.name}</strong>
                <DialogNote text={r.description} />
                {r.note !== r.description && <DialogNote text={r.note} />}
              </>
            ),
          },
          {
            label: tr("Số tiền"),
            numeric: true,
            render: (r) => <strong>{money(r.amount ?? "0")}</strong>,
          },
          {
            label: tr("Thao tác"),
            render: (r) => (
              <div className="expense-actions">
                <button
                  type="button"
                  className="expense-secondary icon-action action-edit"
                  aria-label={tr("Sửa {0}", { 0: r.name })}
                  onClick={() => onEdit({ type: "oneoff", row: r })}
                  title={tr("Sửa")}
                >
                  <EditActionIcon size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="expense-secondary icon-action action-delete"
                  aria-label={tr("Xóa {0}", { 0: r.name })}
                  onClick={() => onEdit({ type: "deleteOneOff", row: r })}
                  title={tr("Xóa")}
                >
                  <DeleteActionIcon size={18} aria-hidden="true" />
                </button>
              </div>
            ),
          },
        ]}
      />
    </ExpenseModal>
  );
}
