"use client";
import { AnimatedDetails } from "@/components/animated-details";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";

import {
  DialogChanges,
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
} from "@/components/dialog-content";
import { useMoney } from "@/components/privacy";
import {
  activeTransactions,
  ruleAt,
  replay,
} from "@/domain/investments/engine";
import { portfolioPositions } from "@/domain/investments/portfolios";
import type {
  InvestmentTransaction,
  InvestmentView,
  Position,
} from "@/domain/investments/types";
import { Modal as ExpenseModal } from "@/components/modal";
import {
  Trash2 as DeleteCommandGlyph,
  Pencil as EditCommandGlyph,
} from "lucide-react";
import { transactionNames, type EditorMode } from "./editor-config";

const fieldNames: Record<string, string> = {
  amount: "Số tiền trước phí / thuế",
  cost: "Giá vốn",
  value: "Giá trị sau giao dịch",
  fee: "Phí",
  tax: "Thuế",
};
export function InvestmentDetails({
  view,
  position: p,
  onClose,
  onEdit,
  onTransaction,
}: {
  view: InvestmentView;
  position: Position;
  onClose(): void;
  onEdit(mode: EditorMode): void;
  onTransaction(id: string): void;
}) {
  const { t: tr, locale, config: localize } = useI18n("investments");

  const money = useMoney();
  const display = (v: string | null) =>
    v === null ? tr("Thiếu định giá") : money(v);
  const name = (id: string | null) => {
    const c = view.book?.categories.find((c) => c.id === id);
    return c
      ? (ruleAt(c, view.state.asOf) ?? c.rules[0]).name
      : tr("Bên ngoài");
  };
  const portfolio = view.portfolios.find((item) => item.id === p.id);
  const relatedIds = new Set([
    p.id,
    ...(portfolio?.wallets.map((w) => w.id) ?? []),
  ]);
  const live = view.book ? activeTransactions(view.book) : [];
  const latestCancelled = (view.book?.revisions ?? [])
    .filter(
      (r) => r.transaction && !live.some((l) => l.transaction.id === r.rootId),
    )
    .filter(
      (r, index, all) =>
        !all.slice(index + 1).some((other) => other.rootId === r.rootId),
    );
  const effects = [
    ...live.map((r) => ({
      ...r.transaction,
      sequence: r.sequence,
      cancelled: false,
    })),
    ...latestCancelled.map((r) => ({
      ...r.transaction!,
      sequence: r.sequence,
      cancelled: true,
    })),
  ]
    .filter(
      (t) =>
        t.date <= view.state.asOf &&
        (relatedIds.has(t.categoryId) ||
          ("cashCategoryId" in t &&
            !!t.cashCategoryId &&
            relatedIds.has(t.cashCategoryId))),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence);
  const kinds: InvestmentTransaction["kind"][] =
    p.kind === "cash"
      ? ["deposit", "withdraw", "transfer"]
      : ["buy", "sell", "valuation"];
  return (
    <ExpenseModal
      title={p.name}
      size="detail"
      description={tr("Đến {0} · {1}", {
        0: dateLabel(view.state.asOf, locale),
        1: p.kind === "cash" ? tr("Tiền / ví") : tr("Đầu tư"),
      })}
      onClose={onClose}
    >
      <DialogSummary
        label={p.kind === "cash" ? tr("Số dư") : tr("Giá trị hiện tại")}
        value={display(portfolio?.total ?? p.value)}
      >
        {p.kind === "investment" && (
          <DialogFacts
            items={[
              { label: tr("Vốn đang đầu tư"), value: money(p.cost) },
              { label: tr("Giá trị tài sản đã mua"), value: display(p.value) },
              { label: tr("Tiền chờ"), value: money(portfolio?.cash ?? "0") },
              {
                label: tr("Lãi/lỗ phần đang giữ"),
                value: display(p.unrealized),
              },
              {
                label: tr("Ngày định giá"),
                value: `${p.valueDate ? dateLabel(p.valueDate, locale) : tr("Chưa có")}${p.stale ? tr(" · Từ kỳ trước") : ""}`,
              },
            ]}
          />
        )}
      </DialogSummary>
      {p.active && (
        <div className="expense-actions">
          {kinds.map((kind) => (
            <button
              type="button"
              key={kind}
              className="expense-secondary"
              onClick={() =>
                onEdit({ type: "transaction", kind, categoryId: p.id })
              }
            >
              {localize(transactionNames)[kind]}
            </button>
          ))}
        </div>
      )}
      {portfolio && (
        <section className="dialog-secondary-section">
          <h3>{tr("Ví tiền chờ")}</h3>
          <p className="expense-muted">
            {tr(
              "Tiền chưa mua tài sản vẫn nằm trong tổng giá trị danh mục. Tiền bán về ví; chỉ rút mới đưa tiền ra khỏi danh mục.",
            )}
          </p>
          {portfolio.wallets.map((w) => (
            <article key={w.id} className="investment-wallet">
              <div>
                <h4>{w.name}</h4>
                <strong>{money(w.cash)}</strong>
              </div>
              <div className="expense-actions">
                {p.active &&
                  w.active &&
                  (
                    ["deposit", "withdraw", "transfer", "openingCash"] as const
                  ).map((kind) => (
                    <button
                      type="button"
                      className="expense-secondary"
                      key={kind}
                      onClick={() =>
                        onEdit({ type: "transaction", kind, categoryId: w.id })
                      }
                    >
                      {localize(transactionNames)[kind]}
                    </button>
                  ))}
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={() =>
                    onEdit({ type: "configure", categoryId: w.id })
                  }
                >
                  {tr("Sửa")}
                </button>
                {p.active && (
                  <button
                    type="button"
                    className="expense-secondary"
                    onClick={() =>
                      onEdit({
                        type: w.active ? "archive" : "restore",
                        categoryId: w.id,
                      })
                    }
                  >
                    {w.active ? tr("Xóa / lưu trữ") : tr("Khôi phục")}
                  </button>
                )}
              </div>
            </article>
          ))}
          {p.active && (
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ type: "create", parentCategoryId: p.id })}
            >
              {tr("Thêm ví tiền chờ")}
            </button>
          )}
        </section>
      )}
      <DialogList
        items={effects}
        rowKey={(e) => e.id}
        label={tr("Giao dịch liên quan")}
        searchText={(e) =>
          `${localize(transactionNames)[e.kind]} ${e.note} ${e.counterparty} ${name(e.categoryId)} ${name("cashCategoryId" in e ? e.cashCategoryId : null)}`
        }
        getDate={(e) => e.date}
        filters={[
          {
            label: tr("Trạng thái"),
            initial: "active",
            value: (e) => (e.cancelled ? "cancelled" : "active"),
            options: [
              { value: "active", label: tr("Đang có hiệu lực") },
              { value: "", label: tr("Tất cả") },
              { value: "cancelled", label: tr("Đã hủy") },
            ],
          },
          {
            label: tr("Loại giao dịch"),
            value: (e) => e.kind,
            options: [
              { value: "", label: tr("Tất cả") },
              ...[...new Set(effects.map((e) => e.kind))].map((kind) => ({
                value: kind,
                label: localize(transactionNames)[kind],
              })),
            ],
          },
        ]}
        columns={[
          { label: tr("Ngày"), render: (e) => dateLabel(e.date, locale) },
          {
            label: tr("Nội dung"),
            render: (e) => (
              <>
                <strong>{localize(transactionNames)[e.kind]}</strong>
                {e.cancelled && <p>{tr("Đã hủy · Không còn hiệu lực")}</p>}
                <p>
                  {name(e.categoryId)}
                  {"cashCategoryId" in e && e.cashCategoryId
                    ? ` · ${name(e.cashCategoryId)}`
                    : ""}
                </p>
                {e.counterparty && <p>{e.counterparty}</p>}
                <DialogNote text={e.note} />
              </>
            ),
          },
          {
            label:
              p.kind === "cash"
                ? tr("Biến động số dư")
                : tr("Tổng giá trị sau giao dịch"),
            numeric: true,
            render: (t) => {
              const effect = view.state.effects.find((e) => e.id === t.id);
              if (!effect) return "—";
              return p.kind === "cash"
                ? money(
                    (
                      BigInt(effect.after[p.id]?.cash ?? "0") -
                      BigInt(effect.before[p.id]?.cash ?? "0")
                    ).toString(),
                  )
                : display(
                    portfolioPositions(
                      view.book,
                      replay(view.book!, t.date, t.sequence),
                    ).find((item) => item.id === p.id)?.total ?? null,
                  );
            },
          },
          {
            label: tr("Thao tác"),
            render: (e) => (
              <button
                type="button"
                className="expense-secondary"
                onClick={() => onTransaction(e.id)}
              >
                {tr("Xem giao dịch")}
              </button>
            ),
          },
        ]}
      />
      <AnimatedDetails className="dialog-secondary-section">
        <summary>
          <span className="status-meta">
            <span>{tr("Thông tin danh mục")}</span>
            <StatusBadge size="compact" tone={p.active ? "success" : "neutral"}>
              {p.active ? tr("Đang hoạt động") : tr("Đã lưu trữ")}
            </StatusBadge>
          </span>
        </summary>
        <DialogNote text={p.description || tr("Chưa có mô tả.")} />
      </AnimatedDetails>
    </ExpenseModal>
  );
}

export function InvestmentTransactionDetails({
  view,
  id,
  onClose,
  onEdit,
}: {
  view: InvestmentView;
  id: string;
  onClose(): void;
  onEdit(mode: EditorMode): void;
}) {
  const {
    t: tr,
    locale,
    numberLocale,
    config: localize,
  } = useI18n("investments");
  const localizedFieldNames = localize(fieldNames);

  const money = useMoney();
  const revisions = (view.book?.revisions ?? [])
    .filter((r) => r.rootId === id)
    .slice()
    .reverse();
  const current = view.book
    ? activeTransactions(view.book).find((r) => r.transaction.id === id)
        ?.transaction
    : null;
  const t = current ?? revisions.find((r) => r.transaction)?.transaction;
  const effect = view.state.effects.find((e) => e.id === id);
  const name = (id: string) => {
    const c = view.book?.categories.find((c) => c.id === id);
    return c ? (ruleAt(c, view.state.asOf) ?? c.rules[0]).name : tr("Danh mục");
  };
  const display = (v: string | null) =>
    v === null ? tr("Thiếu định giá") : money(v);
  const facts = (transaction: InvestmentTransaction) => (
    <>
      <DialogFacts
        items={[
          {
            label: tr("Ngày giao dịch"),
            value: dateLabel(transaction.date, locale),
          },
          { label: tr("Danh mục"), value: name(transaction.categoryId) },
          ...("cashCategoryId" in transaction
            ? [
                {
                  label: tr("Ví liên quan"),
                  value: transaction.cashCategoryId
                    ? name(transaction.cashCategoryId)
                    : tr("Bên ngoài"),
                },
              ]
            : []),
          ...Object.entries(transaction)
            .filter(([key]) => key in localizedFieldNames)
            .map(([key, value]) => ({
              label: localizedFieldNames[key],
              value: money(String(value)),
            })),
          { label: tr("Đối tác"), value: transaction.counterparty || "—" },
        ]}
      />
      <DialogNote text={transaction.note} />
    </>
  );
  if (!t) return null;
  return (
    <ExpenseModal
      title={tr("Chi tiết giao dịch")}
      size="detail"
      description={`${localize(transactionNames)[t.kind]} · ${name(t.categoryId)}`}
      onClose={onClose}
      footer={
        current && (
          <>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ type: "revise", transaction: current })}
            >
              <EditCommandGlyph size={17} aria-hidden="true" />
              {tr("Sửa giao dịch")}
            </button>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ type: "cancel", transaction: current })}
            >
              <DeleteCommandGlyph size={17} aria-hidden="true" />
              {tr("Hủy giao dịch")}
            </button>
          </>
        )
      }
    >
      <DialogSummary
        label={
          current ? tr("Giao dịch đang có hiệu lực") : tr("Giao dịch đã hủy")
        }
        value={
          "amount" in t ? money(t.amount) : "value" in t ? money(t.value) : "—"
        }
      >
        <p>
          {dateLabel(t.date, locale)}
          {!current ? tr(" · Không còn ảnh hưởng đến số dư") : ""}
        </p>
      </DialogSummary>
      <DialogTabs
        tabs={[
          {
            id: "current",
            label: tr("Chi tiết"),
            content: (
              <>
                {facts(t)}
                {effect && (
                  <>
                    <h3 className="dialog-secondary-section">
                      {tr("Ảnh hưởng đang có hiệu lực")}
                    </h3>
                    <DialogFacts
                      items={[
                        {
                          label: tr("Tiền ròng giao dịch"),
                          value: money(effect.net),
                        },
                      ]}
                    />
                    <DialogChanges
                      rows={Object.keys(effect.before).flatMap((categoryId) =>
                        (["cash", "cost", "value"] as const).map((field) => ({
                          key: `${categoryId}/${field}`,
                          label: `${name(categoryId)} · ${{ cash: tr("Tiền"), cost: tr("Giá vốn"), value: tr("Giá trị") }[field]}`,
                          before: display(effect.before[categoryId][field]),
                          after: display(effect.after[categoryId][field]),
                        })),
                      )}
                    />
                  </>
                )}
                {!effect && current && (
                  <p className="expense-notice">
                    {tr(
                      "Giao dịch sau ngày đang xem; chưa được tính vào số dư kỳ này.",
                    )}
                  </p>
                )}
              </>
            ),
          },
          {
            id: "revisions",
            label: tr("Lịch sử chỉnh sửa"),
            count: revisions.length,
            content: (
              <DialogList
                items={revisions}
                rowKey={(r) => r.id}
                label={tr("Lịch sử chỉnh sửa")}
                searchText={(r) => r.reason}
                columns={[
                  {
                    label: tr("Lần ghi"),
                    render: (r) => (
                      <>
                        <strong>#{r.sequence}</strong>
                        <p>
                          {new Date(r.at).toLocaleString(numberLocale, {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </p>
                      </>
                    ),
                  },
                  {
                    label: tr("Nội dung thay đổi"),
                    render: (r) => (
                      <>
                        <strong>
                          {r.transaction
                            ? localize(transactionNames)[r.transaction.kind]
                            : tr("Hủy giao dịch")}
                        </strong>
                        <DialogNote text={r.reason} />
                        {r.transaction && (
                          <AnimatedDetails className="dialog-note">
                            <summary>
                              {tr("Xem dữ liệu tại lần ghi này")}
                            </summary>
                            {facts(r.transaction)}
                          </AnimatedDetails>
                        )}
                      </>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </ExpenseModal>
  );
}
