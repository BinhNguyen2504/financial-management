"use client";
import {
  Pencil as EditCommandGlyph,
  Trash2 as DeleteCommandGlyph,
} from "lucide-react";
import { useMoney } from "@/components/privacy";
import {
  DialogChanges,
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
} from "@/components/dialog-content";
import { activeTransactions, ruleAt } from "@/domain/investments/engine";
import type {
  InvestmentTransaction,
  InvestmentView,
  Position,
} from "@/domain/investments/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { transactionNames, type EditorMode } from "./editor";

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
  const money = useMoney();
  const display = (v: string | null) =>
    v === null ? "Thiếu định giá" : money(v);
  const name = (id: string | null) => {
    const c = view.book?.categories.find((c) => c.id === id);
    return c ? (ruleAt(c, view.state.asOf) ?? c.rules[0]).name : "Bên ngoài";
  };
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
        (t.categoryId === p.id ||
          ("cashCategoryId" in t && t.cashCategoryId === p.id)),
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
      description={`Đến ${dateLabel(view.state.asOf)} · ${p.kind === "cash" ? "Tiền / ví" : "Đầu tư"}`}
      onClose={onClose}
    >
      <DialogSummary
        label={p.kind === "cash" ? "Số dư" : "Giá trị hiện tại"}
        value={display(p.value)}
      >
        {p.kind === "investment" && (
          <DialogFacts
            items={[
              { label: "Giá vốn còn lại", value: money(p.cost) },
              { label: "Lãi / lỗ chưa chốt", value: display(p.unrealized) },
              { label: "Lãi / lỗ đã chốt", value: money(p.realized) },
              {
                label: "Ngày định giá",
                value: `${p.valueDate ? dateLabel(p.valueDate) : "Chưa có"}${p.stale ? " · Từ kỳ trước" : ""}`,
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
              {transactionNames[kind]}
            </button>
          ))}
        </div>
      )}
      <DialogList
        items={effects}
        rowKey={(e) => e.id}
        label="Giao dịch liên quan"
        searchText={(e) =>
          `${transactionNames[e.kind]} ${e.note} ${e.counterparty} ${name(e.categoryId)} ${name("cashCategoryId" in e ? e.cashCategoryId : null)}`
        }
        getDate={(e) => e.date}
        filters={[
          {
            label: "Trạng thái",
            initial: "active",
            value: (e) => (e.cancelled ? "cancelled" : "active"),
            options: [
              { value: "active", label: "Đang có hiệu lực" },
              { value: "", label: "Tất cả" },
              { value: "cancelled", label: "Đã hủy" },
            ],
          },
          {
            label: "Loại giao dịch",
            value: (e) => e.kind,
            options: [
              { value: "", label: "Tất cả" },
              ...[...new Set(effects.map((e) => e.kind))].map((kind) => ({
                value: kind,
                label: transactionNames[kind],
              })),
            ],
          },
        ]}
        columns={[
          { label: "Ngày", render: (e) => dateLabel(e.date) },
          {
            label: "Nội dung",
            render: (e) => (
              <>
                <strong>{transactionNames[e.kind]}</strong>
                {e.cancelled && <p>Đã hủy · Không còn hiệu lực</p>}
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
              p.kind === "cash" ? "Biến động số dư" : "Giá trị sau giao dịch",
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
                : display(effect.after[p.id]?.value ?? null);
            },
          },
          {
            label: "Thao tác",
            render: (e) => (
              <button
                type="button"
                className="expense-secondary"
                onClick={() => onTransaction(e.id)}
              >
                Xem giao dịch
              </button>
            ),
          },
        ]}
      />
      <details className="dialog-secondary-section">
        <summary>Thông tin danh mục</summary>
        <DialogNote text={p.description || "Chưa có mô tả."} />
        <p>{p.active ? "Đang hoạt động" : "Đã lưu trữ"}</p>
      </details>
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
    return c ? (ruleAt(c, view.state.asOf) ?? c.rules[0]).name : "Danh mục";
  };
  const display = (v: string | null) =>
    v === null ? "Thiếu định giá" : money(v);
  const facts = (transaction: InvestmentTransaction) => (
    <>
      <DialogFacts
        items={[
          { label: "Ngày giao dịch", value: dateLabel(transaction.date) },
          { label: "Danh mục", value: name(transaction.categoryId) },
          ...("cashCategoryId" in transaction
            ? [
                {
                  label: "Ví liên quan",
                  value: transaction.cashCategoryId
                    ? name(transaction.cashCategoryId)
                    : "Bên ngoài",
                },
              ]
            : []),
          ...Object.entries(transaction)
            .filter(([key]) => key in fieldNames)
            .map(([key, value]) => ({
              label: fieldNames[key],
              value: money(String(value)),
            })),
          { label: "Đối tác", value: transaction.counterparty || "—" },
        ]}
      />
      <DialogNote text={transaction.note} />
    </>
  );
  if (!t) return null;
  return (
    <ExpenseModal
      title="Chi tiết giao dịch"
      size="detail"
      description={`${transactionNames[t.kind]} · ${name(t.categoryId)}`}
      onClose={onClose}
      footer={
        current && (
          <div className="expense-actions">
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ type: "revise", transaction: current })}
            >
              <EditCommandGlyph size={17} aria-hidden="true" />
              Sửa giao dịch
            </button>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ type: "cancel", transaction: current })}
            >
              <DeleteCommandGlyph size={17} aria-hidden="true" />
              Hủy giao dịch
            </button>
          </div>
        )
      }
    >
      <DialogSummary
        label={current ? "Giao dịch đang có hiệu lực" : "Giao dịch đã hủy"}
        value={
          "amount" in t ? money(t.amount) : "value" in t ? money(t.value) : "—"
        }
      >
        <p>
          {dateLabel(t.date)}
          {!current ? " · Không còn ảnh hưởng đến số dư" : ""}
        </p>
      </DialogSummary>
      <DialogTabs
        tabs={[
          {
            id: "current",
            label: "Chi tiết",
            content: (
              <>
                {facts(t)}
                {effect && (
                  <>
                    <h3 className="dialog-secondary-section">
                      Ảnh hưởng đang có hiệu lực
                    </h3>
                    <DialogFacts
                      items={[
                        {
                          label: "Tiền ròng giao dịch",
                          value: money(effect.net),
                        },
                        {
                          label: "Lãi / lỗ đã chốt",
                          value: money(effect.realized),
                        },
                      ]}
                    />
                    <DialogChanges
                      rows={Object.keys(effect.before).flatMap((categoryId) =>
                        (["cash", "cost", "value"] as const).map((field) => ({
                          key: `${categoryId}/${field}`,
                          label: `${name(categoryId)} · ${{ cash: "Tiền", cost: "Giá vốn", value: "Giá trị" }[field]}`,
                          before: display(effect.before[categoryId][field]),
                          after: display(effect.after[categoryId][field]),
                        })),
                      )}
                    />
                  </>
                )}
                {!effect && current && (
                  <p className="expense-notice">
                    Giao dịch sau ngày đang xem; chưa được tính vào số dư kỳ
                    này.
                  </p>
                )}
              </>
            ),
          },
          {
            id: "revisions",
            label: "Lịch sử chỉnh sửa",
            count: revisions.length,
            content: (
              <DialogList
                items={revisions}
                rowKey={(r) => r.id}
                label="Lịch sử chỉnh sửa"
                searchText={(r) => r.reason}
                columns={[
                  {
                    label: "Lần ghi",
                    render: (r) => (
                      <>
                        <strong>#{r.sequence}</strong>
                        <p>
                          {new Date(r.at).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </p>
                      </>
                    ),
                  },
                  {
                    label: "Nội dung thay đổi",
                    render: (r) => (
                      <>
                        <strong>
                          {r.transaction
                            ? transactionNames[r.transaction.kind]
                            : "Hủy giao dịch"}
                        </strong>
                        <DialogNote text={r.reason} />
                        {r.transaction && (
                          <details className="dialog-note">
                            <summary>Xem dữ liệu tại lần ghi này</summary>
                            {facts(r.transaction)}
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
  );
}
