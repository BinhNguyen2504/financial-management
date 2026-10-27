"use client";

import { DialogChanges, DialogPreview } from "@/components/dialog-content";

import { jarEmoji } from "@/domain/expenses/emoji";

import { monthName } from "./format";

import { type useExpenseEditor } from "./use-expense-editor";

export function ExpenseEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useExpenseEditor>;
}) {
  const { preview, tr, editor, name, row, emoji, locale, money } = controller;

  return (
    preview && (
      <DialogPreview className="expense-preview">
        <h3>{tr("Xem trước trước khi lưu")}</h3>
        <p>
          {editor.mode === "emoji"
            ? tr("Biểu tượng mới: {0}. Mức tháng và số dư được giữ nguyên.", {
                0: jarEmoji(name, row?.kind, emoji),
              })
            : preview.changes.length
              ? tr(
                  "{0} dòng tháng được cập nhật. Số dư các tháng sau đã được kiểm tra.",
                  { 0: preview.changes.length },
                )
              : tr("Thay đổi hợp lệ. Không có số tiền tháng nào bị thay đổi.")}
        </p>
        {preview.changes.length > 0 && editor.mode !== "emoji" && (
          <DialogChanges
            numeric
            rows={preview.changes
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .flatMap((change) =>
                (["funding", "spent", "closing"] as const).map((field) => ({
                  key: `${change.jarId}/${change.month}/${field}`,
                  period: monthName(change.month, locale),
                  subject: change.name,
                  label: {
                    funding: tr("Tiền thêm"),
                    spent: tr("Thực chi"),
                    closing: tr("Số dư"),
                  }[field],
                  before: change.before
                    ? money(change.before[field])
                    : tr("Chưa có"),
                  after: change.after
                    ? money(change.after[field])
                    : tr("Đã bỏ dòng"),
                })),
              )}
          />
        )}
      </DialogPreview>
    )
  );
}
