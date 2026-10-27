"use client";
import { LocalizedInput } from "@/components/localized-input";
import { RequiredFieldsNote } from "@/components/required-fields-note";
import { useI18n } from "@/i18n/provider";

import type { CommandResult } from "@/application/investments";
import { DialogChanges, DialogPreview } from "@/components/dialog-content";
import { focusFirstInvalid } from "@/components/form-feedback";
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
  activeTransactions,
  replay,
  ruleAt,
} from "@/domain/investments/engine";
import {
  actionSchema,
  type InvestmentAction,
  type InvestmentCommand,
  type InvestmentTransaction,
} from "@/domain/investments/schema";
import type { InvestmentView } from "@/domain/investments/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { HelpButton } from "@/features/help/provider";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import {
  comparable,
  normalizedMoneyFields,
  normalizeInteger,
} from "@/lib/form-values";
import { Save, ScanEye, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { InvestmentAPIError, investmentsJSON } from "./api";
export const transactionNames: Record<InvestmentTransaction["kind"], string> = {
  openingCash: "Số dư ví mở đầu",
  openingInvestment: "Tài sản mở đầu",
  deposit: "Nạp tiền",
  withdraw: "Rút tiền",
  transfer: "Chuyển ví",
  buy: "Mua",
  sell: "Bán",
  valuation: "Định giá",
};
export type EditorMode = { categoryId?: string } & (
  | {
      type: "create" | "configure" | "archive" | "restore";
      categoryId?: string;
    }
  | {
      type: "transaction";
      kind?: InvestmentTransaction["kind"];
      categoryId?: string;
    }
  | { type: "revise" | "cancel"; transaction: InvestmentTransaction }
);
export function InvestmentEditor(props: {
  mode: EditorMode;
  view: InvestmentView;
  refresh: () => Promise<InvestmentView>;
  onSaved: () => void;
  onClose: () => void;
}) {
  return (
    <PrivacyScope>
      <Editor {...props} />
    </PrivacyScope>
  );
}
function Editor({
  mode,
  view: initial,
  refresh,
  onSaved,
  onClose,
}: {
  mode: EditorMode;
  view: InvestmentView;
  refresh: () => Promise<InvestmentView>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t: tr, config: localize } = useI18n("investments");
  const localizedTransactionNames = localize(transactionNames);

  const toast = useToast();
  const [view, setView] = useState(initial),
    hidden = useMoneyHidden(),
    money = useMoney();
  const old = "transaction" in mode ? mode.transaction : null;
  const category = initial.book?.categories.find(
    (c) => c.id === mode.categoryId,
  );
  const originalId = useRef(old?.id ?? crypto.randomUUID()),
    entityId = useRef(crypto.randomUUID());
  const rule = category ? ruleAt(category, view.today) : null;
  const [f, setF] = useState<Record<string, string>>({
    date:
      old?.date ??
      ("kind" in mode && mode.kind?.startsWith("opening")
        ? category?.start
        : view.today) ??
      view.today,
    start: view.today,
    categoryId: old?.categoryId ?? mode.categoryId ?? "",
    cashCategoryId:
      "cashCategoryId" in (old ?? {})
        ? ((old as { cashCategoryId: string | null }).cashCategoryId ?? "")
        : "",
    transactionKind:
      old?.kind ?? ("kind" in mode ? mode.kind : undefined) ?? "buy",
    kind: category?.kind ?? "investment",
    name: rule?.name ?? "",
    emoji: rule?.emoji ?? "🌱",
    description: rule?.description ?? "",
    amount: "",
    fee: "0",
    tax: "0",
    cost: "",
    value: "",
    note: old?.note ?? "",
    counterparty: old?.counterparty ?? "",
    reason: "",
    ...(old
      ? Object.fromEntries(
          Object.entries(old).filter(([, v]) => typeof v === "string"),
        )
      : {}),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<{
    command: InvestmentCommand;
    result: CommandResult;
  } | null>(null);
  const pending = useRef<InvestmentCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({ ...normalizedMoneyFields(f), reason: undefined });
  const originalDraft = useRef(draft);
  const unchanged =
    (mode.type === "configure" || mode.type === "revise") &&
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
  const categories = view.book?.categories ?? [],
    kind = f.transactionKind as InvestmentTransaction["kind"];
  const financial = mode.type === "transaction" || mode.type === "revise";
  const title =
    mode.type === "create"
      ? tr("Thêm danh mục")
      : mode.type === "configure"
        ? tr("Sửa danh mục")
        : mode.type === "archive"
          ? tr("Xóa / lưu trữ danh mục")
          : mode.type === "restore"
            ? tr("Khôi phục danh mục")
            : mode.type === "cancel"
              ? tr("Hủy giao dịch")
              : tr("Ghi giao dịch");
  function close() {
    if (
      (draft === originalDraft.current && !f.reason) ||
      window.confirm(tr("Đóng form và bỏ nội dung chưa lưu?"))
    )
      onClose();
  }
  function input(key: string, label: string, type = "text") {
    const masked = type === "money" && hidden;
    const required = ![
      "description",
      "note",
      "counterparty",
      "fee",
      "tax",
    ].includes(key);
    return (
      <label key={key} htmlFor={`investment-${key}`}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        <LocalizedInput
          aria-label={label}
          id={`investment-${key}`}
          type={masked ? "password" : type === "money" ? "text" : type}
          inputMode={type === "money" ? "numeric" : undefined}
          autoComplete="off"
          value={f[key] ?? ""}
          required={required}
          numberKind={type === "money" ? "integer" : undefined}
          onValueChange={(value) => set(key, value)}
          onBlur={() => {
            if (type === "money") set(key, normalizeInteger(f[key]));
          }}
          max={type === "date" ? view.today : undefined}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            [
              type === "money" ? `investment-hint-${key}` : "",
              fieldErrors[key] ? `investment-error-${key}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {type === "money" && (
          <MoneyHint id={`investment-hint-${key}`} value={f[key] ?? ""} />
        )}
        {fieldErrors[key] && (
          <small id={`investment-error-${key}`} className="expense-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  const isCash = ["openingCash", "deposit", "withdraw", "transfer"].includes(
    kind,
  );
  const eligible = categories.filter(
    (c) =>
      c.kind === (isCash ? "cash" : "investment") &&
      !!ruleAt(c, f.date)?.active,
  );
  function categorySelect() {
    return (
      <label>
        {tr("Danh mục / ví")}
        <select
          required
          aria-label={tr("Danh mục / ví")}
          id="investment-categoryId"
          aria-invalid={!!fieldErrors.categoryId}
          aria-describedby={
            fieldErrors.categoryId ? "investment-error-categoryId" : undefined
          }
          value={f.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
        >
          <option value="">{tr("Chọn danh mục / ví")}</option>
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>
              {ruleAt(c, f.date)?.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <small id="investment-error-categoryId" className="expense-error">
            {tr(fieldErrors.categoryId)}
          </small>
        )}
      </label>
    );
  }
  function action(): InvestmentAction {
    if (mode.type === "create")
      return actionSchema.parse({
        type: "createCategory",
        id: entityId.current,
        start: f.start,
        kind: f.kind,
        name: f.name,
        emoji: f.emoji,
        description: f.description,
      });
    if (mode.type === "configure")
      return actionSchema.parse({
        type: "configureCategory",
        categoryId: mode.categoryId,
        date: f.date,
        kind: f.kind,
        name: f.name,
        emoji: f.emoji,
        description: f.description,
      });
    if (mode.type === "archive" || mode.type === "restore")
      return actionSchema.parse({
        type: mode.type === "archive" ? "archiveCategory" : "restoreCategory",
        categoryId: mode.categoryId,
        date: f.date,
      });
    if (mode.type === "cancel")
      return actionSchema.parse({
        type: "reviseTransaction",
        transactionId: old!.id,
        replacement: null,
        reason: f.reason,
      });
    const t: Record<string, unknown> = {
      id: originalId.current,
      kind,
      date: f.date,
      categoryId: f.categoryId,
      note: f.note,
      counterparty: f.counterparty,
    };
    if (
      [
        "openingCash",
        "deposit",
        "withdraw",
        "transfer",
        "buy",
        "sell",
      ].includes(kind)
    )
      t.amount = normalizeInteger(f.amount);
    if (["openingInvestment", "sell"].includes(kind))
      t.cost = normalizeInteger(f.cost);
    if (["openingInvestment", "buy", "sell", "valuation"].includes(kind))
      t.value = normalizeInteger(f.value);
    if (kind === "buy" || kind === "sell") {
      t.fee = normalizeInteger(f.fee);
      t.tax = normalizeInteger(f.tax);
      t.cashCategoryId = f.cashCategoryId || null;
    }
    if (kind === "transfer") t.cashCategoryId = f.cashCategoryId;
    return actionSchema.parse(
      mode.type === "revise"
        ? {
            type: "reviseTransaction",
            transactionId: old!.id,
            replacement: t,
            reason: f.reason,
          }
        : { type: "postTransaction", transaction: t },
    );
  }
  async function submit() {
    if (unchanged) return;
    if (hidden) {
      setError(tr("Hãy hiện tiền trong form để kiểm tra trước khi lưu."));
      return;
    }
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const a = action();
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
          result: await investmentsJSON<CommandResult>("/preview", command),
        });
      else {
        writing = true;
        await investmentsJSON("/commands", command);
        toast("success", tr("Đã lưu thay đổi."));
        onSaved();
      }
    } catch (e) {
      const unknownWrite =
        writing &&
        (!(e instanceof InvestmentAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (e && typeof e === "object" && "issues" in e) {
        setFieldErrors(
          fieldErrorsFromIssues(
            (e as { issues: { path: (string | number)[]; message: string }[] })
              .issues,
          ),
        );
        setError(tr("Kiểm tra các trường được đánh dấu."));
      } else {
        if (e instanceof InvestmentAPIError && e.fieldErrors)
          setFieldErrors(e.fieldErrors);
        setError(e instanceof Error ? e.message : tr("Không thể lưu."));
        setConflict(
          e instanceof InvestmentAPIError && e.code === "VERSION_CONFLICT",
        );
        if (unknownWrite) setUncertain(true);
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
  function sellAll() {
    if (!view.book || !f.categoryId) return;
    try {
      const root = old?.id;
      const b = {
        ...view.book,
        revisions: root
          ? view.book.revisions.filter((r) => r.rootId !== root)
          : view.book.revisions,
      };
      // Exclude later transactions on the same date when revising an existing sale.
      const sequence = root
        ? activeTransactions(view.book).find((r) => r.transaction.id === root)!
            .sequence - 1
        : Infinity;
      const p = replay(b, f.date, sequence).positions.find(
        (p) => p.id === f.categoryId,
      );
      if (p) {
        set("cost", p.cost);
        set("value", "0");
      }
    } catch {
      setError(
        tr(
          "Không thể tính vốn tại ngày này. Hãy nhập giá vốn bán và xem trước để kiểm tra.",
        ),
      );
    }
  }
  const formId = useId();
  return (
    <ExpenseModal
      title={title}
      onClose={close}
      busy={busy || uncertain}
      size={
        mode.type === "cancel" || mode.type === "archive" ? "confirm" : "form"
      }
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={close}
            disabled={busy || uncertain}
          >
            <X size={17} aria-hidden="true" /> {tr("Đóng form")}
          </button>
          <button
            form={formId}
            aria-busy={busy}
            type="submit"
            className={`expense-primary ${mode.type === "cancel" ? "expense-danger" : ""}`}
            disabled={busy || hidden || conflict || unchanged}
          >
            {busy ? (
              <LoadingSpinner />
            ) : preview ? (
              <Save size={17} aria-hidden="true" />
            ) : (
              <ScanEye size={17} aria-hidden="true" />
            )}
            {busy
              ? tr("Đang kiểm tra…")
              : preview
                ? tr("Xác nhận lưu")
                : tr("Xem trước thay đổi")}
          </button>
        </div>
      }
    >
      <form
        id={formId}
        className="investment-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <RequiredFieldsNote />
        <PrivacyReveal />
        <HelpButton
          pageId="investments"
          sectionId={
            mode.type === "transaction" || mode.type === "revise"
              ? kind === "valuation"
                ? "valuation"
                : kind === "buy" || kind === "sell"
                  ? "sale-cost"
                  : kind === "deposit" ||
                      kind === "withdraw" ||
                      kind === "transfer"
                    ? "cash"
                    : "opening"
              : mode.type === "cancel"
                ? "history"
                : "portfolio"
          }
          label={tr("Hiểu vốn, giá trị và tiền chờ")}
        />
        {error && (
          <div
            role="alert"
            tabIndex={-1}
            ref={errorRef}
            className="expense-error"
          >
            {tr(error)}
            {Object.entries(fieldErrors).map(([key, message]) => (
              <div key={key}>
                <a href={`#investment-${key}`}>{tr(message)}</a>
              </div>
            ))}
          </div>
        )}
        {uncertain && (
          <p className="expense-notice">
            {tr(
              "Chưa xác nhận kết quả lưu. Nội dung được khóa; bấm xác nhận lại để kiểm tra cùng yêu cầu, không tạo giao dịch trùng.",
            )}
          </p>
        )}
        <fieldset disabled={busy || uncertain} className="investment-fields">
          <legend>{tr("Thông tin giao dịch / danh mục")}</legend>
          {(mode.type === "create" || mode.type === "configure") && (
            <>
              {mode.type === "create" ? (
                <div className="investment-suggestions">
                  {[
                    [tr("Cổ phiếu"), "📈"],
                    [tr("Quỹ cổ phiếu"), "🌿"],
                    [tr("Quỹ trái phiếu"), "🏦"],
                    ["Crypto", "🌐"],
                    [tr("Tiền chờ TCBS"), "💼"],
                  ].map(([name, emoji]) => (
                    <button
                      type="button"
                      className="expense-secondary"
                      key={name}
                      onClick={() => {
                        set("name", name);
                        set("emoji", emoji);
                        set(
                          "kind",
                          name === tr("Tiền chờ TCBS") ? "cash" : "investment",
                        );
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              {input("name", tr("Tên danh mục"))}
              {input("emoji", "Emoji")}
              {input("description", tr("Ghi chú danh mục"))}
              <label>
                {tr("Loại danh mục")}
                <select
                  value={f.kind}
                  onChange={(e) => set("kind", e.target.value)}
                >
                  <option value="investment">{tr("Danh mục đầu tư")}</option>
                  <option value="cash">{tr("Ví tiền chờ")}</option>
                </select>
              </label>
              {input(
                mode.type === "create" ? "start" : "date",
                mode.type === "create"
                  ? tr("Ngày bắt đầu")
                  : tr("Ngày hiệu lực"),
                "date",
              )}
              <p className="expense-muted">
                {tr(
                  "Số dư mở đầu được ghi riêng tại ngày bắt đầu. Loại danh mục chỉ đổi được khi chưa có phát sinh.",
                )}
              </p>
            </>
          )}
          {(mode.type === "archive" || mode.type === "restore") && (
            <>
              {input("date", tr("Ngày hiệu lực"), "date")}
              <p>
                {mode.type === "archive"
                  ? tr(
                      "Chỉ lưu trữ khi vốn và giá trị tài sản, hoặc tiền ví đều bằng 0. Lịch sử được giữ nguyên; có thể khôi phục.",
                    )
                  : tr(
                      "Khôi phục danh mục để tiếp tục ghi giao dịch từ ngày hiệu lực.",
                    )}
              </p>
            </>
          )}
          {financial && (
            <>
              <label>
                {tr("Loại giao dịch")}
                {mode.type === "revise" ? (
                  <span className="form-readonly-value">
                    {localizedTransactionNames[kind]}
                  </span>
                ) : (
                  <select
                    value={kind}
                    onChange={(e) => {
                      set("transactionKind", e.target.value);
                      set("categoryId", "");
                    }}
                  >
                    {Object.entries(localizedTransactionNames).map(
                      ([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ),
                    )}
                  </select>
                )}
              </label>
              {input("date", tr("Ngày giao dịch"), "date")}
              {categorySelect()}
              {[
                "openingCash",
                "deposit",
                "withdraw",
                "transfer",
                "buy",
                "sell",
              ].includes(kind) &&
                input(
                  "amount",
                  kind === "sell"
                    ? tr("Tiền bán trước phí/thuế (VND)")
                    : kind === "buy"
                      ? tr("Tiền mua trước phí/thuế (VND)")
                      : tr("Số tiền (VND)"),
                  "money",
                )}
              {(kind === "openingInvestment" || kind === "sell") &&
                input(
                  "cost",
                  kind === "sell"
                    ? tr("Giá vốn phần đã bán (VND)")
                    : tr("Giá vốn mở đầu (VND)"),
                  "money",
                )}
              {kind === "sell" && (
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={sellAll}
                >
                  {tr("Bán hết: lấy toàn bộ vốn, giá trị còn lại 0")}
                </button>
              )}
              {(kind === "buy" || kind === "sell") && (
                <>
                  <fieldset className="dialog-form-section">
                    <legend>{tr("Phí và thuế")}</legend>
                    {input("fee", tr("Phí (VND)"), "money")}
                    {input("tax", tr("Thuế (VND)"), "money")}
                  </fieldset>
                </>
              )}
              {["buy", "sell", "transfer"].includes(kind) && (
                <label>
                  {kind === "buy"
                    ? tr("Nguồn tiền")
                    : kind === "sell"
                      ? tr("Nơi nhận tiền")
                      : tr("Ví nhận")}
                  <select
                    required={kind === "transfer"}
                    id="investment-cashCategoryId"
                    aria-invalid={!!fieldErrors.cashCategoryId}
                    aria-describedby={
                      fieldErrors.cashCategoryId
                        ? "investment-error-cashCategoryId"
                        : undefined
                    }
                    value={f.cashCategoryId}
                    onChange={(e) => set("cashCategoryId", e.target.value)}
                  >
                    <option value="">
                      {kind === "transfer"
                        ? tr("Chọn ví nhận")
                        : tr("Bên ngoài")}
                    </option>
                    {categories
                      .filter(
                        (c) =>
                          c.kind === "cash" &&
                          c.id !== f.categoryId &&
                          ruleAt(c, f.date)?.active,
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {ruleAt(c, f.date)?.name}
                        </option>
                      ))}
                  </select>
                  {fieldErrors.cashCategoryId && (
                    <small
                      id="investment-error-cashCategoryId"
                      className="expense-error"
                    >
                      {tr(fieldErrors.cashCategoryId)}
                    </small>
                  )}
                </label>
              )}
              {["openingInvestment", "buy", "sell", "valuation"].includes(
                kind,
              ) && (
                <>
                  {input(
                    "value",
                    kind === "buy" || kind === "sell"
                      ? tr("Giá trị tài sản còn giữ sau giao dịch (VND)")
                      : tr("Giá trị định giá (VND)"),
                    "money",
                  )}
                  <p className="expense-muted">
                    {tr(
                      "Tổng giá trị của riêng danh mục, không gồm tiền chờ. Có thể nhập 0; không lấy giá vốn thay cho giá thị trường.",
                    )}
                  </p>
                </>
              )}
              {input("counterparty", tr("Nguồn / đích bên ngoài (tùy chọn)"))}
              {input("note", tr("Ghi chú giao dịch"))}
            </>
          )}
          {(mode.type === "revise" || mode.type === "cancel") &&
            input("reason", tr("Lý do sửa / hủy"))}
          {mode.type === "cancel" && (
            <p>
              {tr(
                "Hủy hiệu lực giao dịch này và tính lại diễn biến phía sau. Bản cũ vẫn nằm trong lịch sử.",
              )}
            </p>
          )}
        </fieldset>
        {preview && (
          <DialogPreview className="investment-preview">
            <h3>{tr("Xem trước thay đổi")}</h3>
            <DialogChanges
              numeric
              rows={[
                {
                  key: "total",
                  label: tr("Tổng tài sản"),
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
                  return (["cost", "value", "realized"] as const)
                    .filter((field) => before?.[field] !== p[field])
                    .map((field) => ({
                      key: `${p.id}/${field}`,
                      label: `${p.name} · ${{ cost: tr("Giá vốn"), value: tr("Giá trị"), realized: tr("Lãi / lỗ đã chốt") }[field]}`,
                      before:
                        before?.[field] === null
                          ? tr("Thiếu định giá")
                          : money(before?.[field] ?? "0"),
                      after:
                        p[field] === null
                          ? tr("Thiếu định giá")
                          : money(p[field]),
                    }));
                }),
              ]}
            />
          </DialogPreview>
        )}
        {conflict && (
          <button
            type="button"
            className="expense-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setView(await refresh());
                pending.current = null;
                setPreview(null);
                setConflict(false);
                setError("");
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
      </form>
    </ExpenseModal>
  );
}
