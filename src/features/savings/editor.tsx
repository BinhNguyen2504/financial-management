"use client";
import { LoadingSpinner } from "@/components/loading";
import {
  DialogChanges,
  DialogPreview,
  decimalLabel,
} from "@/components/dialog-content";
import { useRef, useId, useState, type FormEvent, type ReactNode } from "react";
import { ZodError } from "zod";
import {
  actionSchema,
  transactionSchema,
  type SavingsAction,
  type SavingsCommand,
  type SavingsTransaction,
} from "@/domain/savings/schema";
import type { SavingsCategory, SavingsView } from "@/domain/savings/types";
import {
  nextMonth,
  ruleAt,
  quantity,
  quantityText,
  replay,
} from "@/domain/savings/engine";
import type { CommandResult } from "@/application/savings";
import { ExpenseModal } from "@/features/expenses/modal";
import {
  PrivacyReveal,
  PrivacyScope,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import { savingsJSON, SavingsAPIError } from "./api";
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
    [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<{
    command: SavingsCommand;
    result: CommandResult;
  } | null>(null);
  const pending = useRef<SavingsCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const set = (key: string, value: string) => {
    setF((s) => ({ ...s, [key]: value }));
    setPreview(null);
    setError("");
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
      if (remaining <= 0n) throw new Error("Nhập lượng muốn bán lớn hơn 0.");
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
        throw new Error("Lượng muốn bán vượt lượng vàng còn giữ.");
      setAllocations(next);
      setPreview(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kiểm tra số lượng muốn bán.");
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
      charges = { fee: f.fee, tax: f.tax },
      contract = { name: f.name, maturity: f.maturity, term: f.term };
    switch (txKind) {
      case "openingCash":
      case "deposit":
      case "fee":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
        });
      case "openingDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
          ...contract,
        });
      case "openingGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
          quantity: f.quantity,
          unitPrice: f.unitPrice,
        });
      case "withdraw":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
          ...charges,
        });
      case "transfer":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
          cashCategoryId: f.cashCategoryId,
          ...charges,
        });
      case "openDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          amount: f.amount,
          ...contract,
          ...cash,
        });
      case "withdrawDeposit":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: f.amount,
          interest: f.interest,
          ...charges,
          ...cash,
        });
      case "interest":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          amount: f.amount,
          capitalize: f.capitalize === "true",
          cashCategoryId: f.capitalize === "true" ? null : cash.cashCategoryId,
        });
      case "rollover":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          contractId: f.contractId,
          interest: f.interest,
          reinvestInterest: f.reinvestInterest,
          ...contract,
          ...charges,
          ...cash,
        });
      case "buyGold":
        return transactionSchema.parse({
          ...b,
          kind: txKind,
          quantity: f.quantity,
          unitPrice: f.unitPrice,
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
          unitPrice: f.unitPrice,
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
          price: f.unitPrice,
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
    setBusy(true);
    setError("");
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
        await savingsJSON("/commands", command);
        await onSaved();
      }
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues
              .map((i) => `${String(i.path.at(-1))}: ${i.message}`)
              .join("; ")
          : e instanceof Error
            ? e.message
            : "Không thể lưu.",
      );
      if (e instanceof SavingsAPIError && e.code === "VERSION_CONFLICT") {
        setConflict(true);
        setPreview(null);
      }
      requestAnimationFrame(() => errorRef.current?.focus());
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
      <label key={key}>
        {label}
        <input
          name={key}
          type={secret && hidden ? "password" : type}
          inputMode={secret ? "decimal" : undefined}
          value={secret && hidden ? "••••••" : f[key]}
          disabled={busy || (secret && hidden)}
          onChange={(e) => set(key, e.target.value)}
          required={required}
          autoComplete="off"
          max={
            type === "date" && !["maturity"].includes(key)
              ? view.today
              : undefined
          }
        />
      </label>
    );
  }
  function select(key: string, label: string, options: ReactNode) {
    return (
      <label>
        {label}
        <select
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
      </label>
    );
  }
  const formId = useId();
  return (
    <ExpenseModal
      title={
        old && mode.type === "transaction"
          ? "Sửa giao dịch có lịch sử"
          : titles[mode.type]
      }
      onClose={onClose}
      busy={busy}
      size={mode.type === "void" ? "confirm" : "form"}
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            aria-busy={busy}
            className="expense-primary"
            disabled={busy || conflict || (sensitive && hidden)}
          >
            {busy && <LoadingSpinner />}
            {busy
              ? "Đang xử lý…"
              : preview
                ? "Xác nhận lưu"
                : "Xem trước thay đổi"}
          </button>
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Hủy
          </button>
        </div>
      }
    >
      <form id={formId} className="expense-form savings-form" onSubmit={submit}>
        <PrivacyReveal />
        {error && (
          <div
            className="expense-error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {error}
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
                setError("Đã tải phiên bản mới. Kiểm tra rồi xem trước lại.");
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
        <fieldset className="dialog-form-section" disabled={busy}>
          <legend>Thông tin giao dịch / danh mục</legend>
          {["create", "configure"].includes(mode.type) && (
            <>
              {input("name", "Tên danh mục")}
              {input("description", "Mô tả", "text", false, false)}
              {select(
                "emoji",
                "Biểu tượng",
                ["🌱", "💰", "🏦", "🪙", "💛", "🏡", "✈️", "🎯"].map((v) => (
                  <option key={v}>{v}</option>
                )),
              )}
              {mode.type === "create" && (
                <>
                  {select(
                    "kind",
                    "Loại tài sản",
                    Object.entries(kindNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    )),
                  )}
                  {f.kind === "gold" &&
                    select(
                      "unit",
                      "Đơn vị vàng",
                      <>
                        <option value="">Chọn đơn vị</option>
                        {["chỉ", "lượng/cây", "gram"].map((v) => (
                          <option key={v}>{v}</option>
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
              mode.type === "create" ? "Tháng bắt đầu" : "Tháng hiệu lực",
              "month",
            )}
          {mode.type === "archive" && (
            <p className="expense-notice">
              Chỉ lưu trữ sau khi xử lý hết tiền, vàng và sổ tiền gửi. Chọn
              tháng sau lần giao dịch cuối; lịch sử và báo cáo vẫn được giữ.
            </p>
          )}
          {mode.type === "reopen" && (
            <p className="expense-notice">
              Tháng được chọn và các tháng đã chốt sau đó sẽ cần chốt lại.
              Snapshot cũ vẫn được giữ.
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
              Chấp nhận giá vàng mang từ tháng trước
            </label>
          )}
          {mode.type === "price" && (
            <>
              {select(
                "categoryId",
                "Danh mục vàng",
                <>
                  <option value="">Chọn danh mục</option>
                  {categories
                    .filter((c) => c.kind === "gold")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {names(c)} · {c.unit}
                      </option>
                    ))}
                </>,
              )}
              {input("date", "Ngày giá", "date")}
              {input(
                "unitPrice",
                `Giá bán lại dự kiến (VND/${selectedCategory?.unit ?? "đơn vị"})`,
                "text",
                true,
              )}
            </>
          )}
          {mode.type === "transaction" && (
            <>
              {select(
                "transactionKind",
                "Loại giao dịch",
                Object.entries(transactionNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                )),
              )}
              {select(
                "categoryId",
                "Danh mục",
                <>
                  <option value="">Chọn danh mục</option>
                  {categories
                    .filter((c) => c.kind === txAsset)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {names(c)}
                      </option>
                    ))}
                </>,
              )}
              {input("date", "Ngày giao dịch", "date")}
              {txKind.startsWith("opening") && (
                <p className="expense-notice">
                  Tài sản có sẵn tại ngày bắt đầu theo dõi, không tính là tiền
                  nạp mới.
                </p>
              )}
              {hasAmount &&
                input(
                  "amount",
                  txKind === "openingGold"
                    ? "Giá vốn mở đầu (VND)"
                    : txKind === "withdrawDeposit"
                      ? "Gốc rút (VND)"
                      : "Số tiền (VND)",
                  "text",
                  true,
                )}
              {["openingGold", "buyGold"].includes(txKind) &&
                input(
                  "quantity",
                  `Số lượng (${selectedCategory?.unit ?? "đơn vị"})`,
                  "text",
                  true,
                )}
              {["openingGold", "buyGold", "sellGold"].includes(txKind) &&
                input(
                  "unitPrice",
                  txKind === "buyGold"
                    ? "Giá mua mỗi đơn vị (VND)"
                    : "Giá bán lại mỗi đơn vị (VND)",
                  "text",
                  true,
                )}
              {hasContract &&
                select(
                  "contractId",
                  "Sổ tiền gửi",
                  <>
                    <option value="">Chọn sổ</option>
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
                  {input("name", "Tên sổ")}
                  {input("maturity", "Ngày đáo hạn", "date")}
                  {input("term", "Kỳ hạn / ghi chú sổ", "text", false, false)}
                </>
              )}
              {["withdrawDeposit", "rollover"].includes(txKind) &&
                input("interest", "Lãi thực nhận (VND)", "text", true)}
              {txKind === "rollover" &&
                input(
                  "reinvestInterest",
                  "Lãi nhập sổ mới (VND)",
                  "text",
                  true,
                )}
              {txKind === "interest" &&
                select(
                  "capitalize",
                  "Cách nhận lãi",
                  <>
                    <option value="true">Nhập gốc sổ hiện tại</option>
                    <option value="false">Nhận tiền</option>
                  </>,
                )}
              {hasWallet &&
                !(txKind === "interest" && f.capitalize === "true") &&
                select(
                  "cashCategoryId",
                  ["buyGold", "openDeposit"].includes(txKind)
                    ? "Nguồn tiền"
                    : "Ví nhận tiền",
                  <>
                    <option value="">
                      {txKind === "transfer"
                        ? "Chọn ví nhận"
                        : "Bên ngoài Tiết kiệm"}
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
                  <legend>Phí và thuế</legend>
                  <div className="savings-form-grid">
                    {input("fee", "Phí (VND)", "text", true)}
                    {input("tax", "Thuế (VND)", "text", true)}
                  </div>
                </fieldset>
              )}
              {txKind === "sellGold" && (
                <fieldset>
                  <legend>Chọn đợt mua để bán · ưu tiên đợt cũ nhất</legend>
                  <label>
                    Tổng lượng muốn bán (để gợi ý)
                    <input
                      type={hidden ? "password" : "text"}
                      inputMode="decimal"
                      disabled={hidden || busy}
                      value={hidden ? "••••••" : saleQuantity}
                      onChange={(e) => setSaleQuantity(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="expense-secondary"
                    disabled={hidden || busy || !saleQuantity}
                    onClick={suggestLots}
                  >
                    Gợi ý theo đợt cũ nhất
                  </button>
                  {saleLots.map((l) => (
                    <label key={l.id}>
                      Đợt {l.date} · còn {hidden ? "••••••" : l.quantity}{" "}
                      {selectedCategory?.unit}
                      <input
                        aria-label={`Lượng bán đợt ${l.date} ${l.id.slice(0, 4)}`}
                        type={hidden ? "password" : "text"}
                        inputMode="decimal"
                        disabled={busy || hidden}
                        value={hidden ? "••••••" : (allocations[l.id] ?? "")}
                        placeholder="0"
                        onChange={(e) => {
                          setAllocations((a) => ({
                            ...a,
                            [l.id]: e.target.value,
                          }));
                          setPreview(null);
                        }}
                      />
                    </label>
                  ))}
                  <p className="expense-muted">
                    Nhập lượng bán vào một hoặc nhiều đợt; để trống những đợt
                    không bán.
                  </p>
                </fieldset>
              )}
              {input("note", "Ghi chú", "text", false, false)}
            </>
          )}
          {(mode.type === "reopen" ||
            mode.type === "void" ||
            (old && mode.type === "transaction")) &&
            input("reason", "Lý do thay đổi")}
        </fieldset>
        {preview && (
          <DialogPreview className="savings-preview">
            <h3>Xem trước thay đổi</h3>
            <DialogChanges
              rows={[
                {
                  key: "total",
                  label: "Tài sản tiết kiệm",
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
                  const fields =
                    p.kind === "gold"
                      ? (["value", "cost", "quantity"] as const)
                      : (["value"] as const);
                  return fields
                    .filter((field) => before?.[field] !== p[field])
                    .map((field) => ({
                      key: `${p.id}/${field}`,
                      label: `${p.name} · ${{ value: "Giá trị", cost: "Giá vốn", quantity: "Khối lượng" }[field]}`,
                      before:
                        field === "quantity"
                          ? `${hidden ? "••••••" : decimalLabel(before?.quantity ?? "0")} ${p.unit}`
                          : before?.[field] === null
                            ? "Thiếu định giá"
                            : money(before?.[field] ?? "0"),
                      after:
                        field === "quantity"
                          ? `${hidden ? "••••••" : decimalLabel(p.quantity)} ${p.unit}`
                          : p[field] === null
                            ? "Thiếu định giá"
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
