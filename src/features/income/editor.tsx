"use client";
import { HelpButton } from "@/features/help/provider";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { Save, X, ScanEye, Trash2 } from "lucide-react";
import { normalizeInteger, integerInput } from "@/lib/form-values";
import { LoadingSpinner } from "@/components/loading";
import { focusFirstInvalid } from "@/components/form-feedback";
import { MoneyHint } from "@/components/money-hint";
import { useToast } from "@/components/toast";
import { DialogChanges, DialogPreview } from "@/components/dialog-content";
import { useRef, useId, useState, type FormEvent } from "react";
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
  const toast = useToast();
  const money = useMoney();
  const hidden = useMoneyHidden();
  const initialRow = "row" in mode ? mode.row : undefined;
  const initialMonth =
    initialRow?.month ??
    ("category" in mode && month < mode.category.start
      ? mode.category.start
      : month);
  const config =
    "category" in mode
      ? (ruleAt(mode.category, initialMonth) ?? mode.category.rules.at(-1))
      : undefined;
  const [name, setName] = useState(initialRow?.name ?? config?.name ?? "");
  const [description, setDescription] = useState(
    initialRow?.description ?? config?.description ?? "",
  );
  const [period, setPeriod] = useState(initialMonth);
  const [amount, setAmount] = useState(initialRow?.amount ?? "");
  const [note, setNote] = useState(initialRow?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
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
          amount: normalizeInteger(amount),
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
          amount: normalizeInteger(amount),
        };
      case "deleteOneOff":
        return { type: "deleteOneOff", id: mode.row.key };
    }
  }
  const targetRule =
    "category" in mode ? ruleAt(mode.category, period) : undefined;
  const unchanged =
    mode.type === "configure"
      ? !!targetRule &&
        name.trim() === targetRule.name &&
        description.trim() === targetRule.description
      : mode.type === "monthly" && initialRow?.amount !== null
        ? normalizeInteger(amount) === initialRow?.amount &&
          note.trim() === (initialRow?.note ?? "")
        : mode.type === "oneoff" && !!initialRow
          ? name.trim() === initialRow.name &&
            description.trim() === initialRow.description &&
            period === initialRow.month &&
            normalizeInteger(amount) === initialRow.amount
          : mode.type === "stop"
            ? !targetRule?.active
            : false;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (unchanged || (hasAmount && hidden)) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    let writing = false;
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
        writing = true;
        await incomeJSON("/commands", command);
        toast("success", "Đã lưu thay đổi.");
        await onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof IncomeAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite) setUncertain(true);
      if (e instanceof ZodError) {
        setFieldErrors(fieldErrorsFromIssues(e.issues));
        setError("Kiểm tra các trường được đánh dấu bên dưới.");
      } else if (e instanceof IncomeAPIError && e.fieldErrors) {
        setFieldErrors(e.fieldErrors);
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
      focusFirstInvalid(
        document.querySelector(
          ".expense-dialog[open]:not([inert]) .dialog-body",
        ),
        errorRef.current,
      );
      toast(
        unknownWrite ? "warning" : "error",
        unknownWrite
          ? "Chưa xác nhận được kết quả lưu. Thử lại cùng yêu cầu."
          : e instanceof Error
            ? e.message
            : "Chưa hoàn tất. Hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  function changed(event: React.FormEvent<HTMLFormElement>) {
    setPreview(null);
    setError("");
    const target = event.target as HTMLInputElement;
    const key = target.id?.replace("income-field-", "");
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }
  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <span className="expense-error" id={`income-error-${key}`}>
        {fieldErrors[key]}
      </span>
    ) : null;
  const formId = useId();
  return (
    <ExpenseModal
      title={titles[mode.type]}
      onClose={onClose}
      busy={busy || uncertain}
      size={deleting ? "confirm" : "form"}
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={onClose}
            disabled={busy || uncertain}
          >
            <X size={17} aria-hidden="true" />
            Hủy
          </button>
          <button
            form={formId}
            aria-busy={busy}
            className={`expense-primary ${deleting ? "expense-danger" : mode.type === "stop" ? "expense-warning" : ""}`}
            disabled={busy || conflict || unchanged || (hasAmount && hidden)}
          >
            {busy ? (
              <LoadingSpinner />
            ) : deleting ? (
              <Trash2 size={17} aria-hidden="true" />
            ) : needsPreview && !preview ? (
              <ScanEye size={17} aria-hidden="true" />
            ) : (
              <Save size={17} aria-hidden="true" />
            )}
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
      }
    >
      <form
        id={formId}
        className="expense-form"
        noValidate
        onSubmit={submit}
        onChange={changed}
      >
        {!deleting && (
          <p className="required-fields-note">
            <span className="required-mark" aria-hidden="true">
              *
            </span>{" "}
            là thông tin cần nhập.
          </p>
        )}
        {uncertain && (
          <p role="status" className="expense-notice">
            Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và bấm Lưu lại để
            kiểm tra cùng yêu cầu.
          </p>
        )}
        <PrivacyReveal />
        <HelpButton
          pageId="income"
          sectionId={
            mode.type === "oneoff" || mode.type === "deleteOneOff"
              ? "oneoff"
              : mode.type === "monthly" || mode.type === "clear"
                ? "monthly-amount"
                : "fixed"
          }
          label="Hiểu khoản thu đang nhập"
        />
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="form-error-summary"
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
        <fieldset className="dialog-form-section" disabled={busy || uncertain}>
          <legend>Thông tin thu nhập</legend>
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
                  <span className="required-mark" aria-hidden="true">
                    *
                  </span>
                  <input
                    aria-label="Tên"
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
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
                <input
                  aria-label={
                    mode.type === "create"
                      ? "Tháng bắt đầu"
                      : needsPreview
                        ? "Tháng hiệu lực"
                        : "Tháng"
                  }
                  id={
                    mode.type === "create"
                      ? "income-field-start"
                      : "income-field-month"
                  }
                  aria-invalid={!!(fieldErrors.month || fieldErrors.start)}
                  aria-describedby={
                    fieldErrors.start
                      ? "income-error-start"
                      : fieldErrors.month
                        ? "income-error-month"
                        : undefined
                  }
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
                  <span className="required-mark" aria-hidden="true">
                    *
                  </span>
                  {hidden ? (
                    <input
                      aria-label="Số tiền thực nhận (VND)"
                      id="income-field-amount"
                      value="••••••"
                      readOnly
                      autoComplete="off"
                    />
                  ) : (
                    <input
                      aria-label="Số tiền thực nhận (VND)"
                      id="income-field-amount"
                      required
                      inputMode="numeric"
                      pattern="[0-9]+"
                      maxLength={24}
                      value={amount}
                      disabled={busy}
                      aria-invalid={!!fieldErrors.amount}
                      aria-describedby={`income-hint-amount${fieldErrors.amount ? " income-error-amount" : ""}`}
                      onChange={(e) => {
                        const next = integerInput(e.target.value);
                        if (next !== null) setAmount(next);
                      }}
                      onBlur={() => setAmount(normalizeInteger(amount))}
                    />
                  )}
                  <MoneyHint id="income-hint-amount" value={amount} />
                  {fieldError("amount")}
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
        </fieldset>
        {preview && (
          <DialogPreview className="income-preview">
            <h3>Ảnh hưởng từ {monthName(preview.result.effectiveFrom!)}</h3>
            <p>
              {preview.result.changes.length > 0
                ? `${preview.result.changes.length} dòng thay đổi trong các năm đang`
                : "Cập nhật cấu hình trong các năm đang"}
              có cấu hình hoặc dữ liệu; cấu hình tiếp tục áp dụng cho những năm
              sau. Tổng tiền đã ghi không thay đổi.
            </p>
            {preview.result.changes.length > 0 && (
              <DialogChanges
                rows={preview.result.changes
                  .slice()
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .map((r) => ({
                    key: `${r.kind}/${r.key}/${r.month}`,
                    label: monthName(r.month),
                    before: r.beforeName ?? "Chưa có",
                    after: `${r.afterName ?? "Không còn dòng trống"}${r.afterActive === false ? " · Đã ngừng; giữ số đã ghi" : ""}`,
                  }))}
              />
            )}
          </DialogPreview>
        )}
      </form>
    </ExpenseModal>
  );
}
