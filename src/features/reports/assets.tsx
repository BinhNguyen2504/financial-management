"use client";
import type { ReactNode } from "react";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatDecimal } from "@/i18n/format";
import type { Assets } from "@/domain/reports/model";

/** Recorded assets on the report date; `children` are the per-ledger figures behind the total. */
export function ReportAssets({
  assets,
  children,
}: {
  assets: Assets;
  children: ReactNode;
}) {
  const { t, locale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden();
  const percent = (value: string) =>
    hidden ? "••• %" : `${formatDecimal(value, locale)}%`;
  const warnings = [
    ...assets.reasons,
    ...(assets.sources.some((source) => source.stale)
      ? ["Tổng đang dùng một số định giá cũ."]
      : []),
    ...(assets.openingStale ? ["Số đầu kỳ dùng một số định giá cũ."] : []),
  ];
  return (
    <section
      className="panel reports-assets"
      aria-labelledby="reports-assets-title"
    >
      <header className="reports-card-heading">
        <h2 id="reports-assets-title">{t("Tài sản đã ghi nhận")}</h2>
        <span>
          {t("Tính đến ngày {date}", {
            date: formatDate(assets.asOf, locale),
          })}
        </span>
      </header>
      <p className="reports-asset-total">
        {assets.total === null ? "—" : money(assets.total)}
      </p>
      {assets.delta !== null && (
        <p className="reports-asset-change">
          {t("So với ngày {date}", {
            date: formatDate(assets.openingDate, locale),
          })}
          :{" "}
          <strong>
            {!hidden && BigInt(assets.delta) > 0n ? "+" : ""}
            {money(assets.delta)}
          </strong>
          {assets.percent !== null && ` (${percent(assets.percent)})`}
          <small>
            {t(
              "Gồm tiền góp hoặc rút, thay đổi định giá và số dư mới ghi trong kỳ; đây không phải lợi nhuận.",
            )}
          </small>
        </p>
      )}
      {assets.changeReason && (
        <p className="reports-asset-change">{t(assets.changeReason)}</p>
      )}
      {warnings.length > 0 && (
        <div>
          {warnings.map((warning) => (
            <p key={warning} className="reports-metric-warning">
              {t(warning)}
            </p>
          ))}
        </div>
      )}
      {children}
      {assets.notes.map((note) => (
        <p key={note} className="reports-asset-change">
          {t(note)}
        </p>
      ))}
      {assets.linked !== null && assets.linked !== "0" && (
        <p className="reports-asset-linked">
          <span>{t("Trừ phần Quỹ lấy từ Tiết kiệm (chỉ tính một lần)")}</span>
          <strong>
            {!hidden && "−"}
            {money(assets.linked)}
          </strong>
        </p>
      )}
      <h3>{t("Cơ cấu tài sản")}</h3>
      <ul className="reports-allocation">
        {assets.composition.map((item) => (
          <li key={item.id}>
            <span>{t(item.label)}</span>
            <strong>{item.value === null ? "—" : money(item.value)}</strong>
            <span className="reports-allocation-share">
              {item.share === null ? "—" : percent(item.share)}
            </span>
            <span className="reports-bar-track" aria-hidden="true">
              {!hidden && item.share !== null && (
                <span style={{ width: `${item.share}%` }} />
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="reports-note">
        {t(
          "Chỉ gồm Tiết kiệm, Đầu tư và Quỹ an toàn. Chưa trừ nợ nên không phải tài sản ròng. Tiền bạn tự nhập ở hai sổ vẫn có thể bị cộng trùng. Không gồm tiền còn trong hũ Chi tiêu và sổ riêng của Mục tiêu.",
        )}
      </p>
    </section>
  );
}
