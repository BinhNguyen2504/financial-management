"use client";
import { LoadingSpinner } from "@/components/loading";
import { DialogChanges, DialogPreview } from "@/components/dialog-content";
import { useRef, useId, useState } from "react";
import { ExpenseModal } from "@/features/expenses/modal";
import {
  PrivacyScope,
  PrivacyReveal,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import {
  actionSchema,
  type InvestmentAction,
  type InvestmentCommand,
  type InvestmentTransaction,
} from "@/domain/investments/schema";
import {
  activeTransactions,
  replay,
  ruleAt,
} from "@/domain/investments/engine";
import type { InvestmentView } from "@/domain/investments/types";
import type { CommandResult } from "@/application/investments";
import { investmentsJSON, InvestmentAPIError } from "./api";
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
    [dirty, setDirty] = useState(false),
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
  const set = (key: string, value: string) => {
    setF((s) => ({ ...s, [key]: value }));
    setDirty(true);
    setPreview(null);
    setError("");
    setFieldErrors({});
  };
  const categories = view.book?.categories ?? [],
    kind = f.transactionKind as InvestmentTransaction["kind"];
  const financial = mode.type === "transaction" || mode.type === "revise";
  const title =
    mode.type === "create"
      ? "Thêm danh mục"
      : mode.type === "configure"
        ? "Sửa danh mục"
        : mode.type === "archive"
          ? "Xóa / lưu trữ danh mục"
          : mode.type === "restore"
            ? "Khôi phục danh mục"
            : mode.type === "cancel"
              ? "Hủy giao dịch"
              : "Ghi giao dịch";
  function close() {
    if (!dirty || window.confirm("Đóng form và bỏ nội dung chưa lưu?"))
      onClose();
  }
  function input(key: string, label: string, type = "text") {
    const masked = type === "money" && hidden;
    return (
      <label key={key} htmlFor={`investment-${key}`}>
        {label}
        <input
          id={`investment-${key}`}
          type={masked ? "password" : type === "money" ? "text" : type}
          inputMode={type === "money" ? "numeric" : undefined}
          autoComplete="off"
          value={f[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
          max={type === "date" ? view.today : undefined}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            fieldErrors[key] ? `investment-error-${key}` : undefined
          }
        />
        {fieldErrors[key] && (
          <small id={`investment-error-${key}`} className="expense-error">
            {fieldErrors[key]}
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
        Danh mục / ví
        <select
          id="investment-categoryId"
          aria-invalid={!!fieldErrors.categoryId}
          aria-describedby={
            fieldErrors.categoryId ? "investment-error-categoryId" : undefined
          }
          value={f.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
        >
          <option value="">Chọn danh mục / ví</option>
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>
              {ruleAt(c, f.date)?.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <small id="investment-error-categoryId" className="expense-error">
            {fieldErrors.categoryId}
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
      t.amount = f.amount;
    if (["openingInvestment", "sell"].includes(kind)) t.cost = f.cost;
    if (["openingInvestment", "buy", "sell", "valuation"].includes(kind))
      t.value = f.value;
    if (kind === "buy" || kind === "sell") {
      t.fee = f.fee;
      t.tax = f.tax;
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
    if (hidden) {
      setError("Hãy hiện tiền trong form để kiểm tra trước khi lưu.");
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
        onSaved();
      }
    } catch (e) {
      if (e && typeof e === "object" && "issues" in e) {
        const errors: Record<string, string> = {};
        for (const issue of (
          e as { issues: { path: (string | number)[]; message: string }[] }
        ).issues)
          errors[String(issue.path.at(-1))] = issue.message;
        setFieldErrors(errors);
        setError("Kiểm tra các trường được đánh dấu.");
      } else {
        setError(e instanceof Error ? e.message : "Không thể lưu.");
        setConflict(
          e instanceof InvestmentAPIError && e.code === "VERSION_CONFLICT",
        );
        if (
          writing &&
          (!(e instanceof InvestmentAPIError) ||
            ![400, 401, 403, 409, 415, 422].includes(e.status))
        )
          setUncertain(true);
      }
      requestAnimationFrame(() => errorRef.current?.focus());
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
        "Không thể tính vốn tại ngày này. Hãy nhập giá vốn bán và xem trước để kiểm tra.",
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
            aria-busy={busy}
            type="submit"
            className="expense-primary"
            disabled={busy || hidden || conflict}
          >
            {busy && <LoadingSpinner />}
            {busy
              ? "Đang kiểm tra…"
              : preview
                ? "Xác nhận lưu"
                : "Xem trước thay đổi"}
          </button>
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={close}
            disabled={busy || uncertain}
          >
            Đóng form
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
        <PrivacyReveal />
        {error && (
          <div
            role="alert"
            tabIndex={-1}
            ref={errorRef}
            className="expense-error"
          >
            {error}
            {Object.entries(fieldErrors).map(([key, message]) => (
              <div key={key}>
                <a href={`#investment-${key}`}>{message}</a>
              </div>
            ))}
          </div>
        )}
        {uncertain && (
          <p className="expense-notice">
            Chưa xác nhận kết quả lưu. Nội dung được khóa; bấm xác nhận lại để
            kiểm tra cùng yêu cầu, không tạo giao dịch trùng.
          </p>
        )}
        <fieldset disabled={busy || uncertain} className="investment-fields">
          <legend>Thông tin giao dịch / danh mục</legend>
          {(mode.type === "create" || mode.type === "configure") && (
            <>
              {mode.type === "create" ? (
                <div className="investment-suggestions">
                  {[
                    ["Cổ phiếu", "📈"],
                    ["Quỹ cổ phiếu", "🌿"],
                    ["Quỹ trái phiếu", "🏦"],
                    ["Crypto", "🌐"],
                    ["Tiền chờ TCBS", "💼"],
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
                          name === "Tiền chờ TCBS" ? "cash" : "investment",
                        );
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              {input("name", "Tên danh mục")}
              {input("emoji", "Emoji")}
              {input("description", "Ghi chú danh mục")}
              <label>
                Loại danh mục
                <select
                  value={f.kind}
                  onChange={(e) => set("kind", e.target.value)}
                >
                  <option value="investment">Danh mục đầu tư</option>
                  <option value="cash">Ví tiền chờ</option>
                </select>
              </label>
              {input(
                mode.type === "create" ? "start" : "date",
                mode.type === "create" ? "Ngày bắt đầu" : "Ngày hiệu lực",
                "date",
              )}
              <p className="expense-muted">
                Số dư mở đầu được ghi riêng tại ngày bắt đầu. Loại danh mục chỉ
                đổi được khi chưa có phát sinh.
              </p>
            </>
          )}
          {(mode.type === "archive" || mode.type === "restore") && (
            <>
              {input("date", "Ngày hiệu lực", "date")}
              <p>
                {mode.type === "archive"
                  ? "Chỉ lưu trữ khi vốn và giá trị tài sản, hoặc tiền ví đều bằng 0. Lịch sử được giữ nguyên; có thể khôi phục."
                  : "Khôi phục danh mục để tiếp tục ghi giao dịch từ ngày hiệu lực."}
              </p>
            </>
          )}
          {financial && (
            <>
              <label>
                Loại giao dịch
                <select
                  value={kind}
                  disabled={mode.type === "revise"}
                  onChange={(e) => {
                    set("transactionKind", e.target.value);
                    set("categoryId", "");
                  }}
                >
                  {Object.entries(transactionNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {input("date", "Ngày giao dịch", "date")}
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
                    ? "Tiền bán trước phí/thuế (VND)"
                    : kind === "buy"
                      ? "Tiền mua trước phí/thuế (VND)"
                      : "Số tiền (VND)",
                  "money",
                )}
              {(kind === "openingInvestment" || kind === "sell") &&
                input(
                  "cost",
                  kind === "sell"
                    ? "Giá vốn phần đã bán (VND)"
                    : "Giá vốn mở đầu (VND)",
                  "money",
                )}
              {kind === "sell" && (
                <button
                  type="button"
                  className="expense-secondary"
                  onClick={sellAll}
                >
                  Bán hết: lấy toàn bộ vốn, giá trị còn lại 0
                </button>
              )}
              {(kind === "buy" || kind === "sell") && (
                <>
                  <fieldset className="dialog-form-section">
                    <legend>Phí và thuế</legend>
                    {input("fee", "Phí (VND)", "money")}
                    {input("tax", "Thuế (VND)", "money")}
                  </fieldset>
                </>
              )}
              {["buy", "sell", "transfer"].includes(kind) && (
                <label>
                  {kind === "buy"
                    ? "Nguồn tiền"
                    : kind === "sell"
                      ? "Nơi nhận tiền"
                      : "Ví nhận"}
                  <select
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
                      {kind === "transfer" ? "Chọn ví nhận" : "Bên ngoài"}
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
                      {fieldErrors.cashCategoryId}
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
                      ? "Giá trị tài sản còn giữ sau giao dịch (VND)"
                      : "Giá trị định giá (VND)",
                    "money",
                  )}
                  <p className="expense-muted">
                    Tổng giá trị của riêng danh mục, không gồm tiền chờ. Có thể
                    nhập 0; không lấy giá vốn thay cho giá thị trường.
                  </p>
                </>
              )}
              {input("counterparty", "Nguồn / đích bên ngoài (tùy chọn)")}
              {input("note", "Ghi chú giao dịch")}
            </>
          )}
          {(mode.type === "revise" || mode.type === "cancel") &&
            input("reason", "Lý do sửa / hủy")}
          {mode.type === "cancel" && (
            <p>
              Hủy hiệu lực giao dịch này và tính lại diễn biến phía sau. Bản cũ
              vẫn nằm trong lịch sử.
            </p>
          )}
        </fieldset>
        {preview && (
          <DialogPreview className="investment-preview">
            <h3>Xem trước thay đổi</h3>
            <DialogChanges
              rows={[
                {
                  key: "total",
                  label: "Tổng tài sản",
                  before:
                    preview.result.before.total === null
                      ? "Thiếu định giá"
                      : money(preview.result.before.total),
                  after:
                    preview.result.after.total === null
                      ? "Thiếu định giá"
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
                      label: `${p.name} · ${{ cost: "Giá vốn", value: "Giá trị", realized: "Lãi / lỗ đã chốt" }[field]}`,
                      before:
                        before?.[field] === null
                          ? "Thiếu định giá"
                          : money(before?.[field] ?? "0"),
                      after:
                        p[field] === null ? "Thiếu định giá" : money(p[field]),
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
                  e instanceof Error ? e.message : "Chưa tải được dữ liệu.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Tải dữ liệu mới, giữ nội dung nhập
          </button>
        )}
      </form>
    </ExpenseModal>
  );
}
