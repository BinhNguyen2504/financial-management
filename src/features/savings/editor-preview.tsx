"use client";

import {
  decimalLabel,
  DialogChanges,
  DialogPreview,
} from "@/components/dialog-content";
import { fundNames } from "@/features/funds/content";

import { type useSavingsEditor } from "./use-savings-editor";

export function SavingsEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useSavingsEditor>;
}) {
  const {
    preview,
    tr,
    money,
    hidden,
    locale,
    busy,
    uncertain,
    fundsAccepted,
    setFundsAccepted,
  } = controller;
  const impact = preview?.result.fundImpact;

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
        {impact && (
          <div className="savings-fund-impact" role="alert">
            <h4>{tr("Giao dịch này làm giảm Quỹ an toàn")}</h4>
            <ul>
              {impact.funds.map((fund) => (
                <li key={fund.fundId}>
                  <strong>{tr(fundNames[fund.fundId])}</strong>
                  <span>
                    {money(fund.before)} → {money(fund.after)}
                  </span>
                  <span>
                    {BigInt(fund.missing) > 0n
                      ? tr("Còn thiếu {0} so với mục tiêu {1}.", {
                          0: money(fund.missing),
                          1: money(fund.target),
                        })
                      : tr("Vẫn đủ mục tiêu {0}.", { 0: money(fund.target) })}
                  </span>
                  {fund.sources.map((source, index) => (
                    <small key={index}>
                      {source.name}: {money(source.before)} →{" "}
                      {money(source.after)}
                    </small>
                  ))}
                </li>
              ))}
            </ul>
            <label>
              <input
                type="checkbox"
                checked={fundsAccepted}
                disabled={busy || uncertain}
                onChange={(e) => setFundsAccepted(e.target.checked)}
              />
              <span>{tr("Tôi đã hiểu và vẫn muốn lưu")}</span>
            </label>
          </div>
        )}
      </DialogPreview>
    )
  );
}
