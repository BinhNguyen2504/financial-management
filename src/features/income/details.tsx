"use client";
import { useMoney } from "@/components/privacy";
import {
  DialogList,
  DialogNote,
  DialogSummary,
} from "@/components/dialog-content";
import type { IncomeRow } from "@/domain/income/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { monthName } from "@/features/expenses/format";
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
        month ? `Thu phát sinh · ${monthName(month)}` : "Thu phát sinh trong kỳ"
      }
      size="detail"
      onClose={onClose}
    >
      <DialogSummary
        label="Tổng thu phát sinh trong kỳ đang xem"
        value={money(
          sorted
            .reduce((sum, r) => sum + BigInt(r.amount ?? "0"), 0n)
            .toString(),
        )}
      >
        <p>{sorted.length} khoản thu</p>
      </DialogSummary>
      <DialogList
        items={sorted}
        rowKey={(r) => r.key}
        label="Các khoản thu phát sinh"
        searchText={(r) => `${r.name} ${r.description} ${r.note}`}
        columns={[
          { label: "Tháng", render: (r) => monthName(r.month) },
          {
            label: "Nội dung",
            render: (r) => (
              <>
                <strong>{r.name}</strong>
                <DialogNote text={r.description} />
                {r.note !== r.description && <DialogNote text={r.note} />}
              </>
            ),
          },
          {
            label: "Số tiền",
            numeric: true,
            render: (r) => <strong>{money(r.amount ?? "0")}</strong>,
          },
          {
            label: "Thao tác",
            render: (r) => (
              <div className="expense-actions">
                <button
                  type="button"
                  className="expense-secondary"
                  aria-label={`Sửa ${r.name}`}
                  onClick={() => onEdit({ type: "oneoff", row: r })}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="expense-secondary"
                  aria-label={`Xóa ${r.name}`}
                  onClick={() => onEdit({ type: "deleteOneOff", row: r })}
                >
                  Xóa
                </button>
              </div>
            ),
          },
        ]}
      />
    </ExpenseModal>
  );
}
