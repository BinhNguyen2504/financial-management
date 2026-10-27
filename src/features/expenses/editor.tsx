"use client";
import { LocalizedInput } from "@/components/localized-input";
import { formatDate } from "@/i18n/format";
import { RequiredFieldsNote } from "@/components/required-fields-note";
import { useI18n } from "@/i18n/provider";

import type { CommandResult } from "@/application/expenses";
import { DialogChanges, DialogPreview } from "@/components/dialog-content";
import {
  focusFirstInvalid,
  FormErrorSummary,
  nativeErrors,
} from "@/components/form-feedback";
import { LoadingSpinner } from "@/components/loading";
import {
  PrivacyReveal,
  PrivacyScope,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import { useToast } from "@/components/toast";
import { jarEmoji, type JarEmoji } from "@/domain/expenses/emoji";
import { ruleAt } from "@/domain/expenses/engine";
import { paymentBrands, suggestedBrand } from "@/domain/expenses/label-visuals";
import type { ExpenseAction, ExpenseCommand } from "@/domain/expenses/schema";
import { expenseActionSchema } from "@/domain/expenses/schema";
import type {
  ExpenseRow,
  ExpenseView,
  Label,
  Spend,
} from "@/domain/expenses/types";
import { HelpButton } from "@/features/help/provider";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizeInteger } from "@/lib/form-values";
import { Plus, Save, ScanEye, Tag, X } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ZodError } from "zod";
import { apiJSON, RequestError } from "./api";
import { EmojiPicker } from "./emoji-picker";
import { monthName } from "./format";
import { labelIcons, LabelSelect, LabelVisual } from "./label-visual";
import { ExpenseModal } from "./modal";

export type EditorMode =
  | { mode: "initialize" | "create" }
  | { mode: "month" | "configure" | "stop" | "emoji"; row: ExpenseRow }
  | { mode: "spend"; row: ExpenseRow; spend?: Spend }
  | { mode: "deleteSpend"; spend: Spend }
  | { mode: "label"; label?: Label }
  | { mode: "deleteLabel"; label: Label }
  | { mode: "closeYear"; year: number };
const titles: Record<EditorMode["mode"], string> = {
  emoji: "Đổi biểu tượng",
  initialize: "Bắt đầu quản lý chi tiêu",
  create: "Thêm hũ chi tiêu",
  month: "Điều chỉnh tháng",
  configure: "Sửa hũ và mức mặc định",
  stop: "Ngừng cấp tiền cho hũ",
  spend: "Sử dụng tiền tích lũy",
  deleteSpend: "Xóa lần sử dụng",
  label: "Phương thức và nhóm",
  deleteLabel: "Xóa phân loại",
  closeYear: "Chốt và lưu năm",
};
const ExpenseErrors = createContext<Record<string, string>>({});
function Amount({
  field = "amount",
  label,
  value,
  onChange,
  optional = false,
  hint,
}: {
  field?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
}) {
  const { t: tr, locale } = useI18n("expenses");

  const id = `expense-field-${field}`;
  const errors = useContext(ExpenseErrors);
  const hidden = useMoneyHidden();
  const money = useMoney();
  return (
    <div className="expense-amount">
      <label htmlFor={id}>
        {label}
        {!optional && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hidden ? (
        <input
          id={id}
          aria-label={label}
          value="••••••"
          readOnly
          aria-describedby={`${id}-hint${errors[field] ? ` ${id}-error` : ""}`}
          autoComplete="off"
        />
      ) : (
        <LocalizedInput
          id={id}
          aria-label={label}
          aria-describedby={`${id}-hint${errors[field] ? ` ${id}-error` : ""}`}
          name={field}
          aria-invalid={!!errors[field]}
          inputMode="numeric"
          maxLength={40}
          value={value}
          required={!optional}
          numberKind="integer"
          onValueChange={onChange}
          onBlur={() => onChange(normalizeInteger(value))}
        />
      )}
      {errors[field] && (
        <small id={`${id}-error`} className="field-error">
          {tr(errors[field])}
        </small>
      )}
      <small id={`${id}-hint`}>
        {value && /^[0-9]{1,24}$/.test(value)
          ? money(value)
          : (hint ?? tr("Nhập số tiền VND"))}
        {value && hint ? ` · ${hint}` : ""}
      </small>
    </div>
  );
}
export function ExpenseEditor(props: Parameters<typeof ExpenseEditorForm>[0]) {
  return (
    <PrivacyScope>
      <ExpenseEditorForm {...props} />
    </PrivacyScope>
  );
}

function ExpenseEditorForm({
  editor,
  view,
  month,
  onClose,
  onSaved,
  onReload,
}: {
  editor: EditorMode;
  view: ExpenseView;
  month: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onReload: () => Promise<ExpenseView>;
}) {
  const { t: tr, locale, config: localize } = useI18n("expenses");
  const localizedTitles = localize(titles);

  const toast = useToast();
  const money = useMoney();
  const hidden = useMoneyHidden();
  const moneyForm = ["create", "configure", "month", "spend"].includes(
    editor.mode,
  );
  const row = "row" in editor ? editor.row : undefined;
  const input = view.book?.inputs.find(
    (i) => i.jarId === row?.jarId && i.month === row?.month,
  );
  const jar = view.book?.jars.find((j) => j.id === row?.jarId);
  const rule = jar ? ruleAt(jar.rules, row?.month ?? month) : undefined;
  const spend = "spend" in editor ? editor.spend : undefined;
  const label = "label" in editor ? editor.label : undefined;
  const [selectionView, setSelectionView] = useState(view);
  const [classifying, setClassifying] = useState(false);
  const [version, setVersion] = useState(view.book?.version ?? 0);
  const [name, setName] = useState(label?.name ?? row?.name ?? "");
  const [emoji, setEmoji] = useState<JarEmoji | null>(row?.emoji ?? null);
  const [description, setDescription] = useState(row?.description ?? "");
  const [kind, setKind] = useState<"monthly" | "accumulation">("monthly");
  const [labelKind, setLabelKind] = useState<"method" | "group">(
    label?.kind ?? "method",
  );
  const [method, setMethod] = useState(row?.method ?? "");
  const [group, setGroup] = useState(row?.group ?? "");
  const [period, setPeriod] = useState(
    row?.month ??
      (editor.mode === "initialize" ? view.today.slice(0, 7) : month),
  );
  const [amount, setAmount] = useState(spend?.amount ?? rule?.amount ?? "");
  const [opening, setOpening] = useState("0");
  const [target, setTarget] = useState(input?.target ?? "");
  const [funding, setFunding] = useState(input?.funding ?? "");
  const [extra, setExtra] = useState(input?.extra ?? "0");
  const [closing, setClosing] = useState(input?.closing ?? "");
  const [date, setDate] = useState(spend?.date ?? view.today);
  const [note, setNote] = useState(spend?.note ?? "");
  const [preview, setPreview] = useState<CommandResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [brandKey, setBrandKey] = useState(label?.brandKey ?? "");
  const [iconKey, setIconKey] = useState(label?.iconKey ?? "");
  const [conflict, setConflict] = useState(false);
  const command = useRef<ExpenseCommand | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const future = (row?.month ?? month) > view.today.slice(0, 7);
  function makeAction(): ExpenseAction {
    const config = {
      name,
      description,
      method,
      group,
      amount: normalizeInteger(amount),
    };
    switch (editor.mode) {
      case "initialize":
        return { type: "initialize", start: period };
      case "create":
        return {
          type: "createJar",
          id: crypto.randomUUID(),
          kind,
          start: period,
          opening: normalizeInteger(opening),
          emoji,
          ...config,
        };
      case "emoji":
        return {
          type: "setJarEmoji",
          jarId: editor.row.jarId,
          month: period,
          emoji,
        };
      case "configure":
        return {
          type: "configureJar",
          jarId: editor.row.jarId,
          month: period,
          ...config,
        };
      case "stop":
        return { type: "stopJar", jarId: editor.row.jarId, month: period };
      case "month":
        return {
          type: "editMonth",
          jarId: editor.row.jarId,
          month: editor.row.month,
          target: normalizeInteger(target) || null,
          funding: normalizeInteger(funding) || null,
          extra: normalizeInteger(extra),
          closing:
            editor.row.kind === "monthly"
              ? normalizeInteger(closing) || null
              : null,
        };
      case "spend":
        return {
          type: "upsertSpend",
          id: editor.spend?.id ?? crypto.randomUUID(),
          jarId: editor.row.jarId,
          date,
          amount: normalizeInteger(amount),
          note,
        };
      case "deleteSpend":
        return { type: "deleteSpend", id: editor.spend.id };
      case "label":
        return {
          type: "upsertLabel",
          id: editor.label?.id ?? crypto.randomUUID(),
          kind: labelKind,
          name,
          brandKey: labelKind === "method" ? brandKey || null : null,
          iconKey: (iconKey || null) as
            import("@/domain/expenses/label-visuals").LabelIconKey | null,
        };
      case "deleteLabel":
        return { type: "deleteLabel", id: editor.label.id };
      case "closeYear":
        return { type: "closeYear", year: editor.year };
    }
  }
  const draft = comparable({
    name,
    emoji,
    description,
    kind,
    labelKind,
    method,
    group,
    period,
    amount: normalizeInteger(amount),
    opening: normalizeInteger(opening),
    target: normalizeInteger(target),
    funding: normalizeInteger(funding),
    extra: normalizeInteger(extra),
    closing: normalizeInteger(closing),
    date,
    note,
    brandKey,
    iconKey,
  });
  const initialDraft = useRef(draft);
  const editing =
    ["configure", "month", "emoji"].includes(editor.mode) ||
    (editor.mode === "spend" && !!spend) ||
    (editor.mode === "label" && !!label);
  const unchanged = editing && draft === initialDraft.current;
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unchanged || (moneyForm && hidden)) return;
    const formElement = event.currentTarget;
    const invalid = nativeErrors(formElement, locale);
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) {
      toast("error", tr("Kiểm tra các ô được đánh dấu."));
      focusFirstInvalid(
        formElement,
        formElement.querySelector<HTMLElement>(".form-error-summary"),
      );
      return;
    }
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      const next = {
        id: crypto.randomUUID(),
        expectedVersion: version,
        action: expenseActionSchema.parse(makeAction()),
      };
      const result = await apiJSON<CommandResult>("/preview", {
        method: "POST",
        body: JSON.stringify(next),
      });
      command.current = next;
      setPreview(result);
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  function reportError(e: unknown) {
    if (e instanceof ZodError) setFieldErrors(fieldErrorsFromIssues(e.issues));
    else if (e instanceof RequestError && e.fieldErrors)
      setFieldErrors(e.fieldErrors);
    setError(
      e instanceof ZodError
        ? tr("Kiểm tra các trường được đánh dấu.")
        : e instanceof Error
          ? e.message
          : tr("Không thể lưu. Vui lòng thử lại."),
    );
    setConflict(e instanceof RequestError && e.code === "VERSION_CONFLICT");
    toast(
      "error",
      e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
    );
    focusFirstInvalid(
      document.querySelector(".expense-dialog[open]:not([inert]) .dialog-body"),
      errorRef.current,
    );
  }
  async function commit() {
    if (!command.current) return;
    setBusy(true);
    setError("");
    try {
      await apiJSON<CommandResult>("/commands", {
        method: "POST",
        body: JSON.stringify(command.current),
      });
      toast("success", tr("Đã lưu thay đổi."));
      await onSaved();
    } catch (e) {
      const unknownWrite =
        !(e instanceof RequestError) ||
        e.status === undefined ||
        e.status === 0 ||
        e.status >= 500 ||
        e.code === "INVALID_RESPONSE";
      if (unknownWrite) {
        setUncertain(true);
        setError(
          tr(
            "Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và xác nhận lại cùng yêu cầu.",
          ),
        );
        toast(
          "warning",
          tr("Chưa xác nhận được kết quả lưu. Thử lại cùng yêu cầu."),
        );
      } else reportError(e);
    } finally {
      setBusy(false);
    }
  }
  async function updateVersion() {
    setBusy(true);
    try {
      const next = await onReload();
      setVersion(next.book?.version ?? 0);
      setPreview(null);
      command.current = null;
      setConflict(false);
      setError("");
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  const formId = useId();
  return (
    <>
      <ExpenseModal
        title={localizedTitles[editor.mode]}
        onClose={onClose}
        busy={busy || uncertain}
        size={
          ["deleteSpend", "deleteLabel", "closeYear"].includes(editor.mode)
            ? "confirm"
            : preview?.changes.length && editor.mode !== "emoji"
              ? "detail"
              : "form"
        }
        footer={
          <div className="expense-actions">
            <button
              form={formId}
              className="expense-secondary"
              type="button"
              disabled={busy || uncertain}
              onClick={onClose}
            >
              <X size={17} aria-hidden="true" />
              {tr("Hủy")}
            </button>
            {preview && (
              <button
                form={formId}
                aria-busy={busy}
                type="button"
                className={`expense-primary ${["deleteSpend", "deleteLabel"].includes(editor.mode) ? "expense-danger" : editor.mode === "stop" ? "expense-warning" : ""}`}
                disabled={
                  busy || conflict || unchanged || (moneyForm && hidden)
                }
                onClick={commit}
              >
                {busy ? (
                  <LoadingSpinner />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {busy
                  ? tr("Đang lưu…")
                  : editor.mode === "closeYear"
                    ? tr("Xác nhận chốt năm")
                    : tr("Xác nhận lưu")}
              </button>
            )}
            {!preview && (
              <button
                form={formId}
                aria-busy={busy}
                className={`expense-primary ${["deleteSpend", "deleteLabel"].includes(editor.mode) ? "expense-danger" : editor.mode === "stop" ? "expense-warning" : ""}`}
                disabled={busy || unchanged || (moneyForm && hidden)}
              >
                {busy ? (
                  <LoadingSpinner />
                ) : (
                  <ScanEye size={17} aria-hidden="true" />
                )}
                {busy ? tr("Đang kiểm tra…") : tr("Xem trước thay đổi")}
              </button>
            )}
          </div>
        }
      >
        <ExpenseErrors.Provider value={fieldErrors}>
          <form
            id={formId}
            className="expense-form"
            noValidate
            onSubmit={prepare}
            onChange={(event) => {
              const target = event.target as unknown as HTMLInputElement;
              const key =
                target.name || target.id.replace("expense-field-", "");
              setFieldErrors((previous) => {
                const next = { ...previous };
                delete next[key];
                return next;
              });
              setPreview(null);
              command.current = null;
            }}
          >
            <RequiredFieldsNote />
            {uncertain && (
              <p role="status" className="expense-notice">
                {tr(
                  "Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và bấm Xác nhận lưu để kiểm tra lại cùng yêu cầu.",
                )}
              </p>
            )}
            <PrivacyReveal />
            <HelpButton
              pageId="budgets"
              sectionId={
                editor.mode === "label" || editor.mode === "deleteLabel"
                  ? "classification"
                  : editor.mode === "month"
                    ? "balance"
                    : editor.mode === "closeYear"
                      ? "closed-year"
                      : "jar-types"
              }
              label={tr("Hiểu hũ và cách tính tiền")}
            />
            <FormErrorSummary errors={fieldErrors} prefix="expense-field-" />
            <fieldset
              className="dialog-form-section"
              disabled={busy || uncertain}
            >
              <legend>{tr("Thông tin cần nhập")}</legend>
              {["create", "configure", "label"].includes(editor.mode) && (
                <HelpButton
                  pageId="budgets"
                  sectionId="classification"
                  label={tr("Phương thức và nhóm mục đích")}
                />
              )}
              {row && (
                <p className="expense-muted">
                  <strong>{row.name}</strong> · {monthName(row.month, locale)}
                </p>
              )}
              {editor.mode === "initialize" && (
                <p>
                  {tr(
                    "Chọn tháng bắt đầu. Những tháng trước đó sẽ không được tự tạo thực chi. Bạn nhập số dư đầu kỳ khi thêm từng hũ.",
                  )}
                </p>
              )}
              {["initialize", "create", "configure", "stop", "emoji"].includes(
                editor.mode,
              ) && (
                <label>
                  {editor.mode === "initialize" || editor.mode === "create"
                    ? tr("Tháng bắt đầu")
                    : tr("Áp dụng từ tháng")}
                  <span className="required-mark" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="month"
                    aria-label={
                      editor.mode === "initialize" || editor.mode === "create"
                        ? tr("Tháng bắt đầu")
                        : tr("Áp dụng từ tháng")
                    }
                    name={
                      editor.mode === "initialize" || editor.mode === "create"
                        ? "start"
                        : "month"
                    }
                    id={
                      editor.mode === "initialize" || editor.mode === "create"
                        ? "expense-field-start"
                        : "expense-field-month"
                    }
                    aria-invalid={!!(fieldErrors.start || fieldErrors.month)}
                    aria-describedby={
                      fieldErrors.start || fieldErrors.month
                        ? editor.mode === "initialize" ||
                          editor.mode === "create"
                          ? "expense-error-start"
                          : "expense-error-month"
                        : undefined
                    }
                    value={period}
                    required
                    min={
                      editor.mode === "initialize"
                        ? "2000-01"
                        : (jar?.start ?? view.book?.start)
                    }
                    max={
                      editor.mode === "initialize"
                        ? view.today.slice(0, 7)
                        : `${view.currentYear}-12`
                    }
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                  {(fieldErrors.start || fieldErrors.month) && (
                    <small
                      id={
                        editor.mode === "initialize" || editor.mode === "create"
                          ? "expense-error-start"
                          : "expense-error-month"
                      }
                      className="field-error"
                    >
                      {tr(fieldErrors.start || fieldErrors.month)}
                    </small>
                  )}
                </label>
              )}
              {(editor.mode === "create" || editor.mode === "emoji") && (
                <EmojiPicker
                  value={emoji}
                  onChange={(value) => {
                    setEmoji(value);
                    setPreview(null);
                    command.current = null;
                  }}
                  name={name}
                  kind={row?.kind ?? kind}
                />
              )}
              {(editor.mode === "create" || editor.mode === "configure") && (
                <>
                  <label>
                    {tr("Tên hũ")}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                    <input
                      required
                      maxLength={100}
                      aria-label={tr("Tên hũ")}
                      id="expense-field-name"
                      name="name"
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={
                        fieldErrors.name ? "expense-error-name" : undefined
                      }
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {fieldErrors.name && (
                      <small id="expense-error-name" className="field-error">
                        {tr(fieldErrors.name)}
                      </small>
                    )}
                  </label>
                  <label>
                    {tr("Mô tả")}
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                  {editor.mode === "create" ? (
                    <label>
                      {tr("Loại hũ")}
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value as typeof kind)}
                      >
                        <option value="monthly">{tr("Chi trong tháng")}</option>
                        <option value="accumulation">{tr("Tích lũy")}</option>
                      </select>
                    </label>
                  ) : (
                    <p className="expense-muted">
                      {tr("Loại hũ được giữ nguyên để bảo toàn lịch sử.")}
                    </p>
                  )}
                  <div className="expense-form-grid">
                    <LabelSelect
                      name={tr("Phương thức")}
                      value={method}
                      onChange={setMethod}
                      labels={selectionView.book?.labels ?? []}
                      kind="method"
                      error={fieldErrors.method}
                    />
                    <LabelSelect
                      name={tr("Nhóm mục đích (tùy chọn)")}
                      value={group}
                      onChange={setGroup}
                      labels={selectionView.book?.labels ?? []}
                      kind="group"
                      error={fieldErrors.group}
                    />
                  </div>
                  <button
                    type="button"
                    className="expense-secondary"
                    onClick={() => setClassifying(true)}
                  >
                    <Plus size={17} aria-hidden="true" />
                    {tr("Thêm phương thức / nhóm")}
                  </button>
                  <Amount
                    label={tr("Mức mặc định mỗi tháng")}
                    value={amount}
                    onChange={setAmount}
                  />
                  {editor.mode === "create" && (
                    <Amount
                      label={tr("Số dư đầu kỳ")}
                      field="opening"
                      value={opening}
                      onChange={setOpening}
                      hint={tr(
                        "Tiền đã có, không tính là góp mới hoặc thực chi.",
                      )}
                    />
                  )}
                  {editor.mode === "configure" && (
                    <p className="expense-notice">
                      {tr(
                        "Cấu hình mới có hiệu lực từ tháng đã chọn. Các ngoại lệ riêng của tháng khác vẫn được giữ.",
                      )}
                    </p>
                  )}
                </>
              )}
              {editor.mode === "month" && (
                <>
                  <p>
                    {tr("Mức mặc định:")} {money(rule?.amount ?? "0")}
                    {tr(". Cần thêm theo số dư chuyển tiếp:")}{" "}
                    {money(row!.required)}.
                  </p>
                  <Amount
                    label={tr("Mức riêng tháng này (để trống = mặc định)")}
                    optional
                    field="target"
                    value={target}
                    onChange={setTarget}
                  />
                  {!future && (
                    <>
                      <Amount
                        label={tr("Tiền thêm theo tháng (để trống = tự tính)")}
                        optional
                        field="funding"
                        value={funding}
                        onChange={setFunding}
                      />
                      <Amount
                        label={tr("Tiền bổ sung ngoài mức tháng")}
                        field="extra"
                        value={extra}
                        onChange={setExtra}
                      />
                      {row?.kind === "monthly" && (
                        <Amount
                          label={tr("Số dư cuối tháng")}
                          optional
                          field="closing"
                          value={closing}
                          onChange={setClosing}
                          hint={
                            row.active
                              ? tr("Để trống mặc định là 0.")
                              : tr(
                                  "Hũ đã ngừng: để trống giữ nguyên tiền còn lại.",
                                )
                          }
                        />
                      )}
                    </>
                  )}
                  {future && (
                    <p className="expense-notice">
                      {tr(
                        "Đây là tháng tương lai. Chỉ mức kế hoạch được thay đổi.",
                      )}
                    </p>
                  )}
                </>
              )}
              {editor.mode === "spend" && (
                <>
                  <p>
                    {tr(
                      "Góp vào đầu tháng; mỗi lần sử dụng sẽ được kiểm tra theo thứ tự ngày phát sinh.",
                    )}
                  </p>
                  <label>
                    {tr("Ngày sử dụng")}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                    <input
                      type="date"
                      aria-label={tr("Ngày sử dụng")}
                      id="expense-field-date"
                      name="date"
                      aria-invalid={!!fieldErrors.date}
                      aria-describedby={
                        fieldErrors.date ? "expense-error-date" : undefined
                      }
                      required
                      min={`${jar?.start}-01`}
                      max={view.today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    {fieldErrors.date && (
                      <small id="expense-error-date" className="field-error">
                        {tr(fieldErrors.date)}
                      </small>
                    )}
                  </label>
                  <Amount
                    label={tr("Số tiền sử dụng")}
                    value={amount}
                    onChange={setAmount}
                  />
                  <label>
                    {tr("Ghi chú")}
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                </>
              )}
              {editor.mode === "label" && (
                <>
                  <label>
                    {tr("Loại")}
                    {label ? (
                      <span className="form-readonly-value">
                        {labelKind === "method"
                          ? tr("Phương thức")
                          : tr("Nhóm mục đích")}
                      </span>
                    ) : (
                      <select
                        value={labelKind}
                        onChange={(e) =>
                          setLabelKind(e.target.value as typeof labelKind)
                        }
                      >
                        <option value="method">{tr("Phương thức")}</option>
                        <option value="group">{tr("Nhóm mục đích")}</option>
                      </select>
                    )}
                  </label>
                  <label>
                    {tr("Tên")}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                    <input
                      required
                      maxLength={100}
                      aria-label={tr("Tên")}
                      id="expense-field-name"
                      name="name"
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={
                        fieldErrors.name ? "expense-error-name" : undefined
                      }
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {fieldErrors.name && (
                      <small id="expense-error-name" className="field-error">
                        {tr(fieldErrors.name)}
                      </small>
                    )}
                  </label>
                  {labelKind === "method" && (
                    <label>
                      {tr("Thương hiệu")}
                      <select
                        aria-label={tr("Thương hiệu")}
                        value={brandKey}
                        onChange={(e) => {
                          setBrandKey(e.target.value);
                          if (e.target.value) setIconKey("");
                        }}
                      >
                        <option value="">{tr("Không chọn thương hiệu")}</option>
                        {paymentBrands.map((brand) => (
                          <option key={brand.key} value={brand.key}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {labelKind === "method" &&
                    !brandKey &&
                    suggestedBrand(name) && (
                      <button
                        type="button"
                        className="expense-secondary"
                        onClick={() => {
                          setBrandKey(suggestedBrand(name)!.key);
                          setIconKey("");
                        }}
                      >
                        <Tag size={17} aria-hidden="true" />
                        {tr("Dùng logo")} {suggestedBrand(name)!.name}
                      </button>
                    )}
                  {!brandKey && (
                    <label>
                      {tr("Biểu tượng")}
                      <select
                        aria-label={tr("Biểu tượng")}
                        value={iconKey}
                        onChange={(e) => setIconKey(e.target.value)}
                      >
                        <option value="">{tr("Tự động theo tên")}</option>
                        {Object.entries(localize(labelIcons)).map(
                          ([key, item]) => (
                            <option value={key} key={key}>
                              {item.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  <p className="label-name">
                    <LabelVisual
                      name={name}
                      label={{
                        id: label?.id ?? "",
                        kind: labelKind,
                        name,
                        brandKey: brandKey || null,
                        iconKey: iconKey || null,
                      }}
                      kind={labelKind}
                    />
                    {name || tr("Xem trước biểu tượng")}
                  </p>
                  <p className="expense-muted">
                    {tr(
                      "Chỉ các lựa chọn trong danh sách này được dùng khi thêm hũ. Sửa tên không đổi phân loại đã lưu của những tháng trước.",
                    )}
                  </p>
                </>
              )}
              {editor.mode === "stop" && (
                <p>
                  {tr(
                    "Ngừng tự cấp tiền từ tháng đã chọn. Số dư, lịch sử và các lần sử dụng vẫn được giữ; có thể khôi phục bằng cách sửa cấu hình từ một tháng chưa chốt.",
                  )}
                </p>
              )}
              {editor.mode === "deleteSpend" && (
                <p>
                  {tr("Xóa lần sử dụng")} {money(editor.spend.amount)}{" "}
                  {tr("ngày")} {formatDate(editor.spend.date!, locale)}
                  {tr(
                    ". Số dư từ ngày này sẽ được tính lại; lịch sử xóa vẫn được giữ.",
                  )}
                </p>
              )}
              {editor.mode === "deleteLabel" && (
                <p>
                  {tr("Xóa lựa chọn “")}
                  {editor.label.name}
                  {tr("”. Phân loại trong lịch sử các hũ không bị xóa.")}
                </p>
              )}
              {editor.mode === "closeYear" && (
                <p>
                  {tr("Năm")} {editor.year}{" "}
                  {tr(
                    "sẽ được khóa để lưu trữ. Số dư đã chuyển tiếp được giữ; sau chốt chỉ có thể xem và xuất backup. Hãy hoàn tất số dư tháng 12 và các lần sử dụng trước khi chốt.",
                  )}
                </p>
              )}
              <p
                role="alert"
                ref={errorRef}
                tabIndex={-1}
                className="expense-error"
              >
                {tr(error)}
              </p>
              {conflict && (
                <button
                  type="button"
                  className="expense-secondary"
                  disabled={busy}
                  onClick={updateVersion}
                >
                  {tr("Tải dữ liệu mới, giữ nội dung đang nhập")}
                </button>
              )}
            </fieldset>
            {preview && (
              <DialogPreview className="expense-preview">
                <h3>{tr("Xem trước trước khi lưu")}</h3>
                <p>
                  {editor.mode === "emoji"
                    ? tr(
                        "Biểu tượng mới: {0}. Mức tháng và số dư được giữ nguyên.",
                        { 0: jarEmoji(name, row?.kind, emoji) },
                      )
                    : preview.changes.length
                      ? tr(
                          "{0} dòng tháng được cập nhật. Số dư các tháng sau đã được kiểm tra.",
                          { 0: preview.changes.length },
                        )
                      : tr(
                          "Thay đổi hợp lệ. Không có số tiền tháng nào bị thay đổi.",
                        )}
                </p>
                {preview.changes.length > 0 && editor.mode !== "emoji" && (
                  <DialogChanges
                    numeric
                    rows={preview.changes
                      .slice()
                      .sort((a, b) => b.month.localeCompare(a.month))
                      .flatMap((change) =>
                        (["funding", "spent", "closing"] as const).map(
                          (field) => ({
                            key: `${change.jarId}/${change.month}/${field}`,
                            period: monthName(change.month, locale),
                            subject: change.name,
                            label: {
                              funding: tr("Tiền thêm"),
                              spent: tr("Thực chi"),
                              closing: tr("Số dư"),
                            }[field],
                            before: change.before
                              ? money(change.before[field])
                              : tr("Chưa có"),
                            after: change.after
                              ? money(change.after[field])
                              : tr("Đã bỏ dòng"),
                          }),
                        ),
                      )}
                  />
                )}
              </DialogPreview>
            )}
          </form>
        </ExpenseErrors.Provider>
      </ExpenseModal>
      {classifying && (
        <ExpenseEditor
          editor={{ mode: "label" }}
          view={selectionView}
          month={month}
          onClose={() => setClassifying(false)}
          onReload={onReload}
          onSaved={async () => {
            let next: ExpenseView;
            try {
              next = await onReload();
            } catch {
              toast(
                "warning",
                tr("Đã lưu phân loại nhưng chưa tải lại được dữ liệu."),
              );
              setClassifying(false);
              return;
            }
            const added = next.book?.labels.find(
              (item) =>
                !selectionView.book?.labels.some(
                  (previous) => previous.id === item.id,
                ),
            );
            setSelectionView(next);
            setVersion(next.book?.version ?? version);
            setClassifying(false);
            setPreview(null);
            command.current = null;
            if (added?.kind === "method") setMethod(added.name);
            if (added?.kind === "group") setGroup(added.name);
          }}
        />
      )}
    </>
  );
}
