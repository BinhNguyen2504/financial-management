"use client";
import { LocalizedInput } from "@/components/localized-input";
import { useMoney } from "@/components/privacy";
import { formatDate, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import type { Goal, GoalAction } from "@/domain/goals/schema";
import { sourceKey, type GoalView } from "@/domain/goals/engine";
import { purposeNames, sourceNames, kindNames } from "./editor-config";
export function GoalFields({
  action,
  view,
  fields,
  change,
  onSubmit,
  busy,
}: {
  action: GoalAction;
  view: GoalView;
  fields: Record<string, string>;
  change(action: GoalAction): void;
  onSubmit(): void;
  busy: boolean;
}) {
  const { t: tr, locale } = useI18n("goals"),
    money = useMoney();
  const input = action.type === "saveGoal" ? action.goal : null,
    existing = input ? view.book?.goals.find((g) => g.id === input.id) : null;
  const transaction =
    action.type === "postTransaction"
      ? action.transaction
      : action.type === "reviseTransaction"
        ? action.replacement
        : null;
  const updateGoal = (patch: Partial<NonNullable<typeof input>>) => {
    if (input) change({ type: "saveGoal", goal: { ...input, ...patch } });
  };
  const updateTransaction = (
    patch: Partial<NonNullable<typeof transaction>>,
  ) => {
    if (transaction)
      change(
        action.type === "postTransaction"
          ? { ...action, transaction: { ...transaction, ...patch } }
          : action.type === "reviseTransaction"
            ? { ...action, replacement: { ...transaction, ...patch } }
            : action,
      );
  };
  const fieldError = (key: string) =>
    fields[key] ? (
      <small className="expense-field-error" role="status">
        {tr(fields[key])}
      </small>
    ) : null;
  return (
    <form
      inert={busy}
      id="goal-editor"
      className="goal-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {input && (
        <>
          <fieldset>
            <legend>{tr("Điều muốn đạt")}</legend>
            <label>
              {tr("Tên mục tiêu")}
              <input
                required
                maxLength={100}
                value={input.name}
                onChange={(e) => updateGoal({ name: e.target.value })}
              />
              {fieldError("goal.name")}
            </label>
            <label>
              {tr("Loại mục tiêu")}
              <select
                aria-label={tr("Loại mục tiêu")}
                value={input.purpose}
                disabled={Boolean(existing)}
                onChange={(e) =>
                  updateGoal({
                    purpose: e.target.value as Goal["purpose"],
                    links: [],
                  })
                }
              >
                {Object.entries(purposeNames).map(([v, l]) => (
                  <option value={v} key={v}>
                    {tr(l)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Số tiền đích (VND)")}
              <LocalizedInput
                required
                numberKind="integer"
                inputMode="numeric"
                value={input.target}
                onValueChange={(target) => updateGoal({ target })}
              />
              {fieldError("goal.target")}
            </label>
            <label>
              {tr("Hạn hoàn thành")}
              <LocalizedInput
                type="date"
                aria-label={tr("Hạn hoàn thành")}
                value={input.deadline ?? ""}
                onValueChange={(deadline) =>
                  updateGoal({ deadline: deadline || null })
                }
              />
              {fieldError("goal.deadline")}
            </label>
          </fieldset>
          <fieldset>
            <legend>{tr("Cách chuẩn bị tiền")}</legend>
            <label>
              {tr("Cách ghi nhận")}
              <select
                aria-label={tr("Cách ghi nhận")}
                value={input.mode}
                disabled={Boolean(existing)}
                onChange={(e) =>
                  updateGoal({
                    mode: e.target.value as Goal["mode"],
                    links: [],
                  })
                }
              >
                <option value="ledger">{tr("Sổ góp riêng")}</option>
                <option value="linked">{tr("Liên kết dữ liệu sẵn có")}</option>
              </select>
            </label>
            <label>
              {tr("Góp dự định / tháng (VND)")}
              <LocalizedInput
                required
                numberKind="integer"
                inputMode="numeric"
                value={input.monthly}
                onValueChange={(monthly) => updateGoal({ monthly })}
              />
              {fieldError("goal.monthly")}
            </label>
            {input.mode === "linked" && (
              <label>
                {tr("Tính tiến độ theo")}
                <select
                  aria-label={tr("Tính tiến độ theo")}
                  value={input.basis}
                  onChange={(e) =>
                    updateGoal({ basis: e.target.value as Goal["basis"] })
                  }
                >
                  <option value="value">{tr("Giá trị hiện tại")}</option>
                  <option value="capital">{tr("Vốn hiện còn")}</option>
                </select>
              </label>
            )}
            <label>
              {tr("Ghi chú")}
              <textarea
                maxLength={1000}
                value={input.note}
                onChange={(e) => updateGoal({ note: e.target.value })}
              />
            </label>
          </fieldset>
          {input.mode === "linked" && (
            <fieldset className="goal-wide">
              <legend>{tr("Nguồn liên kết")}</legend>
              <p>
                {tr(
                  input.purpose === "spending"
                    ? "Chia tỷ lệ cố định; số tiền thay đổi cùng nguồn. Tổng phần chia cho mục tiêu chi dùng không vượt 100% mỗi nguồn."
                    : "Cột mốc theo dõi toàn bộ nguồn đã chọn và có thể tham chiếu chung nguồn.",
                )}
              </p>
              {view.sources.items
                .filter(
                  (s) =>
                    (s.active ||
                      input.links.some((l) => sourceKey(l) === sourceKey(s))) &&
                    (s.kind !== "funds" || input.purpose === "milestone"),
                )
                .map((s) => {
                  const l = input.links.find(
                    (l) => sourceKey(l) === sourceKey(s),
                  );
                  const used = (view.book?.goals ?? [])
                    .filter(
                      (g) =>
                        g.id !== input.id &&
                        g.purpose === "spending" &&
                        ["active", "paused"].includes(g.status),
                    )
                    .flatMap((g) => g.links)
                    .filter((link) => sourceKey(link) === sourceKey(s))
                    .reduce((n, l) => n + l.share, 0);
                  return (
                    <div className="goal-source" key={sourceKey(s)}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(l)}
                          onChange={(e) =>
                            updateGoal({
                              links: e.target.checked
                                ? [
                                    ...input.links,
                                    {
                                      kind: s.kind,
                                      sourceId: s.sourceId,
                                      share:
                                        input.purpose === "milestone"
                                          ? 10000
                                          : Math.max(1, 10000 - used),
                                    },
                                  ]
                                : input.links.filter(
                                    (l) => sourceKey(l) !== sourceKey(s),
                                  ),
                            })
                          }
                        />
                        <span>
                          {s.name}
                          <small>
                            {tr(sourceNames[s.kind])} ·{" "}
                            {input.basis === "value" && s.value === null
                              ? "—"
                              : money(
                                  input.basis === "capital"
                                    ? s.capital
                                    : s.value!,
                                )}
                            {s.value === null && input.basis === "value"
                              ? ` · ${tr("Chưa có định giá")}`
                              : ""}
                            {s.valueDate
                              ? ` · ${formatDate(s.valueDate, locale)}`
                              : ""}
                          </small>
                        </span>
                      </label>
                      {input.purpose === "spending" && (
                        <span>
                          <small>
                            {tr("Còn khả dụng")}:{" "}
                            {formatDecimal(
                              String((10000 - used) / 100),
                              locale,
                            )}
                            %
                          </small>
                          {l && (
                            <label>
                              {tr("Tỷ lệ (%)")}
                              <LocalizedInput
                                numberKind="decimal"
                                precision={2}
                                inputMode="decimal"
                                required
                                value={String(l.share / 100)}
                                onValueChange={(v) =>
                                  updateGoal({
                                    links: input.links.map((x) =>
                                      sourceKey(x) === sourceKey(s)
                                        ? {
                                            ...x,
                                            share: Math.round(Number(v) * 100),
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              {!view.sources.items.length && (
                <p>
                  {tr(
                    "Chưa có nguồn. Tạo dữ liệu trong Tiết kiệm, Đầu tư hoặc Quỹ an toàn rồi tải lại.",
                  )}
                </p>
              )}
              {Object.entries(view.sources.versions)
                .filter(([, v]) => v === null)
                .map(([kind]) => (
                  <p key={kind}>
                    {tr(sourceNames[kind as keyof typeof sourceNames])}:{" "}
                    {tr("Nguồn liên kết chưa sẵn sàng.")}
                  </p>
                ))}
            </fieldset>
          )}
        </>
      )}
      {transaction && (
        <fieldset className="goal-wide">
          <legend>{tr("Giao dịch sổ riêng")}</legend>
          <label>
            {tr("Loại giao dịch")}
            <select
              aria-label={tr("Loại giao dịch")}
              value={transaction.kind}
              disabled={action.type === "reviseTransaction"}
              onChange={(e) =>
                updateTransaction({
                  kind: e.target.value as typeof transaction.kind,
                  toGoalId: null,
                })
              }
            >
              {Object.entries(kindNames)
                .filter(
                  ([kind]) =>
                    action.type === "reviseTransaction" ||
                    view.book?.goals.find((g) => g.id === transaction.goalId)
                      ?.status === "active" ||
                    ["withdraw", "transfer"].includes(kind),
                )
                .map(([v, l]) => (
                  <option key={v} value={v}>
                    {tr(l)}
                  </option>
                ))}
            </select>
          </label>
          {transaction.kind === "transfer" && (
            <label>
              {tr("Mục tiêu nhận")}
              <select
                required
                disabled={action.type === "reviseTransaction"}
                aria-label={tr("Mục tiêu nhận")}
                value={transaction.toGoalId ?? ""}
                onChange={(e) =>
                  updateTransaction({ toGoalId: e.target.value || null })
                }
              >
                <option value="">{tr("Chọn mục tiêu")}</option>
                {view.book?.goals
                  .filter(
                    (g) =>
                      g.id !== transaction.goalId &&
                      g.mode === "ledger" &&
                      g.status === "active",
                  )
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            {tr("Số tiền (VND)")}
            <LocalizedInput
              required
              numberKind="integer"
              inputMode="numeric"
              value={transaction.amount}
              onValueChange={(amount) => updateTransaction({ amount })}
            />
            {fieldError("transaction.amount")}
          </label>
          <label>
            {tr("Thời điểm (giờ Việt Nam)")}
            <input
              type="datetime-local"
              required
              value={new Date(Date.parse(transaction.occurredAt) + 7 * 3600000)
                .toISOString()
                .slice(0, 16)}
              onChange={(e) => {
                if (e.target.value)
                  updateTransaction({
                    occurredAt: new Date(
                      `${e.target.value}+07:00`,
                    ).toISOString(),
                  });
              }}
            />
          </label>
          <label>
            {tr("Ghi chú / lý do")}
            <textarea
              required={["withdraw", "transfer"].includes(transaction.kind)}
              maxLength={1000}
              value={transaction.note}
              onChange={(e) => updateTransaction({ note: e.target.value })}
            />
          </label>
        </fieldset>
      )}
      {action.type === "reviseTransaction" && (
        <label className="goal-wide">
          {tr("Lý do sửa hoặc hủy")}
          <textarea
            required
            maxLength={1000}
            value={action.reason}
            onChange={(e) => change({ ...action, reason: e.target.value })}
          />
        </label>
      )}
      {action.type === "setStatus" && (
        <p>
          {tr("Xem trước thay đổi trạng thái và số tiền trước khi xác nhận.")}
        </p>
      )}
      {action.type === "reorder" && (
        <ol>
          {action.ids.map((id) => (
            <li key={id}>{view.book?.goals.find((g) => g.id === id)?.name}</li>
          ))}
        </ol>
      )}
    </form>
  );
}
