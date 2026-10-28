"use client";

import { AnimatedDetails } from "@/components/animated-details";
import { formatMonth } from "@/i18n/format";

import { useI18n } from "@/i18n/provider";

import { type FundId } from "@/domain/funds/schema";

import {
  displayTime,
  fundNames,
  transactionNames as transactionNamesSource,
} from "./content";

import { type useFundEditor } from "./use-fund-editor";

function FundChangeTable({
  rows,
  money,
  hidden,
}: {
  rows: { label: string; before: string; after: string }[];
  money: (value: string) => string;
  hidden: boolean;
}) {
  const { t: tr } = useI18n("funds");

  if (!rows.length)
    return (
      <p className="fund-note">
        {tr("Không có số dư hoặc mục tiêu nào thay đổi.")}
      </p>
    );
  return (
    <div
      className="fund-change-table"
      role="table"
      aria-label={tr("Các giá trị thay đổi")}
    >
      <div className="fund-change-row fund-change-header" role="row">
        <span role="columnheader">{tr("Thông tin")}</span>
        <span role="columnheader">{tr("Trước")}</span>
        <span role="columnheader">Sau</span>
        <span role="columnheader">{tr("Chênh lệch")}</span>
      </div>
      {rows.map((row) => {
        const difference = BigInt(row.after) - BigInt(row.before);
        return (
          <div className="fund-change-row" role="row" key={row.label}>
            <strong role="cell">{row.label}</strong>
            <span role="cell">{money(row.before)}</span>
            <span role="cell">{money(row.after)}</span>
            <span role="cell">
              {hidden
                ? "•••••• ₫"
                : `${difference > 0n ? "+" : difference < 0n ? "−" : ""}${money((difference < 0n ? -difference : difference).toString())}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
export function FundEditorPreview({
  controller,
}: {
  controller: ReturnType<typeof useFundEditor>;
}) {
  const {
    preview,
    tr,
    mode,
    location,
    f,
    old,
    localize,
    money,
    changedFundRows,
    hidden,
    changedLocationRows,
    locale,
  } = controller;

  return (
    preview && (
      <section className="fund-preview" aria-label={tr("Xem trước thay đổi")}>
        <h3>{tr("Kiểm tra thay đổi")}</h3>
        <p className="fund-preview-summary">
          {mode.type === "configure"
            ? tr("Điều chỉnh mục tiêu Quỹ an toàn")
            : mode.type === "location"
              ? `${location?.name ?? tr("Thêm nơi giữ tiền")} → ${f.name} · ${f.active ? tr("Đang sử dụng") : tr("Ngừng sử dụng")}`
              : mode.type === "cancel"
                ? tr("Hủy {0}", {
                    0: old
                      ? localize(transactionNamesSource)[old.kind].toLowerCase()
                      : tr("giao dịch"),
                  })
                : `${localize(transactionNamesSource)[f.kind]} · ${fundNames[f.fundId as FundId]} · ${money(f.amount)}`}
        </p>
        <FundChangeTable
          rows={[
            ...(mode.type === "configure" &&
            (preview.result.beforeConfig?.living.total ?? "0") !==
              preview.result.afterConfig.living.total
              ? [
                  {
                    label: tr("Mức sinh hoạt / tháng"),
                    before: preview.result.beforeConfig?.living.total ?? "0",
                    after: preview.result.afterConfig.living.total,
                  },
                ]
              : []),
            ...changedFundRows,
          ]}
          money={money}
          hidden={hidden}
        />
        {(changedLocationRows.length > 0 ||
          mode.type === "configure" ||
          old) && (
          <AnimatedDetails className="fund-preview-details">
            <summary>{tr("Chi tiết giao dịch và nơi giữ tiền")}</summary>
            {old && (
              <p>
                {tr("Giao dịch trước:")}{" "}
                {localize(transactionNamesSource)[old.kind]} ·{" "}
                {fundNames[old.fundId]} · {money(old.amount)} ·{" "}
                {displayTime(old.occurredAt, locale)}
              </p>
            )}
            {mode.type === "configure" && (
              <p>
                {tr("Nguồn tháng")}{" "}
                {formatMonth(preview.result.afterConfig.living.month!, locale)}{" "}
                {tr("· Ưu tiên:")}{" "}
                {preview.result.afterConfig.priority
                  .map((key) => fundNames[key])
                  .join(" → ")}
              </p>
            )}
            {changedLocationRows.length > 0 && (
              <FundChangeTable
                rows={changedLocationRows}
                money={money}
                hidden={hidden}
              />
            )}
          </AnimatedDetails>
        )}
        <p className="fund-note">
          {tr("Chưa ghi dữ liệu. Kiểm tra nội dung rồi xác nhận lưu.")}
        </p>
      </section>
    )
  );
}
