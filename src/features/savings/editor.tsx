"use client";
import { LocalizedInput } from "@/components/localized-input";
import { formatDate } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import type { CommandResult } from "@/application/savings";
import {
  decimalLabel,
  DialogChanges,
  DialogPreview,
} from "@/components/dialog-content";
import {
  focusFirstInvalid,
  FormErrorSummary,
} from "@/components/form-feedback";
import { LoadingSpinner } from "@/components/loading";
import { MoneyHint } from "@/components/money-hint";
import {
  PrivacyReveal,
  PrivacyScope,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import { useToast } from "@/components/toast";
import {
  nextMonth,
  quantity,
  quantityText,
  replay,
  ruleAt,
} from "@/domain/savings/engine";
import {
  actionSchema,
  transactionSchema,
  type SavingsAction,
  type SavingsCommand,
  type SavingsTransaction,
} from "@/domain/savings/schema";
import type { SavingsCategory, SavingsView } from "@/domain/savings/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { HelpButton } from "@/features/help/provider";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import {
  comparable,
  normalizedMoneyFields,
  normalizeInteger,
} from "@/lib/form-values";
import { Save, ScanEye, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ZodError } from "zod";
import { SavingsAPIError, savingsJSON } from "./api";
export const transactionNames: Record<SavingsTransaction["kind"], string> = {
  openingCash: "Số dư tiền mở đầu",
  openingDeposit: "Sổ tiền gửi mở đầu",
  openingGold: "Vàng mở đầu",
  deposit: "Nạp tiền từ ngoài",
  withdraw: "Rút tiền ra ngoài",
  transfer: "Chuyển tiền nội bộ",
  openDeposit: "Mở sổ tiền gửi",
  withdrawDeposit: "Rút gốc / tất toán",
  interest: "Nhận lãi",
  rollover: "Tái tục sổ",
  buyGold: "Mua vàng",
  sellGold: "Bán vàng",
  fee: "Phí từ ví tiền",
};
export const kindNames = {
  cash: "Tiền / ví",
  deposit: "Tiền gửi",
  gold: "Vàng",
};
export type EditorMode =
  | { type: "create" }
  | { type: "configure" | "archive" | "restore"; category: SavingsCategory }
  | {
      type: "transaction";
      transaction?: SavingsTransaction;
      categoryId?: string;
      kind?: SavingsTransaction["kind"];
    }
  | { type: "void"; transaction: SavingsTransaction }
  | { type: "price"; categoryId?: string }
  | { type: "close" | "reopen" };
const titles = {
  create: "Thêm danh mục",
  configure: "Sửa danh mục",
  archive: "Lưu trữ danh mục",
  restore: "Khôi phục danh mục",
  transaction: "Ghi giao dịch",
  void: "Hủy giao dịch",
  price: "Cập nhật giá vàng",
  close: "Chốt tháng",
  reopen: "Mở lại tháng",
};
export function SavingsEditor(props: Parameters<typeof EditorForm>[0]) {
  return (
    <PrivacyScope>
      <EditorForm {...props} />
    </PrivacyScope>
  );
}
function EditorForm({
  mode,
  view,
  month,
  onClose,
  onSaved,
  onReload,
}: {
  mode: EditorMode;
  view: SavingsView;
  month: string;
  onClose(): void;
  onSaved(): Promise<void>;
  onReload(): Promise<unknown>;
}) {
  const { t: tr, locale, config: localize } = useI18n("savings");
  const localizedTitles = localize(titles);
  const localizedKindNames = localize(kindNames);
  const localizedTransactionNames = localize(transactionNames);

  const toast = useToast();
  const hidden = useMoneyHidden(),
    money = useMoney(),
    old = "transaction" in mode ? mode.transaction : undefined;
  const category = "category" in mode ? mode.category : undefined;
  const rule = category
    ? (ruleAt(category, month) ?? category.rules[0])
    : undefined;
  const first =
    view.book?.categories.find(
      (c) => c.kind === (mode.type === "price" ? "gold" : "cash"),
    ) ?? view.book?.categories[0];
  const [f, setF] = useState<Record<string, string>>(() => ({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    emoji: rule?.emoji ?? "🌱",
    month: mode.type === "archive" ? nextMonth(month) : month,
    kind: category?.kind ?? "cash",
    unit: category?.unit ?? "",
    transactionKind:
      old?.kind ??
      (mode.type === "transaction" ? mode.kind : undefined) ??
      (first?.kind === "gold"
        ? "buyGold"
        : first?.kind === "deposit"
          ? "openDeposit"
          : "deposit"),
    categoryId:
      old?.categoryId ??
      (mode.type === "transaction" ? mode.categoryId : undefined) ??
      (mode.type === "price" ? mode.categoryId : undefined) ??
      first?.id ??
      "",
    date:
      old?.date ??
      (month === view.today.slice(0, 7) ? view.today : `${month}-01`),
    amount: "",
    quantity: "",
    unitPrice: "",
    fee: "0",
    tax: "0",
    interest: "0",
    reinvestInterest: "0",
    cashCategoryId: "",
    contractId: "",
    maturity: view.today,
    term: "",
    note: "",
    reason: "",
    capitalize: "true",
    acceptStalePrices: "false",
    ...Object.fromEntries(
      Object.entries(old ?? {}).filter(([, v]) => typeof v === "string"),
    ),
    ...(old?.kind === "interest" ? { capitalize: String(old.capitalize) } : {}),
  }));
  const [allocations, setAllocations] = useState<Record<string, string>>(
    old?.kind === "sellGold"
      ? Object.fromEntries(old.allocations.map((a) => [a.lotId, a.quantity]))
      : {},
  );
  const transactionId = useRef(old?.id ?? crypto.randomUUID()),
    entityId = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<{
    command: SavingsCommand;
    result: CommandResult;
  } | null>(null);
  const pending = useRef<SavingsCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({
    ...normalizedMoneyFields(f),
    reason: undefined,
    allocations,
  });
  const originalDraft = useRef(draft);
  const unchanged =
    (mode.type === "configure" || (mode.type === "transaction" && !!old)) &&
    draft === originalDraft.current;
  const set = (key: string, value: string) => {
    setF((s) => ({ ...s, [key]: value }));
    setPreview(null);
    setError("");
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };
  const categories = view.book?.categories ?? [];
  const names = (c: SavingsCategory) =>
    (ruleAt(c, f.date.slice(0, 7)) ?? c.rules[0]).name;
  const txKind = f.transactionKind as SavingsTransaction["kind"];
  let inventory = view.state;
  if (view.book) {
    try {
      inventory = replay(
        {
          ...view.book,
          revisions: old
            ? view.book.revisions.filter((r) => r.rootId !== old.id)
            : view.book.revisions,
        },
        f.date <= view.today ? f.date : view.today,
      );
    } catch {
      /* Preview validates dependent transactions; keep the draft editable. */
    }
  }
  const [saleQuantity, setSaleQuantity] = useState("");
  const saleLots = inventory.lots
    .filter((l) => l.categoryId === f.categoryId)
    .sort((a, b) => a.date.localeCompare(b.date));
  function suggestLots() {
    try {
      let remaining = quantity(saleQuantity);
      if (remaining <= 0n)
        throw new Error(tr("Nhập lượng muốn bán lớn hơn 0."));
      const next: Record<string, string> = {};
      for (const lot of saleLots) {
        const q = quantity(lot.quantity),
          part = q < remaining ? q : remaining;
        if (part > 0n) {
          next[lot.id] = quantityText(part);
          remaining -= part;
        }
      }
      if (remaining > 0n)
        throw new Error(tr("Lượng muốn bán vượt lượng vàng còn giữ."));
      setAllocations(next);
      setPreview(null);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Kiểm tra số lượng muốn bán."),
      );
    }
  }
  const txAsset = txKind.includes("Gold")
    ? "gold"
    : [
          "openingDeposit",
          "openDeposit",
          "withdrawDeposit",
          "interest",
          "rollover",
        ].includes(txKind)
      ? "deposit"
      : "cash";
  const selectedCategory = categories.find((c) => c.id === f.categoryId);
  const hasWallet = [
    "transfer",
    "openDeposit",
    "withdrawDeposit",
    "interest",
    "rollover",
    "buyGold",
    "sellGold",
  ].includes(txKind);
  const hasAmount = [
    "openingCash",
    "openingDeposit",
    "openingGold",
    "deposit",
    "withdraw",
    "transfer",
    "openDeposit",
    "withdrawDeposit",
    "interest",
    "fee",
  ].includes(txKind);
  const hasCharges = [
    "withdraw",
    "transfer",
    "withdrawDeposit",
    "rollover",
    "buyGold",
    "sellGold",
  ].includes(txKind);
  const hasContract = ["withdrawDeposit", "interest", "rollover"].includes(
    txKind,
  );
  const opensContract = ["openingDeposit", "openDeposit", "rollover"].includes(
    txKind,
  );
  function transaction(): SavingsTransaction {
    const b = {
        id: transactionId.current,
        date: f.date,
        categoryId: f.categoryId,
        note: f.note,
      },
      cash = { cashCategoryId: f.cashCategoryId || null },
      charges = { fee: normalizeInteger(f.fee), tax: normalizeInteger(f.tax) },
      contract = { name: f.name, maturity: f.maturity, term: f.term };
    switch (txKind) {
      case "openingCash":
      case "deposit":
      case "fee":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
        });
      case "openingDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...contract,
        });
      case "openingGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          quantity: f.quantity,
          unitPrice: normalizeInteger(f.unitPrice),
        });
      case "withdraw":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...charges,
        });
      case "transfer":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          cashCategoryId: f.cashCategoryId,
          ...charges,
        });
      case "openDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: normalizeInteger(f.amount),
          ...contract,
          ...cash,
        });
      case "withdrawDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: normalizeInteger(f.amount),
          interest: normalizeInteger(f.interest),
          ...charges,
          ...cash,
        });
      case "interest":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: normalizeInteger(f.amount),
          capitalize: f.capitalize === "true",
          cashCategoryId: f.capitalize === "true" ? null : cash.cashCategoryId,
        });
      case "rollover":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          interest: normalizeInteger(f.interest),
          reinvestInterest: normalizeInteger(f.reinvestInterest),
          ...contract,
          ...charges,
          ...cash,
        });
      case "buyGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          quantity: f.quantity,
          unitPrice: normalizeInteger(f.unitPrice),
          ...charges,
          ...cash,
        });
      case "sellGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          allocations: Object.entries(allocations)
            .filter(([, q]) => q && q !== "0")
            .map(([lotId, quantity]) => ({ lotId, quantity })),
          unitPrice: normalizeInteger(f.unitPrice),
          ...charges,
          ...cash,
        });
    }
  }
  function action(): SavingsAction {
    const metadata = {
      name: f.name,
      description: f.description,
      emoji: f.emoji,
    };
    switch (mode.type) {
      case "create":
        return actionSchema.parse({
          type: "createCategory",
          id: entityId.current,
          start: f.month,
          kind: f.kind,
          unit: f.kind === "gold" ? f.unit : null,
          ...metadata,
        });
      case "configure":
        return {
          type: "configureCategory",
          categoryId: mode.category.id,
          month: f.month,
          ...metadata,
        };
      case "archive":
      case "restore":
        return {
          type: mode.type === "archive" ? "archiveCategory" : "restoreCategory",
          categoryId: mode.category.id,
          month: f.month,
        };
      case "price":
        return {
          type: "setPrice",
          id: entityId.current,
          categoryId: f.categoryId,
          date: f.date,
          price: normalizeInteger(f.unitPrice),
        };
      case "close":
        return {
          type: "closeMonth",
          month: f.month,
          acceptStalePrices: f.acceptStalePrices === "true",
        };
      case "reopen":
        return { type: "reopenMonth", month: f.month, reason: f.reason };
      case "void":
        return {
          type: "reviseTransaction",
          transactionId: mode.transaction.id,
          replacement: null,
          reason: f.reason,
        };
      case "transaction":
        return old
          ? {
              type: "reviseTransaction",
              transactionId: old.id,
              replacement: transaction(),
              reason: f.reason,
            }
          : { type: "postTransaction", transaction: transaction() };
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const a = actionSchema.parse(action());
      const command =
        pending.current &&
        JSON.stringify(pending.current.action) === JSON.stringify(a)
          ? pending.current
          : {
              id: crypto.randomUUID(),
              expectedVersion: view.book?.version ?? 0,
              action: a,
            };
      pending.current = command;
      if (!preview || preview.command.id !== command.id)
        setPreview({
          command,
          result: await savingsJSON<CommandResult>("/preview", command),
        });
      else {
        writing = true;
        await savingsJSON("/commands", command);
        toast("success", tr("Đã lưu thay đổi."));
        await onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof SavingsAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite) setUncertain(true);
      if (e instanceof ZodError)
        setFieldErrors(fieldErrorsFromIssues(e.issues));
      else if (e instanceof SavingsAPIError && e.fieldErrors)
        setFieldErrors(e.fieldErrors);
      setError(
        e instanceof ZodError
          ? tr("Kiểm tra các trường được đánh dấu.")
          : e instanceof Error
            ? e.message
            : tr("Không thể lưu."),
      );
      if (e instanceof SavingsAPIError && e.code === "VERSION_CONFLICT") {
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
          ? tr("Chưa xác nhận được kết quả lưu. Thử lại cùng yêu cầu.")
          : e instanceof Error
            ? e.message
            : tr("Chưa hoàn tất. Hãy thử lại."),
      );
    } finally {
      setBusy(false);
    }
  }
  const sensitive = mode.type === "transaction" || mode.type === "price";
  function input(
    key: string,
    label: string,
    type = "text",
    secret = false,
    required = true,
  ) {
    return (
      <label key={key} htmlFor={`savings-field-${key}`}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        <LocalizedInput
          aria-label={label}
          id={`savings-field-${key}`}
          name={key}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            [
              secret && key !== "quantity" ? `savings-hint-${key}` : "",
              fieldErrors[key] ? `savings-error-${key}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          type={secret && hidden ? "password" : type}
          inputMode={secret ? "decimal" : undefined}
          value={secret && hidden ? "••••••" : f[key]}
          disabled={busy || (secret && hidden)}
          numberKind={
            secret ? (key === "quantity" ? "decimal" : "integer") : undefined
          }
          onValueChange={(value) => set(key, value)}
          onBlur={() => {
            if (secret && key !== "quantity")
              set(key, normalizeInteger(f[key]));
          }}
          required={required}
          autoComplete="off"
          max={
            type === "date" && !["maturity"].includes(key)
              ? view.today
              : undefined
          }
        />
        {secret && key !== "quantity" && (
          <MoneyHint id={`savings-hint-${key}`} value={f[key]} />
        )}
        {fieldErrors[key] && (
          <small id={`savings-error-${key}`} className="field-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  function select(key: string, label: string, options: ReactNode) {
    return (
      <label>
        {label}
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <select
          id={`savings-field-${key}`}
          required
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            fieldErrors[key] ? `savings-error-${key}` : undefined
          }
          aria-label={label}
          value={f[key]}
          onChange={(e) => {
            set(key, e.target.value);
            if (key === "transactionKind") {
              const k = e.target.value;
              const asset = k.includes("Gold")
                ? "gold"
                : [
                      "openingDeposit",
                      "openDeposit",
                      "withdrawDeposit",
                      "interest",
                      "rollover",
                    ].includes(k)
                  ? "deposit"
                  : "cash";
              set(
                "categoryId",
                categories.find((c) => c.kind === asset)?.id ?? "",
              );
              set("cashCategoryId", "");
              set("contractId", "");
              setAllocations({});
            }
          }}
          disabled={busy}
        >
          {options}
        </select>
        {fieldErrors[key] && (
          <small id={`savings-error-${key}`} className="field-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  const formId = useId();
  return (
    <ExpenseModal
      title={
        old && mode.type === "transaction"
          ? tr("Sửa giao dịch có lịch sử")
          : localizedTitles[mode.type]
      }
      onClose={onClose}
      busy={busy || uncertain}
      size={mode.type === "void" ? "confirm" : "form"}
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={onClose}
            disabled={busy || uncertain}
          >
            <X size={17} aria-hidden="true" /> {tr("Hủy")}
          </button>
          <button
            form={formId}
            aria-busy={busy}
            className={`expense-primary ${mode.type === "void" ? "expense-danger" : ""}`}
            disabled={busy || conflict || unchanged || (sensitive && hidden)}
          >
            {busy ? (
              <LoadingSpinner />
            ) : preview ? (
              <Save size={17} aria-hidden="true" />
            ) : (
              <ScanEye size={17} aria-hidden="true" />
            )}
            {busy
              ? tr("Đang xử lý…")
              : preview
                ? tr("Xác nhận lưu")
                : tr("Xem trước thay đổi")}
          </button>
        </div>
      }
    >
      <form
        id={formId}
        className="expense-form savings-form"
        noValidate
        onSubmit={submit}
      >
        <p className="required-fields-note">
          <span className="required-mark" aria-hidden="true">
            *
          </span>{" "}
          {tr("là thông tin cần nhập.")}
        </p>
        {uncertain && (
          <p role="status" className="expense-notice">
            {tr(
              "Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và bấm Xác nhận lưu để kiểm tra lại cùng yêu cầu.",
            )}
          </p>
        )}
        <PrivacyReveal />
        <HelpButton
          pageId="savings"
          sectionId={
            mode.type === "price"
              ? "valuation"
              : mode.type === "close" || mode.type === "reopen"
                ? "close-month"
                : mode.type === "transaction"
                  ? "tasks"
                  : "assets"
          }
          label={tr("Hiểu tài sản và giao dịch")}
        />
        <FormErrorSummary errors={fieldErrors} prefix="savings-field-" />
        {error && (
          <div
            className="expense-error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {tr(error)}
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
                pending.current = null;
                setPreview(null);
                setConflict(false);
                setError(
                  tr("Đã tải phiên bản mới. Kiểm tra rồi xem trước lại."),
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : tr("Chưa tải được dữ liệu."),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {tr("Tải dữ liệu mới, giữ nội dung nhập")}
          </button>
        )}
        <fieldset className="dialog-form-section" disabled={busy || uncertain}>
          <legend>{tr("Thông tin giao dịch / danh mục")}</legend>
          {["create", "configure"].includes(mode.type) && (
            <>
              {input("name", tr("Tên danh mục"))}
              {input("description", tr("Mô tả"), "text", false, false)}
              {select(
                "emoji",
                tr("Biểu tượng"),
                ["🌱", "💰", "🏦", "🪙", "💛", "🏡", "✈️", "🎯"].map((v) => (
                  <option key={v}>{v}</option>
                )),
              )}
              {mode.type === "create" && (
                <>
                  {select(
                    "kind",
                    tr("Loại tài sản"),
                    Object.entries(localizedKindNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    )),
                  )}
                  {f.kind === "gold" &&
                    select(
                      "unit",
                      tr("Đơn vị vàng"),
                      <>
                        <option value="">{tr("Chọn đơn vị")}</option>
                        {["chỉ", "lượng/cây", "gram"].map((v) => (
                          <option key={v} value={v}>
                            {tr(v)}
                          </option>
                        ))}
                      </>,
                    )}
                </>
              )}
            </>
          )}
          {[
            "create",
            "configure",
            "archive",
            "restore",
            "close",
            "reopen",
          ].includes(mode.type) &&
            input(
              "month",
              mode.type === "create"
                ? tr("Tháng bắt đầu")
                : tr("Tháng hiệu lực"),
              "month",
            )}
          {mode.type === "archive" && (
            <p className="expense-notice">
              {tr(
                "Chỉ lưu trữ sau khi xử lý hết tiền, vàng và sổ tiền gửi. Chọn tháng sau lần giao dịch cuối; lịch sử và báo cáo vẫn được giữ.",
              )}
            </p>
          )}
          {mode.type === "reopen" && (
            <p className="expense-notice">
              {tr(
                "Tháng được chọn và các tháng đã chốt sau đó sẽ cần chốt lại. Snapshot cũ vẫn được giữ.",
              )}
            </p>
          )}
          {mode.type === "close" && (
            <label className="savings-check">
              <input
                type="checkbox"
                checked={f.acceptStalePrices === "true"}
                onChange={(e) =>
                  set("acceptStalePrices", String(e.target.checked))
                }
              />
              {tr("Chấp nhận giá vàng mang từ tháng trước")}
            </label>
          )}
          {mode.type === "price" && (
            <>
              {select(
                "categoryId",
                tr("Danh mục vàng"),
                <>
                  <option value="">{tr("Chọn danh mục")}</option>
                  {categories
                    .filter((c) => c.kind === "gold")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {names(c)} · {tr(c.unit ?? "")}
                      </option>
                    ))}
                </>,
              )}
              {input("date", tr("Ngày giá"), "date")}
              {input(
                "unitPrice",
                tr("Giá bán lại dự kiến (VND/{0})", {
                  0: tr(selectedCategory?.unit ?? "đơn vị"),
                }),
                "text",
                true,
              )}
            </>
          )}
          {mode.type === "transaction" && (
            <>
              {select(
                "transactionKind",
                tr("Loại giao dịch"),
                Object.entries(localizedTransactionNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                )),
              )}
              {select(
                "categoryId",
                tr("Danh mục"),
                <>
                  <option value="">{tr("Chọn danh mục")}</option>
                  {categories
                    .filter((c) => c.kind === txAsset)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {names(c)}
                      </option>
                    ))}
                </>,
              )}
              {input("date", tr("Ngày giao dịch"), "date")}
              {txKind.startsWith("opening") && (
                <p className="expense-notice">
                  {tr(
                    "Tài sản có sẵn tại ngày bắt đầu theo dõi, không tính là tiền nạp mới.",
                  )}
                </p>
              )}
              {hasAmount &&
                input(
                  "amount",
                  txKind === "openingGold"
                    ? tr("Giá vốn mở đầu (VND)")
                    : txKind === "withdrawDeposit"
                      ? tr("Gốc rút (VND)")
                      : tr("Số tiền (VND)"),
                  "text",
                  true,
                )}
              {["openingGold", "buyGold"].includes(txKind) &&
                input(
                  "quantity",
                  tr("Số lượng ({0})", {
                    0: tr(selectedCategory?.unit ?? "đơn vị"),
                  }),
                  "text",
                  true,
                )}
              {["openingGold", "buyGold", "sellGold"].includes(txKind) &&
                input(
                  "unitPrice",
                  txKind === "buyGold"
                    ? tr("Giá mua mỗi đơn vị (VND)")
                    : tr("Giá bán lại mỗi đơn vị (VND)"),
                  "text",
                  true,
                )}
              {hasContract &&
                select(
                  "contractId",
                  tr("Sổ tiền gửi"),
                  <>
                    <option value="">{tr("Chọn sổ")}</option>
                    {inventory.contracts
                      .filter((c) => c.categoryId === f.categoryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.opened}
                        </option>
                      ))}
                  </>,
                )}
              {opensContract && (
                <>
                  {input("name", tr("Tên sổ"))}
                  {input("maturity", tr("Ngày đáo hạn"), "date")}
                  {input(
                    "term",
                    tr("Kỳ hạn / ghi chú sổ"),
                    "text",
                    false,
                    false,
                  )}
                </>
              )}
              {["withdrawDeposit", "rollover"].includes(txKind) &&
                input("interest", tr("Lãi thực nhận (VND)"), "text", true)}
              {txKind === "rollover" &&
                input(
                  "reinvestInterest",
                  tr("Lãi nhập sổ mới (VND)"),
                  "text",
                  true,
                )}
              {txKind === "interest" &&
                select(
                  "capitalize",
                  tr("Cách nhận lãi"),
                  <>
                    <option value="true">{tr("Nhập gốc sổ hiện tại")}</option>
                    <option value="false">{tr("Nhận tiền")}</option>
                  </>,
                )}
              {hasWallet &&
                !(txKind === "interest" && f.capitalize === "true") &&
                select(
                  "cashCategoryId",
                  ["buyGold", "openDeposit"].includes(txKind)
                    ? tr("Nguồn tiền")
                    : tr("Ví nhận tiền"),
                  <>
                    <option value="">
                      {txKind === "transfer"
                        ? tr("Chọn ví nhận")
                        : tr("Bên ngoài Tiết kiệm")}
                    </option>
                    {categories
                      .filter((c) => c.kind === "cash" && c.id !== f.categoryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {names(c)}
                        </option>
                      ))}
                  </>,
                )}
              {hasCharges && (
                <fieldset className="dialog-form-section">
                  <legend>{tr("Phí và thuế")}</legend>
                  <div className="savings-form-grid">
                    {input("fee", tr("Phí (VND)"), "text", true)}
                    {input("tax", tr("Thuế (VND)"), "text", true)}
                  </div>
                </fieldset>
              )}
              {txKind === "sellGold" && (
                <fieldset>
                  <legend>
                    {tr("Chọn đợt mua để bán · ưu tiên đợt cũ nhất")}
                  </legend>
                  <label>
                    {tr("Tổng lượng muốn bán (để gợi ý)")}
                    <LocalizedInput
                      numberKind="decimal"
                      type={hidden ? "password" : "text"}
                      inputMode="decimal"
                      disabled={hidden || busy}
                      value={hidden ? "••••••" : saleQuantity}
                      onValueChange={setSaleQuantity}
                    />
                  </label>
                  <button
                    type="button"
                    className="expense-secondary"
                    disabled={hidden || busy || !saleQuantity}
                    onClick={suggestLots}
                  >
                    {tr("Gợi ý theo đợt cũ nhất")}
                  </button>
                  {saleLots.map((l) => (
                    <label key={l.id}>
                      {tr("Đợt")} {formatDate(l.date!, locale)} {tr("· còn")}{" "}
                      {hidden ? "••••••" : decimalLabel(l.quantity, locale)}{" "}
                      {tr(selectedCategory?.unit ?? "")}
                      <LocalizedInput
                        numberKind="decimal"
                        aria-label={tr("Lượng bán đợt {0} {1}", {
                          0: l.date,
                          1: l.id.slice(0, 4),
                        })}
                        type={hidden ? "password" : "text"}
                        inputMode="decimal"
                        disabled={busy || hidden}
                        value={hidden ? "••••••" : (allocations[l.id] ?? "")}
                        placeholder="0"
                        onValueChange={(value) => {
                          setAllocations((a) => ({
                            ...a,
                            [l.id]: value,
                          }));
                          setPreview(null);
                        }}
                      />
                    </label>
                  ))}
                  <p className="expense-muted">
                    {tr(
                      "Nhập lượng bán vào một hoặc nhiều đợt; để trống những đợt không bán.",
                    )}
                  </p>
                </fieldset>
              )}
              {input("note", tr("Ghi chú"), "text", false, false)}
            </>
          )}
          {(mode.type === "reopen" ||
            mode.type === "void" ||
            (old && mode.type === "transaction")) &&
            input("reason", tr("Lý do thay đổi"))}
        </fieldset>
        {preview && (
          <DialogPreview className="savings-preview">
            <h3>{tr("Xem trước thay đổi")}</h3>
            <DialogChanges
              numeric
              rows={[
                {
                  key: "total",
                  label: tr("Tài sản tiết kiệm"),
                  before:
                    preview.result.before.total === null
                      ? tr("Thiếu định giá")
                      : money(preview.result.before.total),
                  after:
                    preview.result.after.total === null
                      ? tr("Thiếu định giá")
                      : money(preview.result.after.total),
                },
                ...preview.result.after.positions.flatMap((p) => {
                  const before = preview.result.before.positions.find(
                    (b) => b.id === p.id,
                  );
                  const fields =
                    p.kind === "gold"
                      ? (["value", "cost", "quantity"] as const)
                      : (["value"] as const);
                  return fields
                    .filter((field) => before?.[field] !== p[field])
                    .map((field) => ({
                      key: `${p.id}/${field}`,
                      label: `${p.name} · ${{ value: tr("Giá trị"), cost: tr("Giá vốn"), quantity: tr("Khối lượng") }[field]}`,
                      before:
                        field === "quantity"
                          ? `${hidden ? "••••••" : decimalLabel(before?.quantity ?? "0", locale)} ${tr(p.unit ?? "")}`
                          : before?.[field] === null
                            ? tr("Thiếu định giá")
                            : money(before?.[field] ?? "0"),
                      after:
                        field === "quantity"
                          ? `${hidden ? "••••••" : decimalLabel(p.quantity, locale)} ${tr(p.unit ?? "")}`
                          : p[field] === null
                            ? tr("Thiếu định giá")
                            : money(p[field]),
                    }));
                }),
              ]}
            />
          </DialogPreview>
        )}
      </form>
    </ExpenseModal>
  );
}
