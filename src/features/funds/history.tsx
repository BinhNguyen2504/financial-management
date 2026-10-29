"use client";

import { AnimatedDetails } from "@/components/animated-details";
import { useMoney } from "@/components/privacy";
import { StatusBadge } from "@/components/status-badge";
import { fundIds, type FundTransaction } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import { formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import { ChevronRight } from "lucide-react";
import { displayTime, fundNames, transactionNames } from "./content";

function TransactionSnapshot({
  transaction,
  view,
  label,
}: {
  transaction: FundTransaction;
  view: FundView;
  label: string;
}) {
  const money = useMoney();
  const { t: tr, locale, config: localize } = useI18n("funds");
  const place = (id: string) =>
    view.book?.locations.find((l) => l.id === id)?.name ?? "";
  return (
    <div className="fund-history-snapshot">
      <h4>{label}</h4>
      <div className="fund-history-transaction-heading">
        <strong>{localize(transactionNames)[transaction.kind]}</strong>
        <strong>{money(transaction.amount)}</strong>
      </div>
      <p>
        {fundNames[transaction.fundId]} · {place(transaction.locationId)}
      </p>
      {transaction.kind === "transfer" && (
        <p>
          → {fundNames[transaction.toFundId]} ·{" "}
          {place(transaction.toLocationId)}
        </p>
      )}
      <p className="fund-note">
        {displayTime(transaction.occurredAt, locale)} {tr("· Giờ Việt Nam")}
      </p>
      <p>{transaction.note || tr("Không có ghi chú")}</p>
    </div>
  );
}

export function FundHistory({ view }: { view: FundView }) {
  const { t: tr, locale, config: localize } = useI18n("funds");
  const money = useMoney();
  return (
    <section className="fund-history">
      <h3>{tr("Lịch sử thay đổi")}</h3>
      {[...(view.book?.audit ?? [])].reverse().map((a) => {
        const configuration = view.book?.configurations.find(
          (c) => c.sequence === a.version,
        );
        const revision = view.book?.revisions.find(
          (r) => r.sequence === a.version,
        );
        const previous = revision
          ? view.book?.revisions
              .filter(
                (r) =>
                  r.rootId === revision.rootId &&
                  r.sequence < revision.sequence,
              )
              .at(-1)
          : undefined;
        const title =
          a.action.type === "configure"
            ? tr("Thiết lập mục tiêu")
            : a.action.type === "saveLocation"
              ? tr("Cập nhật nơi giữ")
              : a.action.type === "postTransaction"
                ? revision?.transaction
                  ? localize(transactionNames)[revision.transaction.kind]
                  : tr("Ghi giao dịch")
                : revision?.transaction
                  ? tr("Sửa giao dịch")
                  : tr("Hủy giao dịch");
        const transaction = revision?.transaction ?? previous?.transaction;
        return (
          <AnimatedDetails key={a.version}>
            <summary>
              <ChevronRight
                className="fund-history-chevron"
                size={18}
                aria-hidden="true"
              />
              <span className="fund-history-summary">
                <strong>{title}</strong>
                <span className="fund-note">
                  {displayTime(a.at, locale)} {tr("· Giờ Việt Nam")} · #
                  {a.version}
                </span>
              </span>
              {transaction && (
                <strong className="fund-history-amount">
                  {money(transaction.amount)}
                </strong>
              )}
            </summary>
            <div className="fund-history-content">
              {configuration && (
                <>
                  <div className="fund-history-snapshot">
                    <h4>{tr("Mức sinh hoạt:")}</h4>
                    <strong>
                      {money(configuration.living.total)}
                      {tr("/tháng")}
                    </strong>
                    <p className="fund-note">
                      {tr("Nguồn mức sinh hoạt")} ·{" "}
                      {formatMonth(configuration.living.month, locale)} ·{" "}
                      {tr("Chi tiêu")} #{configuration.living.expenseVersion}
                    </p>
                    <dl className="fund-amount-rows">
                      {configuration.living.items.map((item) => (
                        <div key={item.jarId}>
                          <dt>{item.name}</dt>
                          <dd>{money(item.amount)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="fund-history-snapshot">
                    <h4>{tr("Hệ số:")}</h4>
                    <dl className="fund-amount-rows">
                      {fundIds.map((fund) => (
                        <div key={fund}>
                          <dt>{fundNames[fund]}</dt>
                          <dd>× {configuration.multipliers[fund]}</dd>
                        </div>
                      ))}
                    </dl>
                    <h4>{tr("Ưu tiên:")}</h4>
                    <ol>
                      {configuration.priority.map((fund) => (
                        <li key={fund}>{fundNames[fund]}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
              {a.action.type === "saveLocation" && (
                <div className="fund-history-snapshot">
                  <h4>{a.action.name}</h4>
                  <StatusBadge
                    tone={a.action.active ? "success" : "neutral"}
                    size="compact"
                  >
                    {a.action.active
                      ? tr("Đang sử dụng")
                      : tr("Đã ngừng sử dụng")}
                  </StatusBadge>
                </div>
              )}
              {previous?.transaction && (
                <TransactionSnapshot
                  label={tr("Trước")}
                  transaction={previous.transaction}
                  view={view}
                />
              )}
              {revision?.transaction && (
                <TransactionSnapshot
                  label={tr("Sau")}
                  transaction={revision.transaction}
                  view={view}
                />
              )}
              {revision && !revision.transaction && (
                <p className="fund-history-snapshot">
                  {tr("Đã hủy; giữ nguyên bản gốc trong lịch sử")}
                </p>
              )}
              {revision?.reason && (
                <p className="fund-history-reason">
                  <strong>{tr("Lý do:")}</strong> {revision.reason}
                </p>
              )}
            </div>
          </AnimatedDetails>
        );
      })}
    </section>
  );
}
