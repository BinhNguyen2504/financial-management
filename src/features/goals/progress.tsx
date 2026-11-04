"use client";
import { useId } from "react";
import { DialogFacts, DialogNote } from "@/components/dialog-content";
import { StatusBadge } from "@/components/status-badge";
import { useMoney } from "@/components/privacy";
import { formatDate, formatMonth, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import type { Goal, GoalAction } from "@/domain/goals/schema";
import type { GoalView } from "@/domain/goals/engine";
import { statusNames } from "./editor-config";

export function GoalProgress({
  goal,
  view,
  onEdit,
}: {
  goal: Goal;
  view: GoalView;
  onEdit(action: GoalAction): void;
}) {
  const { t: tr, locale } = useI18n("goals"),
    money = useMoney(),
    uid = useId();
  const state = view.states.find((s) => s.id === goal.id)!;
  const following = ["active", "paused"].includes(goal.status);
  const hasBalance = state.balance !== null && state.balance !== "0";
  const status = (next: "active" | "paused" | "completed" | "archived") =>
    onEdit({ type: "setStatus", goalId: goal.id, status: next, reason: "" });
  return (
    <div className="goal-detail">
      <section className="goal-progress-summary" aria-label={tr("Tiến độ")}>
        <div className="goal-card-top">
          <span>
            {tr(
              goal.mode === "ledger"
                ? "Sổ góp riêng"
                : "Liên kết dữ liệu sẵn có",
            )}
          </span>
          <StatusBadge
            size="compact"
            tone={
              state.ready ? "success" : state.overdue ? "warning" : "neutral"
            }
          >
            {tr(
              goal.status === "active" && state.ready
                ? "Đã đủ tiền"
                : statusNames[goal.status],
            )}
          </StatusBadge>
        </div>
        <p className="goal-summary-label">{tr("Đã đạt")}</p>
        <div className="goal-amount">
          <strong>
            {state.current === null
              ? tr("Chưa đủ dữ liệu")
              : money(state.current)}
          </strong>
          <span>/ {money(goal.target)}</span>
        </div>
        {state.current === null ? (
          <span className="goal-progress-unavailable" aria-hidden="true" />
        ) : (
          <progress
            max={100}
            value={Math.min(100, Number(state.percent ?? "0"))}
            aria-label={tr("Tiến độ {0}", { 0: goal.name })}
          />
        )}
        <div className="goal-card-top">
          <span>
            {state.percent === null
              ? "—"
              : `${formatDecimal(state.percent, locale)}%`}
          </span>
          <span>
            {tr("Còn thiếu")}:{" "}
            {state.remaining === null ? "—" : money(state.remaining)}
          </span>
        </div>
        {goal.status === "active" && state.ready && (
          <p className="goal-note">
            {tr(
              "Đủ tiền chưa tự hoàn thành. Xác nhận hoàn thành để lưu mốc và giải phóng tỷ lệ liên kết.",
            )}
          </p>
        )}
        {state.stale && <p className="goal-warning">{tr("Định giá đã cũ")}</p>}
      </section>
      <div className="goal-detail-columns">
        <section className="goal-section" aria-labelledby={`${uid}-plan`}>
          <h3 id={`${uid}-plan`}>{tr("Kế hoạch góp")}</h3>
          <DialogFacts
            items={[
              {
                label: tr("Hạn hoàn thành"),
                value: goal.deadline
                  ? formatDate(goal.deadline, locale)
                  : tr("Không đặt hạn"),
              },
              {
                label: tr("Dự kiến tháng đạt"),
                value: state.estimatedMonth
                  ? formatMonth(state.estimatedMonth, locale)
                  : "—",
              },
              { label: tr("Góp dự định / tháng"), value: money(goal.monthly) },
              {
                label: tr("Cần góp / tháng"),
                value:
                  state.requiredMonthly === null
                    ? "—"
                    : money(state.requiredMonthly),
              },
            ]}
          />
          {state.overdue && goal.status === "active" && (
            <p className="goal-warning">{tr("Quá hạn")}</p>
          )}
          {state.requiredMonthly !== null &&
            BigInt(goal.monthly) < BigInt(state.requiredMonthly) &&
            goal.status === "active" && (
              <p className="goal-warning">
                {tr("Mức góp dự định thấp hơn mức cần góp để kịp hạn.")}
              </p>
            )}
          <p className="goal-note">
            {tr(
              "Ước tính tính cả tháng này, không giả định lợi nhuận và không tự ghi tiền góp.",
            )}
          </p>
        </section>
        <section className="goal-section" aria-labelledby={`${uid}-tracking`}>
          <h3 id={`${uid}-tracking`}>
            {tr(goal.mode === "ledger" ? "Sổ góp riêng" : "Nguồn liên kết")}
          </h3>
          <DialogFacts
            items={[
              { label: tr("Số tiền đích"), value: money(goal.target) },
              ...(state.balance === null
                ? [
                    {
                      label: tr("Tính tiến độ theo"),
                      value: tr(
                        goal.basis === "value"
                          ? "Giá trị hiện tại"
                          : "Vốn hiện còn",
                      ),
                    },
                  ]
                : [
                    {
                      label: tr("Số dư sổ riêng"),
                      value: money(state.balance),
                    },
                  ]),
            ]}
          />
          {goal.completion && (
            <div className="goal-completion">
              <h4>{tr("Mốc hoàn thành")}</h4>
              <p>
                {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(goal.completion.at))}
              </p>
              <p>
                {money(goal.completion.current)} /{" "}
                {money(goal.completion.target)}
              </p>
            </div>
          )}
          <p className="goal-note">
            {tr(
              goal.mode === "ledger"
                ? "Sổ riêng giữ số dư sau hoàn thành; rút hoặc chuyển hết trước khi lưu trữ."
                : "Liên kết không chuyển tiền hoặc khóa số dư tại nguồn. Cột mốc có thể tham chiếu chung nguồn.",
            )}
          </p>
        </section>
      </div>
      {goal.note && (
        <section className="goal-section goal-note-section">
          <h3>{tr("Ghi chú")}</h3>
          <DialogNote text={goal.note} />
        </section>
      )}
      <section
        className="goal-status-section"
        aria-labelledby={`${uid}-manage`}
      >
        <h3 id={`${uid}-manage`}>{tr("Quản lý mục tiêu")}</h3>
        <div className="goal-actions">
          {goal.status === "active" && (
            <button
              className="expense-secondary"
              onClick={() => status("paused")}
            >
              {tr("Tạm dừng")}
            </button>
          )}
          {["paused", "completed", "archived"].includes(goal.status) && (
            <button
              className="expense-secondary"
              onClick={() => status("active")}
            >
              {tr("Mở lại mục tiêu")}
            </button>
          )}
          {following && (
            <button
              className={
                goal.mode === "ledger" ? "expense-secondary" : "expense-primary"
              }
              disabled={!state.ready}
              aria-describedby={
                !state.ready ? `${uid}-complete-hint` : undefined
              }
              onClick={() => status("completed")}
            >
              {tr("Xác nhận hoàn thành")}
            </button>
          )}
          {goal.status !== "archived" && (
            <button
              className="expense-secondary"
              disabled={hasBalance}
              aria-describedby={hasBalance ? `${uid}-archive-hint` : undefined}
              onClick={() => status("archived")}
            >
              {tr("Lưu trữ")}
            </button>
          )}
        </div>
        {following && !state.ready && (
          <p id={`${uid}-complete-hint`} className="goal-note">
            {tr("Mục tiêu chưa đủ tiền hoặc thiếu dữ liệu nguồn.")}
          </p>
        )}
        {goal.status !== "archived" && hasBalance && (
          <p id={`${uid}-archive-hint`} className="goal-note">
            {tr("Rút hoặc chuyển hết số dư trước khi lưu trữ.")}
          </p>
        )}
      </section>
    </div>
  );
}
