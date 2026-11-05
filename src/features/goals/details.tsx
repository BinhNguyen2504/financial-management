"use client";
import Link from "next/link";
import { Modal } from "@/components/modal";
import {
  DialogList,
  DialogTabs,
  DialogNote,
} from "@/components/dialog-content";
import { Pencil, Trash2 } from "lucide-react";
import { GoalProgress } from "./progress";
import { AnimatedDetails } from "@/components/animated-details";
import { useMoney } from "@/components/privacy";
import { formatDate, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import {
  activeTransactions,
  sourceKey,
  type GoalView,
} from "@/domain/goals/engine";
import type { Goal, GoalAction } from "@/domain/goals/schema";
import { linkedSource } from "@/domain/goals/source-links";
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
    money = useMoney();
  const book = view.book!;
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
      <div className="goal-detail-shell">
        <DialogTabs
          tabs={[
            {
              id: "progress",
              label: tr("Tiến độ và kế hoạch"),
              content: <GoalProgress goal={goal} view={view} onEdit={onEdit} />,
            },
            {
              id: "source",
              label: tr(
                goal.mode === "ledger" ? "Giao dịch" : "Nguồn liên kết",
              ),
              content:
                goal.mode === "linked" ? (
                  <section className="goal-sources-detail">
                    <h3>
                      {tr(
                        goal.basis === "value"
                          ? "Giá trị hiện tại"
                          : "Vốn hiện còn",
                      )}
                    </h3>
                    {goal.links.map((l) => {
                      const s = linkedSource(view.sources, l);
                      return (
                        <div className="goal-source" key={sourceKey(l)}>
                          <div className="goal-source-name">
                            <strong>
                              {s?.name ?? tr("Nguồn liên kết chưa sẵn sàng.")}
                            </strong>
                            <p>
                              {tr(sourceNames[l.kind])} ·{" "}
                              {formatDecimal(String(l.share / 100), locale)}%
                            </p>
                            {s?.valueDate && (
                              <small>
                                {tr("Ngày định giá")}:{" "}
                                {formatDate(s.valueDate, locale)}
                              </small>
                            )}
                            {s?.stale && <small>{tr("Định giá đã cũ")}</small>}
                          </div>
                          <Link
                            className="expense-secondary"
                            href={`/${l.kind}`}
                          >
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
                    filterDisclosure
                    items={activeTransactions(book)
                      .map((x) => x.transaction)
                      .filter(
                        (t) => t.goalId === goal.id || t.toGoalId === goal.id,
                      )
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
                        options: [
                          { value: "", label: tr("Tất cả loại giao dịch") },
                          ...Object.entries(kindNames).map(
                            ([value, label]) => ({
                              value,
                              label: tr(label),
                            }),
                          ),
                        ],
                        value: (t) => t.kind,
                      },
                    ]}
                    columns={[
                      {
                        label: tr("Thời điểm"),
                        kind: "date",
                        render: (t) => (
                          <time dateTime={t.occurredAt}>
                            {formatDate(
                              new Intl.DateTimeFormat("en-CA", {
                                timeZone: "Asia/Ho_Chi_Minh",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).format(new Date(t.occurredAt)),
                              locale,
                            )}
                            <small>
                              {new Intl.DateTimeFormat(
                                locale === "vi" ? "vi-VN" : "en-GB",
                                {
                                  timeZone: "Asia/Ho_Chi_Minh",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              ).format(new Date(t.occurredAt))}
                            </small>
                          </time>
                        ),
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
                                      (t.goalId === goal.id
                                        ? t.toGoalId
                                        : t.goalId),
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
                      {
                        label: tr("Ghi chú"),
                        render: (t) =>
                          t.note ? <DialogNote text={t.note} /> : "—",
                      },
                      {
                        label: tr("Thao tác"),
                        kind: "actions",
                        render: (t) => (
                          <div className="expense-actions goal-transaction-actions">
                            <button
                              className="expense-icon-button"
                              aria-label={tr("Sửa giao dịch")}
                              title={tr("Sửa giao dịch")}
                              onClick={() =>
                                onEdit({
                                  type: "reviseTransaction",
                                  transactionId: t.id,
                                  replacement: t,
                                  reason: "",
                                })
                              }
                            >
                              <Pencil size={17} aria-hidden="true" />
                            </button>
                            <button
                              className="expense-icon-button"
                              aria-label={tr("Hủy giao dịch")}
                              title={tr("Hủy giao dịch")}
                              onClick={() =>
                                onEdit({
                                  type: "reviseTransaction",
                                  transactionId: t.id,
                                  replacement: null,
                                  reason: "",
                                })
                              }
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </div>
                        ),
                      },
                    ]}
                  />
                ),
            },
            {
              id: "history",
              label: tr("Lịch sử"),
              content: (
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
                    <AnimatedDetails className="goal-history-item">
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
                                  `${linkedSource(a.sources, l)?.name ?? tr(sourceNames[l.kind])} ${formatDecimal(String(l.share / 100), locale)}%`,
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
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}
