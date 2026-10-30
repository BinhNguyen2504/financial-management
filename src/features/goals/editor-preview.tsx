"use client";
import { DialogChanges } from "@/components/dialog-content";
import { useMoney } from "@/components/privacy";
import { formatDate, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import type { GoalAction } from "@/domain/goals/schema";
import { sourceKey, type GoalView } from "@/domain/goals/engine";
import type { GoalCommandResult } from "@/application/goals";
import { statusNames, kindNames } from "./editor-config";
export function GoalPreview({
  action,
  view,
  preview,
  title,
}: {
  action: GoalAction;
  view: GoalView;
  preview: GoalCommandResult;
  title: string;
}) {
  const { t: tr, locale } = useI18n("goals"),
    money = useMoney();
  const input = action.type === "saveGoal" ? action.goal : null;
  const transaction =
    action.type === "postTransaction"
      ? action.transaction
      : action.type === "reviseTransaction"
        ? action.replacement
        : null;
  return (
    <section aria-label={tr("Xem trước thay đổi")} className="goal-preview">
      <h3>{tr("Xem trước thay đổi")}</h3>
      <p>
        {tr(title)}
        {input ? `: ${input.name}` : ""}
      </p>
      <DialogChanges
        rows={preview.after.goals.flatMap((g) => {
          const before = preview.before.goals.find((x) => x.id === g.id),
            b = preview.before.states.find((s) => s.id === g.id),
            a = preview.after.states.find((s) => s.id === g.id)!;
          const m = (v: string | null | undefined) =>
            v === null || v === undefined ? "—" : money(v);
          const links = (items: typeof g.links) =>
            items
              .map(
                (l) =>
                  `${view.sources.items.find((s) => sourceKey(s) === sourceKey(l))?.name ?? tr("Nguồn liên kết chưa sẵn sàng.")} (${formatDecimal(String(l.share / 100), locale)}%)`,
              )
              .join(", ") || "—";
          return [
            {
              key: `${g.id}:name`,
              label: tr("Tên mục tiêu"),
              subject: g.name,
              before: before?.name ?? "—",
              after: g.name,
            },
            {
              key: `${g.id}:monthly`,
              label: tr("Góp dự định / tháng"),
              subject: g.name,
              before: m(before?.monthly),
              after: m(g.monthly),
            },
            {
              key: `${g.id}:deadline`,
              label: tr("Hạn hoàn thành"),
              subject: g.name,
              before: before?.deadline
                ? formatDate(before.deadline, locale)
                : tr("Không đặt hạn"),
              after: g.deadline
                ? formatDate(g.deadline, locale)
                : tr("Không đặt hạn"),
            },
            {
              key: `${g.id}:basis`,
              label: tr("Tính tiến độ theo"),
              subject: g.name,
              before: before
                ? tr(
                    before.basis === "value"
                      ? "Giá trị hiện tại"
                      : "Vốn hiện còn",
                  )
                : "—",
              after: tr(
                g.basis === "value" ? "Giá trị hiện tại" : "Vốn hiện còn",
              ),
            },
            {
              key: `${g.id}:links`,
              label: tr("Nguồn liên kết"),
              subject: g.name,
              before: links(before?.links ?? []),
              after: links(g.links),
            },
            {
              key: `${g.id}:note`,
              label: tr("Ghi chú"),
              subject: g.name,
              before: before?.note || "—",
              after: g.note || "—",
            },
            {
              key: `${g.id}:current`,
              label: tr("Đã đạt"),
              subject: g.name,
              before: m(b?.current),
              after: m(a.current),
            },
            {
              key: `${g.id}:balance`,
              label: tr("Số dư sổ riêng"),
              subject: g.name,
              before: m(b?.balance),
              after: m(a.balance),
            },
            {
              key: `${g.id}:target`,
              label: tr("Số tiền đích"),
              subject: g.name,
              before: m(before?.target),
              after: m(g.target),
            },
            {
              key: `${g.id}:status`,
              label: tr("Trạng thái"),
              subject: g.name,
              before: before ? tr(statusNames[before.status]) : "—",
              after: tr(statusNames[g.status]),
            },
            {
              key: `${g.id}:rank`,
              label: tr("Ưu tiên"),
              subject: g.name,
              before: before ? String(before.rank + 1) : "—",
              after: String(g.rank + 1),
            },
          ];
        })}
      />
      {input && (
        <dl className="goal-facts">
          <dt>{tr("Hạn hoàn thành")}</dt>
          <dd>
            {input.deadline
              ? formatDate(input.deadline, locale)
              : tr("Không đặt hạn")}
          </dd>
          <dt>{tr("Góp dự định / tháng")}</dt>
          <dd>{money(input.monthly)}</dd>
          <dt>{tr("Nguồn liên kết")}</dt>
          <dd>
            {input.links
              .map(
                (l) =>
                  `${view.sources.items.find((s) => sourceKey(s) === sourceKey(l))?.name ?? l.sourceId} (${formatDecimal(String(l.share / 100), locale)}%)`,
              )
              .join(", ") || "—"}
          </dd>
        </dl>
      )}
      {action.type === "setStatus" &&
        ["completed", "archived"].includes(action.status) && (
          <p>
            {tr(
              "Tỷ lệ liên kết được giải phóng; không tự ghi giao dịch rút tiền.",
            )}
          </p>
        )}
      {transaction && (
        <p>
          {tr(kindNames[transaction.kind])} · {money(transaction.amount)} ·{" "}
          {transaction.note}
        </p>
      )}
    </section>
  );
}
