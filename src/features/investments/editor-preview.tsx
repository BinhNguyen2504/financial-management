"use client";

import { DialogChanges, DialogPreview } from "@/components/dialog-content";

import { type useInvestmentEditor } from "./use-investment-editor";

export function InvestmentEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useInvestmentEditor>;
}) {
  const { preview, tr, money } = controller;

  return (
    preview && (
      <DialogPreview className="investment-preview">
        <h3>{tr("Xem trước thay đổi")}</h3>
        <DialogChanges
          numeric
          rows={[
            {
              key: "total",
              label: tr("Tổng tài sản"),
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
              return (["cost", "value", "realized"] as const)
                .filter((field) => before?.[field] !== p[field])
                .map((field) => ({
                  key: `${p.id}/${field}`,
                  label: `${p.name} · ${{ cost: tr("Giá vốn"), value: tr("Giá trị"), realized: tr("Lãi / lỗ đã chốt") }[field]}`,
                  before:
                    before?.[field] === null
                      ? tr("Thiếu định giá")
                      : money(before?.[field] ?? "0"),
                  after:
                    p[field] === null ? tr("Thiếu định giá") : money(p[field]),
                }));
            }),
          ]}
        />
      </DialogPreview>
    )
  );
}
