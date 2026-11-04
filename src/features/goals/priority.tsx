"use client";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";
import type { GoalAction } from "@/domain/goals/schema";
import type { GoalView } from "@/domain/goals/engine";
import { statusNames } from "./editor-config";

export function GoalPriority({
  action,
  view,
  change,
}: {
  action: Extract<GoalAction, { type: "reorder" }>;
  view: GoalView;
  change(action: GoalAction): void;
}) {
  const { t: tr } = useI18n("goals");
  const [announcement, announce] = useState("");
  const list = useRef<HTMLOListElement>(null);
  function move(index: number, direction: number) {
    const next = index + direction;
    if (next < 0 || next >= action.ids.length) return;
    const ids = [...action.ids],
      id = ids[index];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    change({ type: "reorder", ids });
    announce(
      tr("{0} ở vị trí {1} / {2}.", {
        0: view.book!.goals.find((g) => g.id === id)!.name,
        1: next + 1,
        2: ids.length,
      }),
    );
    requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(
        `[data-priority-id="${id}"]`,
      );
      const control =
        row?.querySelector<HTMLButtonElement>(
          `button[data-direction="${direction}"]:not(:disabled)`,
        ) ?? row?.querySelector<HTMLButtonElement>("button:not(:disabled)");
      control?.focus({ preventScroll: true });
      row?.scrollIntoView({ block: "nearest" });
    });
  }
  const current = [...view.book!.goals].sort((a, b) => a.rank - b.rank);
  const sameGoals =
    action.ids.length === current.length &&
    current.every((g) => action.ids.includes(g.id));
  return (
    <section className="goal-wide goal-priority">
      <p className="goal-note">
        {tr(
          "Sắp xếp toàn bộ mục tiêu, kể cả mục đang ẩn bởi bộ lọc. Thay đổi chỉ được lưu sau khi xem trước và xác nhận.",
        )}
      </p>
      {!sameGoals && (
        <div className="expense-error" role="alert">
          <p>
            {tr(
              "Danh sách mục tiêu đã thay đổi. Dùng danh sách mới nhất rồi sắp xếp lại.",
            )}
          </p>
          <button
            type="button"
            className="expense-secondary"
            onClick={() =>
              change({ type: "reorder", ids: current.map((g) => g.id) })
            }
          >
            {tr("Dùng thứ tự mới nhất")}
          </button>
        </div>
      )}
      <ol
        ref={list}
        className="goal-priority-list"
        aria-label={tr("Thứ tự ưu tiên")}
      >
        {action.ids.map((id, index) => {
          const goal = view.book!.goals.find((g) => g.id === id);
          if (!goal) return null;
          return (
            <li key={id} data-priority-id={id}>
              <span className="goal-priority-number" aria-hidden="true">
                {index + 1}
              </span>
              <div className="goal-priority-name">
                <strong>{goal.name}</strong>
                <StatusBadge size="compact">
                  {tr(statusNames[goal.status])}
                </StatusBadge>
              </div>
              <div className="goal-order">
                <button
                  type="button"
                  className="expense-icon-button"
                  data-direction="-1"
                  disabled={!sameGoals || index === 0}
                  aria-label={tr("Ưu tiên {0} lên", { 0: goal.name })}
                  title={tr("Ưu tiên {0} lên", { 0: goal.name })}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="expense-icon-button"
                  data-direction="1"
                  disabled={!sameGoals || index === action.ids.length - 1}
                  aria-label={tr("Ưu tiên {0} xuống", { 0: goal.name })}
                  title={tr("Ưu tiên {0} xuống", { 0: goal.name })}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </section>
  );
}
