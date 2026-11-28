"use client";
import { StatusBadge } from "@/components/status-badge";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";

import { useMoney } from "@/components/privacy";
import { ThemeText } from "@/components/theme-decoration";
import { positionKey } from "@/domain/funds/engine";
import { fundIds, type FundId } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import { Modal as ExpenseModal } from "@/components/modal";
import { Plus, Pencil as EditCommandGlyph } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { fundNames, guides as guidesSource } from "./content";
import { FundHistory } from "./history";
import { fundDisplay } from "./linked";
import type { EditorMode } from "./editor-config";
import { FundLedger } from "./ledger";
import { ProgressScene } from "./progress-scene";
export function FundGuide({ fund }: { fund: FundId }) {
  const { t: tr, config: localize } = useI18n("funds");

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
          className="external-link"
          href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/"
          target="_blank"
          rel="noreferrer"
        >
          {tr("Hướng dẫn CFPB")}
        </a>{" "}
        ·{" "}
        <a
          className="external-link"
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
  const { t: tr } = useI18n("funds");

  const money = useMoney();
  // A linked place belongs to one fund, so other funds do not list it.
  const places = (view.book?.locations ?? []).filter(
    (l) => !fundId || !l.savings || l.savings.fundId === fundId,
  );
  return (
    <section className="fund-locations">
      <div className="fund-section-heading">
        <h3>{tr("Nơi giữ tiền")}</h3>
        <button
          className="expense-secondary"
          onClick={() => onEdit({ type: "location", fundId })}
        >
          <Plus size={17} aria-hidden="true" />
          {tr("Thêm nơi giữ tiền")}
        </button>
      </div>
      <p className="fund-note">
        {tr(
          "Số dư riêng cho từng quỹ. Chuyển tiền giữa nơi giữ không làm tăng tổng dự phòng.",
        )}{" "}
        {tr(
          "Bạn có thể thêm nơi giữ riêng hoặc gắn một danh mục Tiết kiệm vào một quỹ.",
        )}
      </p>
      {!places.length && (
        <p className="fund-empty">
          {tr(
            "Bắt đầu bằng một nơi bạn đang giữ tiền, như ngân hàng hoặc tiền mặt.",
          )}
        </p>
      )}
      {places.map((l) => {
        const category = view.savings.find(
          (s) => s.categoryId === l.savings?.categoryId,
        );
        return (
          <article className="fund-location" key={l.id}>
            <div className="fund-location-heading">
              <div className="fund-location-identity">
                <h4>{l.name}</h4>
                <StatusBadge
                  size="compact"
                  tone={l.active ? "success" : "neutral"}
                >
                  {l.active ? tr("Đang sử dụng") : tr("Đã ngừng sử dụng")}
                </StatusBadge>
                {l.savings && (
                  <StatusBadge size="compact" tone="info">
                    {tr("Từ Tiết kiệm")}
                  </StatusBadge>
                )}
              </div>
              <button
                className="expense-secondary"
                aria-label={`${tr("Sửa")} ${l.name}`}
                onClick={() => onEdit({ type: "location", id: l.id })}
              >
                <EditCommandGlyph size={17} aria-hidden="true" />
                {tr("Sửa")}
              </button>
            </div>
            {l.savings && (
              <p className="fund-note">
                {category
                  ? `${tr("Danh mục Tiết kiệm")}: ${category.name}${category.active ? "" : ` · ${tr("Đã lưu trữ")}`}`
                  : tr(
                      "Danh mục Tiết kiệm này không còn; phần liên kết đang tính 0. Ngừng nơi giữ để gỡ liên kết.",
                    )}
              </p>
            )}
            <dl className="fund-amount-rows">
              {(l.savings
                ? [l.savings.fundId]
                : fundId
                  ? [fundId]
                  : fundIds
              ).map((k) => (
                <div key={k}>
                  <dt>{tr(fundNames[k])}</dt>
                  <dd>
                    {money(view.state.balances[positionKey(k, l.id)] ?? "0")}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
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
  const { t: tr, config: localize } = useI18n("funds");
  const localizedTabs = localize(tabs);

  const [tab, setTab] = useState(0),
    id = useId(),
    money = useMoney(),
    state = view.state.funds.find((f) => f.id === fund)!,
    display = fundDisplay(view, state);
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
      title={tr(fundNames[fund])}
      onClose={onClose}
      size="detail"
      footer={
        <>
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
        </>
      }
    >
      <div className="fund-detail-summary">
        <ProgressScene fund={fund} percent={display.percent} />
        <div>
          <p className="eyebrow">
            <ThemeText name={fund} />
          </p>
          <h3>
            {display.percent.replace(".", ",")}
            {tr("% đã chuẩn bị")}
          </h3>
          <p>
            {money(state.balance)} / {money(state.target)}
          </p>
          {display.places.length > 0 && (
            <p className="fund-note">
              {tr("Gồm {0} từ Tiết kiệm", { 0: money(display.fromSavings) })}
              {display.reached ? ` · ${tr("Đã đủ mức dự phòng")}` : ""}
            </p>
          )}
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
