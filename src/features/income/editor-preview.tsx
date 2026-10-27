"use client";

import { DialogChanges, DialogPreview } from "@/components/dialog-content";

import { formatMonth as monthName } from "@/i18n/format";

import { type useIncomeEditor } from "./use-income-editor";

export function IncomeEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useIncomeEditor>;
}) {
  const { preview, tr, locale } = controller;

  return (
    preview && (
      <DialogPreview className="income-preview">
        <h3>
          {tr("Ảnh hưởng từ")}{" "}
          {monthName(preview.result.effectiveFrom!, locale)}
        </h3>
        <p>
          {preview.result.changes.length > 0
            ? tr("{0} dòng thay đổi trong các năm đang", {
                0: preview.result.changes.length,
              })
            : tr("Cập nhật cấu hình trong các năm đang")}
          {tr(
            "có cấu hình hoặc dữ liệu; cấu hình tiếp tục áp dụng cho những năm sau. Tổng tiền đã ghi không thay đổi.",
          )}
        </p>
        {preview.result.changes.length > 0 && (
          <DialogChanges
            rows={preview.result.changes
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((r) => ({
                key: `${r.kind}/${r.key}/${r.month}`,
                label: monthName(r.month, locale),
                before: r.beforeName ?? tr("Chưa có"),
                after: `${r.afterName ?? tr("Không còn dòng trống")}${r.afterActive === false ? tr(" · Đã ngừng; giữ số đã ghi") : ""}`,
              }))}
          />
        )}
      </DialogPreview>
    )
  );
}
