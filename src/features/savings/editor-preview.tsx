"use client";

import {
  decimalLabel,
  DialogChanges,
  DialogPreview,
} from "@/components/dialog-content";

import { type useSavingsEditor } from "./use-savings-editor";

export function SavingsEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useSavingsEditor>;
}) {
  const { preview, tr, money, hidden, locale } = controller;

  return (
    preview && (
      <DialogPreview className="savings-preview">
        <h3>{tr("Xem trước thay đổi")}</h3>
        <DialogChanges
          numeric
          rows={[
            {
              key: "total",
              label: tr("Tài sản tiết kiệm"),
              before:
                preview.result.before.total === null
                  ? tr("Thiếu định giá")
                  : money(preview.result.before.total),
              after:
                preview.result.after.total === null
                  ? tr("Thiếu định giá")
                  : money(preview.result.after.total),
            },
            ...preview.result.after.positions.flatMap((p) => {
              const before = preview.result.before.positions.find(
                (b) => b.id === p.id,
              );
              const fields =
                p.kind === "gold"
                  ? (["value", "cost", "quantity"] as const)
                  : (["value"] as const);
              return fields
                .filter((field) => before?.[field] !== p[field])
                .map((field) => ({
                  key: `${p.id}/${field}`,
                  label: `${p.name} · ${{ value: tr("Giá trị"), cost: tr("Giá vốn"), quantity: tr("Khối lượng") }[field]}`,
                  before:
                    field === "quantity"
                      ? `${hidden ? "••••••" : decimalLabel(before?.quantity ?? "0", locale)} ${tr(p.unit ?? "")}`
                      : before?.[field] === null
                        ? tr("Thiếu định giá")
                        : money(before?.[field] ?? "0"),
                  after:
                    field === "quantity"
                      ? `${hidden ? "••••••" : decimalLabel(p.quantity, locale)} ${tr(p.unit ?? "")}`
                      : p[field] === null
                        ? tr("Thiếu định giá")
                        : money(p[field]),
                }));
            }),
          ]}
        />
      </DialogPreview>
    )
  );
}
