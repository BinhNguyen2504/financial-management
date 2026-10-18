"use client";
import { useState } from "react";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import {
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
  decimalLabel,
} from "@/components/dialog-content";
import { activeTransactions, ruleAt } from "@/domain/savings/engine";
import type {
  CategoryPosition,
  SavingsTransaction,
  SavingsView,
} from "@/domain/savings/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { kindNames, transactionNames, type EditorMode } from "./editor";
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
  const money = useMoney(),
    hidden = useMoneyHidden();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const book = view.book;
  const name = (id: string | null) => {
    const category = book?.categories.find((c) => c.id === id);
    return category
      ? (ruleAt(category, view.state.asOf.slice(0, 7)) ?? category.rules[0])
          .name
      : "Bên ngoài";
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
        <p className="expense-muted">{result.label}</p>
        {result.quantity && (
          <p>
            {hidden
              ? "••••••"
              : `${result.quantity.startsWith("−") ? "−" : "+"}${decimalLabel(result.quantity.slice(1))}`}{" "}
            {p.unit}
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
            { label: "Ngày giao dịch", value: dateLabel(t.date) },
            { label: "Danh mục", value: name(t.categoryId) },
            ...("cashCategoryId" in t
              ? [{ label: "Ví liên quan", value: name(t.cashCategoryId) }]
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
                        ? "Giá vốn mở đầu"
                        : t.kind === "withdrawDeposit"
                          ? "Gốc rút"
                          : "Số tiền",
                    unitPrice: "Đơn giá",
                    fee: "Phí",
                    tax: "Thuế",
                    interest: "Tiền lãi",
                    reinvestInterest: "Lãi tái tục",
                  } as Record<string, string>
                )[key],
                value: money(String(value)),
              })),
            ...("quantity" in t
              ? [
                  {
                    label: "Khối lượng",
                    value: `${hidden ? "••••••" : decimalLabel(t.quantity)} ${unit}`,
                  },
                ]
              : []),
            ...("name" in t
              ? [
                  { label: "Tên sổ", value: t.name },
                  { label: "Đáo hạn", value: dateLabel(t.maturity) },
                  { label: "Kỳ hạn", value: t.term || "—" },
                ]
              : []),
            ...("contractId" in t
              ? [
                  {
                    label: "Sổ liên quan",
                    value:
                      view.state.contracts.find((c) => c.id === t.contractId)
                        ?.name ?? "Sổ trong lịch sử",
                  },
                ]
              : []),
            ...("capitalize" in t
              ? [
                  {
                    label: "Cách nhận lãi",
                    value: t.capitalize ? "Nhập gốc" : "Nhận tiền",
                  },
                ]
              : []),
          ]}
        />
        {t.kind === "sellGold" && (
          <DialogList
            items={t.allocations}
            rowKey={(allocation) => allocation.lotId}
            label="Các đợt vàng đã bán"
            columns={[
              {
                label: "Đợt vàng",
                render: (allocation) => {
                  const lot = view.state.lots.find(
                    (l) => l.id === allocation.lotId,
                  );
                  return lot ? dateLabel(lot.date) : "Đợt đã sửa / hủy";
                },
              },
              {
                label: "Lượng bán",
                numeric: true,
                render: (allocation) =>
                  `${hidden ? "••••••" : decimalLabel(allocation.quantity)} ${unit}`,
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
      label="Lịch sử giao dịch"
      getDate={({ t }) => t.date}
      searchText={({ t }) =>
        `${transactionNames[t.kind]} ${t.note} ${name(t.categoryId)} ${"cashCategoryId" in t ? name(t.cashCategoryId) : ""}`
      }
      filters={[
        {
          label: "Trạng thái",
          initial: "active",
          value: (r) => (r.cancelled ? "cancelled" : "active"),
          options: [
            { value: "active", label: "Đang có hiệu lực" },
            { value: "", label: "Tất cả" },
            { value: "cancelled", label: "Đã hủy" },
          ],
        },
        {
          label: "Loại giao dịch",
          value: ({ t }) => t.kind,
          options: [
            { value: "", label: "Tất cả" },
            ...[...new Set(rows.map(({ t }) => t.kind))].map((kind) => ({
              value: kind,
              label: transactionNames[kind],
            })),
          ],
        },
      ]}
      columns={[
        { label: "Ngày", render: ({ t }) => dateLabel(t.date) },
        {
          label: "Nội dung",
          render: ({ t, cancelled }) => (
            <>
              <strong>{transactionNames[t.kind]}</strong>
              {cancelled && <p>Đã hủy</p>}
              <p>
                {name(t.categoryId)}
                {"cashCategoryId" in t ? ` · ${name(t.cashCategoryId)}` : ""}
              </p>
              <DialogNote text={t.note} />
            </>
          ),
        },
        { label: "Ảnh hưởng", numeric: true, render: ({ t }) => impact(t) },
        {
          label: "Thao tác",
          render: ({ t }) => (
            <button
              className="expense-secondary"
              type="button"
              onClick={() => setTransactionId(t.id)}
            >
              Xem giao dịch
            </button>
          ),
        },
      ]}
    />
  );
  return (
    <>
      <ExpenseModal
        title={`Chi tiết ${p.name}`}
        size="detail"
        description={`${kindNames[p.kind]} · Đến ${dateLabel(view.state.asOf)}`}
        onClose={onClose}
      >
        <DialogSummary
          label={
            p.kind === "cash"
              ? "Số dư"
              : p.kind === "deposit"
                ? "Gốc đang gửi"
                : "Giá trị hiện tại"
          }
          value={p.value === null ? "Thiếu định giá" : money(p.value)}
        >
          {p.kind === "gold" && (
            <DialogFacts
              items={[
                {
                  label: "Khối lượng còn giữ",
                  value: `${hidden ? "••••••" : decimalLabel(p.quantity)} ${p.unit}`,
                },
                { label: "Giá vốn còn lại", value: money(p.cost) },
                {
                  label: "Lãi / lỗ chưa chốt",
                  value:
                    p.unrealized === null
                      ? "Thiếu định giá"
                      : money(p.unrealized),
                },
                {
                  label: "Giá bán lại tham chiếu",
                  value:
                    p.price === null
                      ? "Chưa có giá"
                      : `${money(p.price)} / ${p.unit}`,
                },
                {
                  label: "Ngày giá",
                  value: `${p.priceDate ? dateLabel(p.priceDate) : "Chưa có"}${p.stale ? " · Cần cập nhật" : ""}`,
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
                {transactionNames[kind]}
              </button>
            ))}
            {p.kind === "gold" && (
              <button
                type="button"
                className="expense-secondary"
                onClick={() => onEdit({ type: "price", categoryId: p.id })}
              >
                Cập nhật giá vàng
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
                    label: "Đợt vàng",
                    count: lots.filter((l) => l.quantity !== "0").length,
                    content: (
                      <DialogList
                        items={lots}
                        rowKey={(l) => l.id}
                        label="Các đợt vàng"
                        getDate={(l) => l.date}
                        filters={[
                          {
                            label: "Nắm giữ",
                            initial: "held",
                            value: (l) =>
                              l.quantity === "0" ? "sold" : "held",
                            options: [
                              { value: "held", label: "Còn nắm giữ" },
                              { value: "", label: "Tất cả" },
                              { value: "sold", label: "Đã bán hết" },
                            ],
                          },
                        ]}
                        columns={[
                          {
                            label: "Ngày mua / mở đầu",
                            render: (l) => dateLabel(l.date),
                          },
                          {
                            label: "Khối lượng còn lại",
                            numeric: true,
                            render: (l) =>
                              `${hidden ? "••••••" : decimalLabel(l.quantity)} ${p.unit}`,
                          },
                          {
                            label: "Giá vốn còn lại",
                            numeric: true,
                            render: (l) => money(l.cost),
                          },
                        ]}
                      />
                    ),
                  }
                : {
                    id: "holdings",
                    label: "Sổ tiền gửi",
                    count: contracts.filter((c) => c.principal !== "0").length,
                    content: (
                      <DialogList
                        items={contracts}
                        rowKey={(c) => c.id}
                        label="Sổ tiền gửi"
                        searchText={(c) => `${c.name} ${c.term}`}
                        filters={[
                          {
                            label: "Trạng thái sổ",
                            initial: "active",
                            value: (c) =>
                              c.principal === "0" ? "settled" : "active",
                            options: [
                              { value: "active", label: "Đang gửi" },
                              { value: "", label: "Tất cả" },
                              {
                                value: "settled",
                                label: "Đã tất toán / tái tục",
                              },
                            ],
                          },
                        ]}
                        columns={[
                          {
                            label: "Sổ / kỳ hạn",
                            render: (c) => (
                              <>
                                <strong>{c.name}</strong>
                                <p>{c.term}</p>
                                {c.previousId && (
                                  <p>
                                    Tái tục từ{" "}
                                    {contracts.find(
                                      (old) => old.id === c.previousId,
                                    )?.name ?? "sổ trước"}
                                  </p>
                                )}
                              </>
                            ),
                          },
                          {
                            label: "Ngày mở / đáo hạn",
                            render: (c) => (
                              <>
                                {dateLabel(c.opened)}
                                <p>Đáo hạn {dateLabel(c.maturity)}</p>
                              </>
                            ),
                          },
                          {
                            label: "Gốc còn lại",
                            numeric: true,
                            render: (c) => money(c.principal),
                          },
                          {
                            label: "Trạng thái",
                            render: (c) =>
                              c.principal === "0"
                                ? "Đã tất toán / tái tục"
                                : c.maturity <= view.state.asOf
                                  ? "Đã đến hạn"
                                  : "Đang gửi",
                          },
                        ]}
                      />
                    ),
                  },
              {
                id: "history",
                label: "Giao dịch",
                count: rows.filter((r) => !r.cancelled).length,
                content: history,
              },
            ]}
          />
        )}
      </ExpenseModal>
      {selectedRow && (
        <ExpenseModal
          title="Chi tiết giao dịch tiết kiệm"
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
                  Sửa giao dịch
                </button>
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={() =>
                    onEdit({ type: "void", transaction: selectedRow.t })
                  }
                >
                  Hủy giao dịch
                </button>
              </div>
            )
          }
        >
          <DialogSummary
            label={transactionNames[selectedRow.t.kind]}
            value={dateLabel(selectedRow.t.date)}
          >
            <p>
              {selectedRow.cancelled
                ? "Đã hủy · Không còn hiệu lực"
                : `Ảnh hưởng đến ${p.name}`}
            </p>
            {impact(selectedRow.t)}
          </DialogSummary>
          <DialogTabs
            tabs={[
              {
                id: "current",
                label: "Chi tiết",
                content: <>{transactionFacts(selectedRow.t)}</>,
              },
              {
                id: "revisions",
                label: "Lịch sử chỉnh sửa",
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
                    label="Lịch sử chỉnh sửa"
                    columns={[
                      { label: "Lần ghi", render: (r) => `#${r.sequence}` },
                      {
                        label: "Thay đổi",
                        render: (r) => (
                          <>
                            {r.transaction
                              ? transactionNames[r.transaction.kind]
                              : "Hủy giao dịch"}
                            <DialogNote text={r.reason} />
                            {r.transaction && (
                              <details className="dialog-note">
                                <summary>Xem dữ liệu tại lần ghi này</summary>
                                {transactionFacts(r.transaction)}
                              </details>
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
