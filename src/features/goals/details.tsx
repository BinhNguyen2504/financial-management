"use client";
import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { DialogList } from "@/components/dialog-content";
import { ScrollTabs } from "@/components/scroll-tabs";
import { AnimatedDetails } from "@/components/animated-details";
import { useMoney } from "@/components/privacy";
import { formatDate, formatMonth, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import {
  activeTransactions,
  sourceKey,
  type GoalView,
} from "@/domain/goals/engine";
import type { Goal, GoalAction } from "@/domain/goals/schema";
import {
  kindNames,
  sourceNames,
  editGoal,
  postGoal,
  statusNames,
} from "./editor-config";

export function GoalDetails({
  goal,
  view,
  onClose,
  onEdit,
}: {
  goal: Goal;
  view: GoalView;
  onClose(): void;
  onEdit(action: GoalAction): void;
}) {
  const { t: tr, locale } = useI18n("goals"),
    money = useMoney(),
    [tab, setTab] = useState("progress");
  const book = view.book!,
    state = view.states.find((s) => s.id === goal.id)!;
  const time = (v: string) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(v));
  const history = book.audit.filter((a) =>
    a.action.type === "saveGoal"
      ? a.action.goal.id === goal.id
      : a.action.type === "setStatus"
        ? a.action.goalId === goal.id
        : a.action.type === "reorder"
          ? true
          : a.action.type === "postTransaction"
            ? a.action.transaction.goalId === goal.id ||
              a.action.transaction.toGoalId === goal.id
            : book.revisions.some(
                (r) =>
                  r.rootId ===
                    (a.action.type === "reviseTransaction"
                      ? a.action.transactionId
                      : "") &&
                  (r.transaction?.goalId === goal.id ||
                    r.transaction?.toGoalId === goal.id),
              ),
  );
  return (
    <Modal
      title={goal.name}
      size="detail"
      stableTabs
      onClose={onClose}
      footer={
        <>
          <button className="expense-secondary" onClick={onClose}>
            {tr("Đóng")}
          </button>
          {["active", "paused"].includes(goal.status) && (
            <button
              className="expense-secondary"
              onClick={() => onEdit(editGoal(goal))}
            >
              {tr("Điều chỉnh mục tiêu")}
            </button>
          )}
          {goal.mode === "ledger" && goal.status !== "archived" && (
            <button
              className="expense-primary"
              onClick={() =>
                onEdit(postGoal(goal.id, goal.status === "active"))
              }
            >
              {tr("Ghi giao dịch")}
            </button>
          )}
        </>
      }
    >
      <ScrollTabs className="goal-tabs" aria-label={tr("Chi tiết mục tiêu")}>
        {[
          ["progress", "Tiến độ và kế hoạch"],
          ["source", goal.mode === "ledger" ? "Giao dịch" : "Nguồn liên kết"],
          ["history", "Lịch sử"],
        ].map(([id, label]) => (
          <button
            key={id}
            className="expense-secondary"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {tr(label)}
          </button>
        ))}
      </ScrollTabs>
      {tab === "progress" && (
        <section className="goal-detail">
          <p>{tr(statusNames[goal.status])}</p>
          <dl className="goal-facts">
            <dt>{tr("Đã đạt")}</dt>
            <dd>
              {state.current === null
                ? tr("Chưa đủ dữ liệu")
                : money(state.current)}
            </dd>
            <dt>{tr("Số tiền đích")}</dt>
            <dd>{money(goal.target)}</dd>
            <dt>{tr("Còn thiếu")}</dt>
            <dd>{state.remaining === null ? "—" : money(state.remaining)}</dd>
            <dt>{tr("Hạn hoàn thành")}</dt>
            <dd>
              {goal.deadline
                ? formatDate(goal.deadline, locale)
                : tr("Không đặt hạn")}
            </dd>
            <dt>{tr("Góp dự định / tháng")}</dt>
            <dd>{money(goal.monthly)}</dd>
            <dt>{tr("Cần góp / tháng")}</dt>
            <dd>
              {state.requiredMonthly === null
                ? "—"
                : money(state.requiredMonthly)}
            </dd>
            <dt>{tr("Dự kiến tháng đạt")}</dt>
            <dd>
              {state.estimatedMonth
                ? formatMonth(state.estimatedMonth, locale)
                : "—"}
            </dd>
            {state.balance !== null && (
              <>
                <dt>{tr("Số dư sổ riêng")}</dt>
                <dd>{money(state.balance)}</dd>
              </>
            )}
          </dl>
          {goal.completion && (
            <p>
              {tr("Mốc hoàn thành")}: {time(goal.completion.at)} ·{" "}
              {money(goal.completion.current)} / {money(goal.completion.target)}
            </p>
          )}
          <p>
            {tr(
              "Ước tính tính cả tháng này, không giả định lợi nhuận và không tự ghi tiền góp.",
            )}
          </p>
          {state.requiredMonthly !== null &&
            BigInt(goal.monthly) < BigInt(state.requiredMonthly) &&
            goal.status === "active" && (
              <p>{tr("Mức góp dự định thấp hơn mức cần góp để kịp hạn.")}</p>
            )}
          {goal.note && <p>{goal.note}</p>}
          <div className="goal-actions">
            {goal.status === "active" && (
              <button
                className="expense-secondary"
                onClick={() =>
                  onEdit({
                    type: "setStatus",
                    goalId: goal.id,
                    status: "paused",
                    reason: "",
                  })
                }
              >
                {tr("Tạm dừng")}
              </button>
            )}
            {["paused", "completed", "archived"].includes(goal.status) && (
              <button
                className="expense-secondary"
                onClick={() =>
                  onEdit({
                    type: "setStatus",
                    goalId: goal.id,
                    status: "active",
                    reason: "",
                  })
                }
              >
                {tr("Mở lại mục tiêu")}
              </button>
            )}
            {["active", "paused"].includes(goal.status) && (
              <button
                className="expense-primary"
                disabled={!state.ready}
                onClick={() =>
                  onEdit({
                    type: "setStatus",
                    goalId: goal.id,
                    status: "completed",
                    reason: "",
                  })
                }
              >
                {tr("Xác nhận hoàn thành")}
              </button>
            )}
            {goal.status !== "archived" && (
              <button
                className="expense-secondary"
                disabled={state.balance !== null && state.balance !== "0"}
                onClick={() =>
                  onEdit({
                    type: "setStatus",
                    goalId: goal.id,
                    status: "archived",
                    reason: "",
                  })
                }
              >
                {tr("Lưu trữ")}
              </button>
            )}
          </div>
          {state.balance !== null && state.balance !== "0" && (
            <small>{tr("Rút hoặc chuyển hết số dư trước khi lưu trữ.")}</small>
          )}
        </section>
      )}
      {tab === "source" &&
        (goal.mode === "linked" ? (
          <section>
            <p>
              {tr(goal.basis === "value" ? "Giá trị hiện tại" : "Vốn hiện còn")}
            </p>
            {goal.links.map((l) => {
              const s = view.sources.items.find(
                (s) => sourceKey(l) === sourceKey(s),
              );
              return (
                <div className="goal-source" key={sourceKey(l)}>
                  <div>
                    <strong>
                      {s?.name ?? tr("Nguồn liên kết chưa sẵn sàng.")}
                    </strong>
                    <p>
                      {tr(sourceNames[l.kind])} ·{" "}
                      {formatDecimal(String(l.share / 100), locale)}%
                    </p>
                    {s?.valueDate && (
                      <small>
                        {tr("Ngày định giá")}: {formatDate(s.valueDate, locale)}
                      </small>
                    )}
                    {s?.stale && <small>{tr("Định giá đã cũ")}</small>}
                  </div>
                  <Link className="expense-secondary" href={`/${l.kind}`}>
                    {tr("Xem nguồn")}
                  </Link>
                </div>
              );
            })}
            <p>
              {tr(
                "Liên kết không chuyển tiền hoặc khóa số dư tại nguồn. Cột mốc có thể tham chiếu chung nguồn.",
              )}
            </p>
          </section>
        ) : (
          <DialogList
            label={tr("Giao dịch mục tiêu")}
            items={activeTransactions(book)
              .map((x) => x.transaction)
              .filter((t) => t.goalId === goal.id || t.toGoalId === goal.id)
              .reverse()}
            rowKey={(t) => t.id}
            searchText={(t) => `${t.note} ${tr(kindNames[t.kind])}`}
            getDate={(t) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(t.occurredAt))
            }
            filters={[
              {
                label: tr("Loại giao dịch"),
                options: Object.entries(kindNames).map(([value, label]) => ({
                  value,
                  label: tr(label),
                })),
                value: (t) => t.kind,
              },
            ]}
            columns={[
              {
                label: tr("Thời điểm"),
                kind: "date",
                render: (t) => time(t.occurredAt),
              },
              {
                label: tr("Loại giao dịch"),
                render: (t) => (
                  <>
                    {tr(kindNames[t.kind])}
                    {t.kind === "transfer" && (
                      <small>
                        {
                          book.goals.find(
                            (g) =>
                              g.id ===
                              (t.goalId === goal.id ? t.toGoalId : t.goalId),
                          )?.name
                        }
                      </small>
                    )}
                  </>
                ),
              },
              {
                label: tr("Số tiền"),
                numeric: true,
                render: (t) => money(t.amount),
              },
              { label: tr("Ghi chú"), render: (t) => t.note || "—" },
              {
                label: tr("Thao tác"),
                kind: "actions",
                render: (t) => (
                  <div className="goal-actions">
                    <button
                      className="expense-secondary"
                      onClick={() =>
                        onEdit({
                          type: "reviseTransaction",
                          transactionId: t.id,
                          replacement: t,
                          reason: "",
                        })
                      }
                    >
                      {tr("Sửa")}
                    </button>
                    <button
                      className="expense-secondary"
                      onClick={() =>
                        onEdit({
                          type: "reviseTransaction",
                          transactionId: t.id,
                          replacement: null,
                          reason: "",
                        })
                      }
                    >
                      {tr("Hủy giao dịch")}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ))}
      {tab === "history" && (
        <DialogList
          label={tr("Lịch sử mục tiêu")}
          items={[...history].reverse()}
          rowKey={(a) => String(a.version)}
          searchText={(a) =>
            a.action.type === "reviseTransaction"
              ? a.action.reason
              : a.action.type === "saveGoal"
                ? a.action.goal.name
                : ""
          }
          renderItem={(a) => (
            <AnimatedDetails>
              <summary>
                <span>
                  {time(a.at)} ·{" "}
                  {tr(
                    a.action.type === "saveGoal"
                      ? "Điều chỉnh mục tiêu"
                      : a.action.type === "reorder"
                        ? "Đổi thứ tự ưu tiên"
                        : a.action.type === "setStatus"
                          ? statusNames[a.action.status]
                          : a.action.type === "postTransaction"
                            ? kindNames[a.action.transaction.kind]
                            : a.action.replacement
                              ? "Sửa giao dịch"
                              : "Hủy giao dịch",
                  )}
                </span>
              </summary>
              <p>
                {tr("Phiên bản")}: {a.version}
              </p>
              {a.action.type === "saveGoal" && (
                <dl className="goal-facts">
                  <dt>{tr("Số tiền đích")}</dt>
                  <dd>{money(a.action.goal.target)}</dd>
                  <dt>{tr("Góp dự định / tháng")}</dt>
                  <dd>{money(a.action.goal.monthly)}</dd>
                  <dt>{tr("Hạn hoàn thành")}</dt>
                  <dd>
                    {a.action.goal.deadline
                      ? formatDate(a.action.goal.deadline, locale)
                      : "—"}
                  </dd>
                  <dt>{tr("Nguồn liên kết")}</dt>
                  <dd>
                    {a.action.goal.links
                      .map(
                        (l) =>
                          `${a.sources.items.find((s) => sourceKey(s) === sourceKey(l))?.name ?? tr(sourceNames[l.kind])} ${formatDecimal(String(l.share / 100), locale)}%`,
                      )
                      .join(", ") || "—"}
                  </dd>
                </dl>
              )}
              {a.action.type === "postTransaction" && (
                <p>
                  {money(a.action.transaction.amount)} ·{" "}
                  {a.action.transaction.note}
                </p>
              )}
              {a.action.type === "reviseTransaction" && (
                <p>
                  {a.action.reason}
                  {a.action.replacement
                    ? ` · ${money(a.action.replacement.amount)}`
                    : ""}
                </p>
              )}
            </AnimatedDetails>
          )}
        />
      )}
    </Modal>
  );
}
