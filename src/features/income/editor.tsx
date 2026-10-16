"use client";
import { useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import type { IncomeCategory, IncomeRow } from "@/domain/income/types";
import {
  incomeActionSchema,
  type IncomeAction,
  type IncomeCommand,
} from "@/domain/income/schema";
import { ruleAt } from "@/domain/income/engine";
import type { CommandResult } from "@/application/income";
import { ExpenseModal } from "@/features/expenses/modal";
import { monthName } from "@/features/expenses/format";
import {
  PrivacyScope,
  PrivacyReveal,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import { incomeJSON, IncomeAPIError } from "./api";
export type EditorMode =
  | { type: "create" }
  | { type: "configure" | "stop" | "deleteCategory"; category: IncomeCategory }
  | { type: "monthly" | "clear"; row: IncomeRow }
  | { type: "oneoff"; row?: IncomeRow }
  | { type: "deleteOneOff"; row: IncomeRow };
const titles = {
  create: "Thêm danh mục cố định",
  configure: "Sửa danh mục",
  stop: "Ngừng danh mục",
  deleteCategory: "Xóa danh mục",
  monthly: "Nhập thu nhập tháng",
  clear: "Xóa số thu đã nhập",
  oneoff: "Khoản thu phát sinh",
  deleteOneOff: "Xóa khoản thu phát sinh",
};
export function IncomeEditor(props: Parameters<typeof IncomeEditorForm>[0]) {
  return (
    <PrivacyScope>
      <IncomeEditorForm {...props} />
    </PrivacyScope>
  );
}
function IncomeEditorForm({
  mode,
  month,
  today,
  version,
  onClose,
  onSaved,
  onReload,
}: {
  mode: EditorMode;
  month: string;
  today: string;
  version: number;
  onClose(): void;
  onSaved(): Promise<void>;
  onReload(): Promise<unknown>;
}) {
  const money = useMoney();
  const hidden = useMoneyHidden();
  const initialRow = "row" in mode ? mode.row : undefined;
  const config =
    "category" in mode
      ? (ruleAt(mode.category, month) ?? mode.category.rules.at(-1))
      : undefined;
  const [name, setName] = useState(initialRow?.name ?? config?.name ?? "");
  const [description, setDescription] = useState(
    initialRow?.description ?? config?.description ?? "",
  );
  const [period, setPeriod] = useState(initialRow?.month ?? month);
  const [amount, setAmount] = useState(initialRow?.amount ?? "");
  const [note, setNote] = useState(initialRow?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<{
    result: CommandResult;
    command: IncomeCommand;
  } | null>(null);
  const pending = useRef<IncomeCommand | null>(null);
  const id = useRef(crypto.randomUUID());
  const errorRef = useRef<HTMLDivElement>(null);
  const needsPreview = mode.type === "configure" || mode.type === "stop";
  const deleting = ["clear", "deleteCategory", "deleteOneOff"].includes(
    mode.type,
  );
  const hasName = ["create", "configure", "oneoff"].includes(mode.type);
  const hasAmount = mode.type === "monthly" || mode.type === "oneoff";
  function action(): IncomeAction {
    switch (mode.type) {
      case "create":
        return {
          type: "createCategory",
          id: id.current,
          start: period,
          name,
          description,
        };
      case "configure":
        return {
          type: "configureCategory",
          categoryId: mode.category.id,
          month: period,
          name,
          description,
        };
      case "stop":
        return {
          type: "stopCategory",
          categoryId: mode.category.id,
          month: period,
        };
      case "deleteCategory":
        return { type: "deleteCategory", categoryId: mode.category.id };
      case "monthly":
        return {
          type: "setMonthly",
          categoryId: mode.row.categoryId!,
          month: period,
          amount,
          note,
        };
      case "clear":
        return {
          type: "clearMonthly",
          categoryId: mode.row.categoryId!,
          month: mode.row.month,
        };
      case "oneoff":
        return {
          type: "upsertOneOff",
          id: mode.row?.key ?? id.current,
          month: period,
          name,
          description,
          amount,
        };
      case "deleteOneOff":
        return { type: "deleteOneOff", id: mode.row.key };
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (hasAmount && hidden) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const parsed = incomeActionSchema.parse(action());
      const previous = pending.current;
      const command =
        previous && JSON.stringify(previous.action) === JSON.stringify(parsed)
          ? previous
          : {
              id: crypto.randomUUID(),
              expectedVersion: version,
              action: parsed,
            };
      pending.current = command;
      if (needsPreview && (!preview || preview.command.id !== command.id)) {
        setPreview({
          result: await incomeJSON<CommandResult>("/preview", command),
          command,
        });
      } else {
        await incomeJSON("/commands", command);
        await onSaved();
      }
    } catch (e) {
      if (e instanceof ZodError) {
        setFieldErrors(
          Object.fromEntries(
            e.issues.map((i) => [String(i.path.at(-1)), i.message]),
          ),
        );
        setError("Kiểm tra các trường được đánh dấu bên dưới.");
      } else
        setError(
          e instanceof Error
            ? e.message
            : "Không thể lưu. Kiểm tra kết nối và thử lại.",
        );
      if (e instanceof IncomeAPIError && e.code === "VERSION_CONFLICT") {
        setConflict(true);
        setPreview(null);
      }
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  function changed() {
    setPreview(null);
    setError("");
    setFieldErrors({});
  }
  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <span className="expense-error" id={`income-error-${key}`}>
        {fieldErrors[key]}
      </span>
    ) : null;
  return (
    <ExpenseModal title={titles[mode.type]} onClose={onClose} busy={busy}>
      <form className="expense-form" onSubmit={submit} onChange={changed}>
        <PrivacyReveal />
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="expense-error"
          >
            {error}
            {Object.entries(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([key, message]) => (
                  <li key={key}>
                    <a href={`#income-field-${key}`}>{message}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {conflict && (
          <button
            type="button"
            className="expense-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onReload();
                setConflict(false);
                setPreview(null);
                pending.current = null;
                setError(
                  "Đã tải dữ liệu mới. Kiểm tra nội dung trước khi lưu lại.",
                );
              } catch {
                setError("Chưa tải lại được dữ liệu. Hãy thử lại.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Tải dữ liệu mới, giữ nội dung nhập
          </button>
        )}
        {initialRow && (
          <p>
            <strong>{initialRow.name}</strong> · {monthName(initialRow.month)}
          </p>
        )}
        {deleting ? (
          <p className="expense-notice">
            {mode.type === "deleteCategory"
              ? `Xóa danh mục “${config?.name}” chưa có số thu.`
              : `Xóa số thu ${money(initialRow!.amount!)} của ${monthName(initialRow!.month)}? Tổng đã ghi nhận sẽ được tính lại. Lịch sử thay đổi vẫn được giữ.`}
          </p>
        ) : (
          <>
            {hasName && (
              <label>
                Tên
                <input
                  id="income-field-name"
                  required
                  maxLength={100}
                  value={name}
                  disabled={busy}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "income-error-name" : undefined
                  }
                  onChange={(e) => setName(e.target.value)}
                />
                {fieldError("name")}
              </label>
            )}
            {hasName && (
              <label>
                Mô tả (tùy chọn)
                <textarea
                  maxLength={1000}
                  value={description}
                  disabled={busy}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            )}
            <label>
              {mode.type === "create"
                ? "Tháng bắt đầu"
                : needsPreview
                  ? "Tháng hiệu lực"
                  : "Tháng"}
              <input
                id="income-field-month"
                type="month"
                required
                min={"category" in mode ? mode.category.start : "2000-01"}
                max={hasAmount ? today.slice(0, 7) : "2099-12"}
                value={period}
                disabled={busy || mode.type === "monthly"}
                onChange={(e) => setPeriod(e.target.value)}
              />
              {fieldError("month")}
              {fieldError("start")}
            </label>
            {hasAmount && (
              <label>
                Số tiền thực nhận (VND)
                {hidden ? (
                  <input
                    id="income-field-amount"
                    value="••••••"
                    readOnly
                    autoComplete="off"
                  />
                ) : (
                  <input
                    id="income-field-amount"
                    required
                    inputMode="numeric"
                    pattern="[0-9]+"
                    maxLength={24}
                    value={amount}
                    disabled={busy}
                    aria-invalid={!!fieldErrors.amount}
                    aria-describedby={
                      fieldErrors.amount ? "income-error-amount" : undefined
                    }
                    onChange={(e) => setAmount(e.target.value)}
                  />
                )}
                {fieldError("amount")}
                {/^\d{1,24}$/.test(amount) && (
                  <span className="expense-muted">{money(amount)}</span>
                )}
              </label>
            )}
            {mode.type === "monthly" && (
              <label>
                Ghi chú (tùy chọn)
                <textarea
                  maxLength={1000}
                  value={note}
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
            {mode.type === "stop" && (
              <p className="expense-notice">
                Ngừng “{config?.name}” từ tháng hiệu lực, gồm các năm sau. Số
                thu đã ghi vẫn được giữ và có thể sửa.
              </p>
            )}
          </>
        )}
        {preview && (
          <section className="income-preview" aria-label="Xem trước thay đổi">
            <h3>Ảnh hưởng từ {monthName(preview.result.effectiveFrom!)}</h3>
            <p>
              {preview.result.changes.length} dòng thay đổi trong các năm đang
              có cấu hình hoặc dữ liệu; cấu hình tiếp tục áp dụng cho những năm
              sau. Tổng tiền đã ghi không thay đổi.
            </p>
            <ul>
              {preview.result.changes.slice(0, 24).map((r) => (
                <li key={`${r.kind}/${r.key}/${r.month}`}>
                  {monthName(r.month)}: {r.beforeName ?? "—"} →{" "}
                  {r.afterName ?? "—"}
                  {r.afterActive === false || r.afterName === null
                    ? " · ngừng dòng trống; giữ số đã ghi"
                    : ""}
                </li>
              ))}
            </ul>
            {preview.result.changes.length > 24 && (
              <p>
                Còn {preview.result.changes.length - 24} dòng cùng phạm vi hiệu
                lực.
              </p>
            )}
          </section>
        )}
        <div className="expense-actions">
          <button
            type="button"
            className="expense-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            className="expense-primary"
            disabled={busy || conflict || (hasAmount && hidden)}
          >
            {busy
              ? "Đang xử lý…"
              : needsPreview && !preview
                ? "Xem trước thay đổi"
                : deleting
                  ? "Xác nhận xóa"
                  : needsPreview
                    ? "Xác nhận lưu"
                    : "Lưu"}
          </button>
        </div>
      </form>
    </ExpenseModal>
  );
}
