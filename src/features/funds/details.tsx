"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";
import { ThemeText } from "@/components/theme-decoration";
import { positionKey } from "@/domain/funds/engine";
import { fundIds, type FundId } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { Pencil as EditCommandGlyph } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import {
  displayTime,
  fundNames,
  guides as guidesSource,
  transactionNames as transactionNamesSource,
} from "./content";
import type { EditorMode } from "./editor";
import { FundLedger } from "./ledger";
import { ProgressScene } from "./progress-scene";
export function FundGuide({ fund }: { fund: FundId }) {
  const { t: tr, config: localize, locale } = useI18n("funds");

  const guide = localize(guidesSource)[fund];
  return (
    <section className="fund-guide">
      <h3>{tr("Hiểu quỹ trước khi góp")}</h3>
      {[
        [tr("Khái niệm"), guide.concept],
        [tr("Nguyên tắc"), guide.principle],
        [tr("Cách xây dựng"), guide.build],
        [tr("Khi nào sử dụng"), guide.use],
        [tr("Cách bổ sung"), guide.replenish],
      ].map(([label, text]) => (
        <div key={label}>
          <h4>{label}</h4>
          <p>{text}</p>
        </div>
      ))}
      <p className="fund-note">
        {tr("Tìm hiểu thêm:")}{" "}
        <a
          href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/"
          target="_blank"
          rel="noreferrer"
        >
          {tr("Hướng dẫn CFPB")}
        </a>{" "}
        ·{" "}
        <a
          href="https://www.moneyhelper.org.uk/en/blog/everyday-money/sinking-funds-explained"
          target="_blank"
          rel="noreferrer"
        >
          Sinking Fund — MoneyHelper
        </a>
      </p>
    </section>
  );
}
export function FundLocations({
  view,
  onEdit,
  fundId,
}: {
  view: FundView;
  onEdit: (mode: EditorMode) => void;
  fundId?: FundId;
}) {
  const { t: tr, locale } = useI18n("funds");

  const money = useMoney();
  return (
    <section>
      <div className="fund-section-heading">
        <h3>{tr("Nơi giữ tiền")}</h3>
        <button
          className="expense-secondary"
          onClick={() => onEdit({ type: "location" })}
        >
          {tr("Thêm nơi giữ tiền")}
        </button>
      </div>
      <p className="fund-note">
        {tr(
          "Số dư riêng cho từng quỹ. Chuyển tiền giữa nơi giữ không làm tăng tổng dự phòng.",
        )}
      </p>
      {!view.book?.locations.length && (
        <p className="fund-empty">
          {tr(
            "Bắt đầu bằng một nơi bạn đang giữ tiền, như ngân hàng hoặc tiền mặt.",
          )}
        </p>
      )}
      {view.book?.locations.map((l) => (
        <article className="fund-location" key={l.id}>
          <div>
            <h4>{l.name}</h4>
            <small>
              {l.active ? tr("Đang sử dụng") : tr("Đã ngừng sử dụng")}
            </small>
          </div>
          <dl>
            {(fundId ? [fundId] : fundIds).map((k) => (
              <div key={k}>
                <dt>{fundNames[k]}</dt>
                <dd>
                  {money(view.state.balances[positionKey(k, l.id)] ?? "0")}
                </dd>
              </div>
            ))}
          </dl>
          <button
            className="expense-secondary"
            onClick={() => onEdit({ type: "location", id: l.id })}
          >
            <EditCommandGlyph size={17} aria-hidden="true" />
            {tr("Sửa")} {l.name}
          </button>
        </article>
      ))}
    </section>
  );
}
export function FundHistory({ view }: { view: FundView }) {
  const { t: tr, locale, config: localize } = useI18n("funds");

  const money = useMoney();
  return (
    <section className="fund-history">
      <h3>{tr("Lịch sử thay đổi")}</h3>
      {[...(view.book?.audit ?? [])].reverse().map((a) => {
        const c = view.book?.configurations.find(
            (c) => c.sequence === a.version,
          ),
          revision = view.book?.revisions.find((r) => r.sequence === a.version),
          previous = revision
            ? view.book?.revisions
                .filter(
                  (r) =>
                    r.rootId === revision.rootId &&
                    r.sequence < revision.sequence,
                )
                .at(-1)
            : null;
        return (
          <details key={a.version}>
            <summary>
              #{a.version} · {displayTime(a.at, locale)} ·{" "}
              {a.action.type === "configure"
                ? tr("Thiết lập mục tiêu")
                : a.action.type === "saveLocation"
                  ? tr("Cập nhật nơi giữ")
                  : a.action.type === "postTransaction"
                    ? tr("Ghi giao dịch")
                    : tr("Sửa / hủy giao dịch")}
            </summary>
            {c && (
              <>
                <p>
                  {tr("Mức sinh hoạt:")} {money(c.living.total)}
                  {tr("/tháng · Nguồn")} {formatMonth(c.living.month!, locale)}{" "}
                  {tr("· Chi tiêu #")}
                  {c.living.expenseVersion}
                </p>
                {c.living.items.map((i) => (
                  <p key={i.jarId}>
                    {i.name}: {money(i.amount)}
                  </p>
                ))}
                <p>
                  {tr("Hệ số:")}{" "}
                  {fundIds
                    .map((k) =>
                      tr("{0} × {1}", { 0: fundNames[k], 1: c.multipliers[k] }),
                    )
                    .join(" · ")}
                </p>
                <p>
                  {tr("Ưu tiên:")}{" "}
                  {c.priority.map((k) => fundNames[k]).join(" → ")}
                </p>
              </>
            )}
            {a.action.type === "saveLocation" && (
              <p>
                {a.action.name} ·{" "}
                {a.action.active ? tr("Đang sử dụng") : tr("Ngừng sử dụng")}
              </p>
            )}
            {previous?.transaction && (
              <p>
                {tr("Trước:")}{" "}
                {localize(transactionNamesSource)[previous.transaction.kind]} ·{" "}
                {money(previous.transaction.amount)} ·{" "}
                {displayTime(previous.transaction.occurredAt, locale)} ·{" "}
                {previous.transaction.note}
              </p>
            )}
            {revision && (
              <>
                <p>
                  Sau:{" "}
                  {revision.transaction
                    ? `${localize(transactionNamesSource)[revision.transaction.kind]} · ${money(revision.transaction.amount)} · ${displayTime(revision.transaction.occurredAt, locale)} · ${revision.transaction.note}`
                    : tr("Đã hủy; giữ nguyên bản gốc trong lịch sử")}
                </p>
                {revision.reason && (
                  <p>
                    {tr("Lý do:")} {revision.reason}
                  </p>
                )}
              </>
            )}
          </details>
        );
      })}
    </section>
  );
}
const tabs = ["Hướng dẫn", "Giao dịch", "Nơi giữ tiền", "Lịch sử"];
export function FundDetails({
  fund,
  view,
  onClose,
  onEdit,
}: {
  fund: FundId;
  view: FundView;
  onClose: () => void;
  onEdit: (mode: EditorMode) => void;
}) {
  const { t: tr, config: localize, locale } = useI18n("funds");
  const localizedTabs = localize(tabs);

  const [tab, setTab] = useState(0),
    id = useId(),
    money = useMoney(),
    state = view.state.funds.find((f) => f.id === fund)!;
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 4
        : event.key === "ArrowLeft"
          ? (index + 3) % 4
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 3
              : null;
    if (next !== null) {
      event.preventDefault();
      setTab(next);
      document
        .getElementById(`${id}-tab-${next}`)
        ?.focus({ preventScroll: true });
    }
  }
  return (
    <ExpenseModal
      title={fundNames[fund]}
      onClose={onClose}
      size="detail"
      footer={
        <div className="fund-actions">
          <button
            className="expense-secondary"
            onClick={() =>
              onEdit({ type: "transaction", fundId: fund, kind: "withdraw" })
            }
          >
            {tr("Rút tiền")}
          </button>
          <button
            className="expense-primary"
            onClick={() =>
              onEdit({ type: "transaction", fundId: fund, kind: "deposit" })
            }
          >
            {tr("Thêm tiền")}
          </button>
        </div>
      }
    >
      <div className="fund-detail-summary">
        <ProgressScene fund={fund} percent={state.percent} />
        <div>
          <p className="eyebrow">
            <ThemeText name={fund} />
          </p>
          <h3>
            {state.percent.replace(".", ",")}
            {tr("% đã chuẩn bị")}
          </h3>
          <p>
            {money(state.balance)} / {money(state.target)}
          </p>
        </div>
      </div>
      <ScrollTabs
        className="fund-tabs"
        role="tablist"
        aria-label={tr("Chi tiết quỹ")}
      >
        {localizedTabs.map((label, i) => (
          <button
            key={label}
            id={`${id}-tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onKeyDown={(e) => key(e, i)}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </ScrollTabs>
      {localizedTabs.map((label, i) => (
        <div
          key={label}
          id={`${id}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${i}`}
          hidden={tab !== i}
          tabIndex={0}
        >
          {i === 0 ? (
            <FundGuide fund={fund} />
          ) : i === 1 ? (
            <FundLedger view={view} fundId={fund} onEdit={onEdit} />
          ) : i === 2 ? (
            <FundLocations view={view} fundId={fund} onEdit={onEdit} />
          ) : (
            <FundHistory view={view} />
          )}
        </div>
      ))}
    </ExpenseModal>
  );
}
