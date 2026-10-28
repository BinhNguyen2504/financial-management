"use client";
import { AnimatedDetails } from "@/components/animated-details";
import { useI18n } from "@/i18n/provider";

import {
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
  decimalLabel,
} from "@/components/dialog-content";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { activeTransactions, ruleAt } from "@/domain/savings/engine";
import type {
  CategoryPosition,
  SavingsTransaction,
  SavingsView,
} from "@/domain/savings/types";
import { Modal as ExpenseModal } from "@/components/modal";
import {
  Trash2 as DeleteCommandGlyph,
  Pencil as EditCommandGlyph,
} from "lucide-react";
import { useState } from "react";
import { kindNames, transactionNames, type EditorMode } from "./editor-config";
import { savingsImpact } from "./presentation";

export function SavingsDetails({
  view,
  position: p,
  onClose,
  onEdit,
}: {
  view: SavingsView;
  position: CategoryPosition;
  onClose(): void;
  onEdit(mode: EditorMode): void;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");

  const money = useMoney(),
    hidden = useMoneyHidden();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const book = view.book;
  const name = (id: string | null) => {
    const category = book?.categories.find((c) => c.id === id);
    return category
      ? (ruleAt(category, view.state.asOf.slice(0, 7)) ?? category.rules[0])
          .name
      : tr("Bên ngoài");
  };
  const live = book ? activeTransactions(book) : [];
  const cancelled = (book?.revisions ?? [])
    .filter(
      (r) => r.transaction && !live.some((l) => l.transaction.id === r.rootId),
    )
    .filter(
      (r, index, all) =>
        !all.slice(index + 1).some((other) => other.rootId === r.rootId),
    );
  const rows = [
    ...live.map((r) => ({
      t: r.transaction,
      sequence: r.sequence,
      cancelled: false,
    })),
    ...cancelled.map((r) => ({
      t: r.transaction!,
      sequence: r.sequence,
      cancelled: true,
    })),
  ]
    .filter(
      ({ t }) =>
        t.date <= view.state.asOf &&
        (t.categoryId === p.id ||
          ("cashCategoryId" in t && t.cashCategoryId === p.id)),
    )
    .sort(
      (a, b) => b.t.date.localeCompare(a.t.date) || b.sequence - a.sequence,
    );
  const selectedRow = rows.find(({ t }) => t.id === transactionId);
  const lots = view.state.lots
    .filter((l) => l.categoryId === p.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const contracts = view.state.contracts
    .filter((c) => c.categoryId === p.id)
    .sort(
      (a, b) => b.opened.localeCompare(a.opened) || b.id.localeCompare(a.id),
    );
  const actions: SavingsTransaction["kind"][] =
    p.kind === "cash"
      ? ["deposit", "withdraw", "transfer"]
      : p.kind === "gold"
        ? ["buyGold", "sellGold"]
        : ["openDeposit", "withdrawDeposit", "interest", "rollover"];
  const impact = (t: SavingsTransaction) => {
    const result = savingsImpact(
      t,
      view.state.effects.find((e) => e.id === t.id),
      p,
    );
    return (
      <>
        <strong>{result.amount === null ? "—" : money(result.amount)}</strong>
        <p className="expense-muted">{tr(result.label)}</p>
        {result.quantity && (
          <p>
            {hidden
              ? "••••••"
              : `${result.quantity.startsWith("−") ? "−" : "+"}${decimalLabel(result.quantity.slice(1), locale)}`}{" "}
            {tr(p.unit ?? "")}
          </p>
        )}
      </>
    );
  };
  const transactionFacts = (t: SavingsTransaction) => {
    const unit =
      book?.categories.find((category) => category.id === t.categoryId)?.unit ??
      "";
    return (
      <>
        <DialogFacts
          items={[
            { label: tr("Ngày giao dịch"), value: dateLabel(t.date, locale) },
            { label: tr("Danh mục"), value: name(t.categoryId) },
            ...("cashCategoryId" in t
              ? [{ label: tr("Ví liên quan"), value: name(t.cashCategoryId) }]
              : []),
            ...Object.entries(t)
              .filter(([key]) =>
                [
                  "amount",
                  "unitPrice",
                  "fee",
                  "tax",
                  "interest",
                  "reinvestInterest",
                ].includes(key),
              )
              .map(([key, value]) => ({
                label: (
                  {
                    amount:
                      t.kind === "openingGold"
                        ? tr("Giá vốn mở đầu")
                        : t.kind === "withdrawDeposit"
                          ? tr("Gốc rút")
                          : tr("Số tiền"),
                    unitPrice: tr("Đơn giá"),
                    fee: tr("Phí"),
                    tax: tr("Thuế"),
                    interest: tr("Tiền lãi"),
                    reinvestInterest: tr("Lãi tái tục"),
                  } as Record<string, string>
                )[key],
                value: money(String(value)),
              })),
            ...("quantity" in t
              ? [
                  {
                    label: tr("Khối lượng"),
                    value: `${hidden ? "••••••" : decimalLabel(t.quantity, locale)} ${tr(unit)}`,
                  },
                ]
              : []),
            ...("name" in t
              ? [
                  { label: tr("Tên sổ"), value: t.name },
                  {
                    label: tr("Đáo hạn"),
                    value: dateLabel(t.maturity, locale),
                  },
                  { label: tr("Kỳ hạn"), value: t.term || "—" },
                ]
              : []),
            ...("contractId" in t
              ? [
                  {
                    label: tr("Sổ liên quan"),
                    value:
                      view.state.contracts.find((c) => c.id === t.contractId)
                        ?.name ?? tr("Sổ trong lịch sử"),
                  },
                ]
              : []),
            ...("capitalize" in t
              ? [
                  {
                    label: tr("Cách nhận lãi"),
                    value: t.capitalize ? tr("Nhập gốc") : tr("Nhận tiền"),
                  },
                ]
              : []),
          ]}
        />
        {t.kind === "sellGold" && (
          <DialogList
            items={t.allocations}
            rowKey={(allocation) => allocation.lotId}
            label={tr("Các đợt vàng đã bán")}
            columns={[
              {
                label: tr("Đợt vàng"),
                render: (allocation) => {
                  const lot = view.state.lots.find(
                    (l) => l.id === allocation.lotId,
                  );
                  return lot
                    ? dateLabel(lot.date, locale)
                    : tr("Đợt đã sửa / hủy");
                },
              },
              {
                label: tr("Lượng bán"),
                numeric: true,
                render: (allocation) =>
                  `${hidden ? "••••••" : decimalLabel(allocation.quantity, locale)} ${tr(unit)}`,
              },
            ]}
          />
        )}
        <DialogNote text={t.note} />
      </>
    );
  };
  const history = (
    <DialogList
      items={rows}
      rowKey={({ t }) => t.id}
      label={tr("Lịch sử giao dịch")}
      getDate={({ t }) => t.date}
      searchText={({ t }) =>
        `${localize(transactionNames)[t.kind]} ${t.note} ${name(t.categoryId)} ${"cashCategoryId" in t ? name(t.cashCategoryId) : ""}`
      }
      filters={[
        {
          label: tr("Trạng thái"),
          initial: "active",
          value: (r) => (r.cancelled ? "cancelled" : "active"),
          options: [
            { value: "active", label: tr("Đang có hiệu lực") },
            { value: "", label: tr("Tất cả") },
            { value: "cancelled", label: tr("Đã hủy") },
          ],
        },
        {
          label: tr("Loại giao dịch"),
          value: ({ t }) => t.kind,
          options: [
            { value: "", label: tr("Tất cả") },
            ...[...new Set(rows.map(({ t }) => t.kind))].map((kind) => ({
              value: kind,
              label: localize(transactionNames)[kind],
            })),
          ],
        },
      ]}
      columns={[
        { label: tr("Ngày"), render: ({ t }) => dateLabel(t.date, locale) },
        {
          label: tr("Nội dung"),
          render: ({ t, cancelled }) => (
            <>
              <strong>{localize(transactionNames)[t.kind]}</strong>
              {cancelled && <p>{tr("Đã hủy")}</p>}
              <p>
                {name(t.categoryId)}
                {"cashCategoryId" in t ? ` · ${name(t.cashCategoryId)}` : ""}
              </p>
              <DialogNote text={t.note} />
            </>
          ),
        },
        { label: tr("Ảnh hưởng"), numeric: true, render: ({ t }) => impact(t) },
        {
          label: tr("Thao tác"),
          render: ({ t }) => (
            <button
              className="expense-secondary"
              type="button"
              onClick={() => setTransactionId(t.id)}
            >
              {tr("Xem giao dịch")}
            </button>
          ),
        },
      ]}
    />
  );
  return (
    <>
      <ExpenseModal
        title={tr("Chi tiết {0}", { 0: p.name })}
        size="detail"
        description={tr("{0} · Đến {1}", {
          0: localize(kindNames)[p.kind],
          1: dateLabel(view.state.asOf, locale),
        })}
        onClose={onClose}
      >
        <DialogSummary
          label={
            p.kind === "cash"
              ? tr("Số dư")
              : p.kind === "deposit"
                ? tr("Gốc đang gửi")
                : tr("Giá trị hiện tại")
          }
          value={p.value === null ? tr("Thiếu định giá") : money(p.value)}
        >
          {p.kind === "gold" && (
            <DialogFacts
              items={[
                {
                  label: tr("Khối lượng còn giữ"),
                  value: `${hidden ? "••••••" : decimalLabel(p.quantity, locale)} ${tr(p.unit ?? "")}`,
                },
                { label: tr("Giá vốn còn lại"), value: money(p.cost) },
                {
                  label: tr("Lãi / lỗ chưa chốt"),
                  value:
                    p.unrealized === null
                      ? tr("Thiếu định giá")
                      : money(p.unrealized),
                },
                {
                  label: tr("Giá bán lại tham chiếu"),
                  value:
                    p.price === null
                      ? tr("Chưa có giá")
                      : `${money(p.price)} / ${tr(p.unit ?? "")}`,
                },
                {
                  label: tr("Ngày giá"),
                  value: `${p.priceDate ? dateLabel(p.priceDate, locale) : tr("Chưa có")}${p.stale ? tr(" · Cần cập nhật") : ""}`,
                },
              ]}
            />
          )}
          <DialogNote text={p.description} />
        </DialogSummary>
        {p.active && (
          <div className="expense-actions">
            {actions.map((kind) => (
              <button
                key={kind}
                type="button"
                className="expense-secondary"
                onClick={() =>
                  onEdit({ type: "transaction", categoryId: p.id, kind })
                }
              >
                {localize(transactionNames)[kind]}
              </button>
            ))}
            {p.kind === "gold" && (
              <button
                type="button"
                className="expense-secondary"
                onClick={() => onEdit({ type: "price", categoryId: p.id })}
              >
                {tr("Cập nhật giá vàng")}
              </button>
            )}
          </div>
        )}
        {p.kind === "cash" ? (
          history
        ) : (
          <DialogTabs
            tabs={[
              p.kind === "gold"
                ? {
                    id: "holdings",
                    label: tr("Đợt vàng"),
                    count: lots.filter((l) => l.quantity !== "0").length,
                    content: (
                      <DialogList
                        items={lots}
                        rowKey={(l) => l.id}
                        label={tr("Các đợt vàng")}
                        getDate={(l) => l.date}
                        filters={[
                          {
                            label: tr("Nắm giữ"),
                            initial: "held",
                            value: (l) =>
                              l.quantity === "0" ? "sold" : "held",
                            options: [
                              { value: "held", label: tr("Còn nắm giữ") },
                              { value: "", label: tr("Tất cả") },
                              { value: "sold", label: tr("Đã bán hết") },
                            ],
                          },
                        ]}
                        columns={[
                          {
                            label: tr("Ngày mua / mở đầu"),
                            render: (l) => dateLabel(l.date, locale),
                          },
                          {
                            label: tr("Khối lượng còn lại"),
                            numeric: true,
                            render: (l) =>
                              `${hidden ? "••••••" : decimalLabel(l.quantity, locale)} ${tr(p.unit ?? "")}`,
                          },
                          {
                            label: tr("Giá vốn còn lại"),
                            numeric: true,
                            render: (l) => money(l.cost),
                          },
                        ]}
                      />
                    ),
                  }
                : {
                    id: "holdings",
                    label: tr("Sổ tiền gửi"),
                    count: contracts.filter((c) => c.principal !== "0").length,
                    content: (
                      <DialogList
                        items={contracts}
                        rowKey={(c) => c.id}
                        label={tr("Sổ tiền gửi")}
                        searchText={(c) => `${c.name} ${c.term}`}
                        filters={[
                          {
                            label: tr("Trạng thái sổ"),
                            initial: "active",
                            value: (c) =>
                              c.principal === "0" ? "settled" : "active",
                            options: [
                              { value: "active", label: tr("Đang gửi") },
                              { value: "", label: tr("Tất cả") },
                              {
                                value: "settled",
                                label: tr("Đã tất toán / tái tục"),
                              },
                            ],
                          },
                        ]}
                        columns={[
                          {
                            label: tr("Sổ / kỳ hạn"),
                            render: (c) => (
                              <>
                                <strong>{c.name}</strong>
                                <p>{c.term}</p>
                                {c.previousId && (
                                  <p>
                                    {tr("Tái tục từ")}{" "}
                                    {contracts.find(
                                      (old) => old.id === c.previousId,
                                    )?.name ?? tr("sổ trước")}
                                  </p>
                                )}
                              </>
                            ),
                          },
                          {
                            label: tr("Ngày mở / đáo hạn"),
                            render: (c) => (
                              <>
                                {dateLabel(c.opened, locale)}
                                <p>
                                  {tr("Đáo hạn")}{" "}
                                  {dateLabel(c.maturity, locale)}
                                </p>
                              </>
                            ),
                          },
                          {
                            label: tr("Gốc còn lại"),
                            numeric: true,
                            render: (c) => money(c.principal),
                          },
                          {
                            label: tr("Trạng thái"),
                            render: (c) =>
                              c.principal === "0"
                                ? tr("Đã tất toán / tái tục")
                                : c.maturity <= view.state.asOf
                                  ? tr("Đã đến hạn")
                                  : tr("Đang gửi"),
                          },
                        ]}
                      />
                    ),
                  },
              {
                id: "history",
                label: tr("Giao dịch"),
                count: rows.filter((r) => !r.cancelled).length,
                content: history,
              },
            ]}
          />
        )}
      </ExpenseModal>
      {selectedRow && (
        <ExpenseModal
          title={tr("Chi tiết giao dịch tiết kiệm")}
          size="detail"
          onClose={() => setTransactionId(null)}
          footer={
            !selectedRow.cancelled && (
              <div className="expense-actions">
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={() =>
                    onEdit({ type: "transaction", transaction: selectedRow.t })
                  }
                >
                  <EditCommandGlyph size={17} aria-hidden="true" />
                  {tr("Sửa giao dịch")}
                </button>
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={() =>
                    onEdit({ type: "void", transaction: selectedRow.t })
                  }
                >
                  <DeleteCommandGlyph size={17} aria-hidden="true" />
                  {tr("Hủy giao dịch")}
                </button>
              </div>
            )
          }
        >
          <DialogSummary
            label={localize(transactionNames)[selectedRow.t.kind]}
            value={dateLabel(selectedRow.t.date, locale)}
          >
            <p>
              {selectedRow.cancelled
                ? tr("Đã hủy · Không còn hiệu lực")
                : tr("Ảnh hưởng đến {0}", { 0: p.name })}
            </p>
            {impact(selectedRow.t)}
          </DialogSummary>
          <DialogTabs
            tabs={[
              {
                id: "current",
                label: tr("Chi tiết"),
                content: <>{transactionFacts(selectedRow.t)}</>,
              },
              {
                id: "revisions",
                label: tr("Lịch sử chỉnh sửa"),
                count: book?.revisions.filter(
                  (r) => r.rootId === selectedRow.t.id,
                ).length,
                content: (
                  <DialogList
                    items={(book?.revisions ?? [])
                      .filter((r) => r.rootId === selectedRow.t.id)
                      .slice()
                      .reverse()}
                    rowKey={(r) => r.id}
                    label={tr("Lịch sử chỉnh sửa")}
                    columns={[
                      { label: tr("Lần ghi"), render: (r) => `#${r.sequence}` },
                      {
                        label: tr("Thay đổi"),
                        render: (r) => (
                          <>
                            {r.transaction
                              ? localize(transactionNames)[r.transaction.kind]
                              : tr("Hủy giao dịch")}
                            <DialogNote text={r.reason} />
                            {r.transaction && (
                              <AnimatedDetails className="dialog-note">
                                <summary>
                                  {tr("Xem dữ liệu tại lần ghi này")}
                                </summary>
                                {transactionFacts(r.transaction)}
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
      )}
    </>
  );
}
