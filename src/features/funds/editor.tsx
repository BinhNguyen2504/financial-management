"use client";
import {
  LocalizedInput,
  focusInvalidNumber,
} from "@/components/localized-input";
import { formatMonth } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import type { FundCommandResult } from "@/application/funds";
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
import { useVisualTheme } from "@/components/ui-preferences";
import { visualThemes } from "@/components/visual-theme";
import { selectLiving } from "@/domain/funds/engine";
import {
  actionSchema,
  fundIds,
  multipliersSchema,
  type FundAction,
  type FundCommand,
  type FundId,
  type FundTransaction,
} from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import { ExpenseModal } from "@/features/expenses/modal";
import { HelpButton } from "@/features/help/provider";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import { comparable, normalizeInteger } from "@/lib/form-values";
import { ArrowDown, ArrowUp, Save, ScanEye, X } from "lucide-react";
import Link from "next/link";
import {
  cloneElement,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { z } from "zod";
import { FundAPIError, fundsJSON } from "./api";
import {
  displayTime,
  fundNames,
  localDateTime,
  transactionNames as transactionNamesSource,
} from "./content";
export type EditorMode =
  | { type: "configure" }
  | { type: "location"; id?: string }
  | { type: "transaction"; fundId?: FundId; kind?: FundTransaction["kind"] }
  | { type: "revise" | "cancel"; transaction: FundTransaction };
type Props = {
  mode: EditorMode;
  view: FundView;
  refresh: () => Promise<FundView>;
  onSaved: () => void;
  onClose: () => void;
  onAuthLost: () => void;
};
export function FundEditor(props: Props) {
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
  onAuthLost,
}: Props) {
  const { t: tr, locale, config: localize } = useI18n("funds");

  const toast = useToast();
  const [view, setView] = useState(initial),
    config = initial.book?.configurations.at(-1),
    old = "transaction" in mode ? mode.transaction : null;
  const location =
    mode.type === "location"
      ? initial.book?.locations.find((l) => l.id === mode.id)
      : null;
  const entity = useRef(old?.id ?? location?.id ?? crypto.randomUUID()),
    hidden = useMoneyHidden(),
    money = useMoney(),
    id = useId();
  const [f, setF] = useState({
    name: location?.name ?? "",
    active: location?.active ?? true,
    kind:
      old?.kind ??
      (mode.type === "transaction" ? mode.kind : undefined) ??
      "deposit",
    fundId:
      old?.fundId ??
      (mode.type === "transaction" ? mode.fundId : undefined) ??
      "emergency",
    locationId:
      old?.locationId ??
      initial.book?.locations.find((l) => l.active)?.id ??
      "",
    toFundId: old?.kind === "transfer" ? old.toFundId : "rainy_day",
    toLocationId:
      old?.kind === "transfer"
        ? old.toLocationId
        : (initial.book?.locations.find((l) => l.active)?.id ?? ""),
    amount: old?.amount ?? "",
    occurredAt: localDateTime(old?.occurredAt ?? initial.now),
    note: old?.note ?? "",
    reason: "",
  });
  const [jarIds, setJarIds] = useState(
      config?.living.items.map((i) => i.jarId) ?? [],
    ),
    [multipliers, setMultipliers] = useState(
      config?.multipliers ?? { emergency: "", rainy_day: "", sinking: "" },
    ),
    [priority, setPriority] = useState<FundId[]>(
      config?.priority ?? [...fundIds],
    ),
    [applyLiving, setApplyLiving] = useState(!config || initial.sourceChanged),
    [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [preview, setPreview] = useState<{
      command: FundCommand;
      result: FundCommandResult;
    } | null>(null);
  const pending = useRef<FundCommand | null>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const draft = comparable({
    ...f,
    amount: normalizeInteger(f.amount),
    reason: undefined,
    jarIds: [...jarIds].sort(),
    multipliers,
    priority,
    applyLiving,
  });
  const originalDraft = useRef(draft);
  const unchanged =
    ((mode.type === "location" && !!location) ||
      mode.type === "revise" ||
      (mode.type === "configure" && !!config && !initial.sourceChanged)) &&
    draft === originalDraft.current;
  const theme = useVisualTheme();
  const title =
    mode.type === "configure"
      ? config
        ? tr("Điều chỉnh Quỹ an toàn")
        : localize(visualThemes)[theme].copy.configureFunds
      : mode.type === "location"
        ? location
          ? tr("Sửa nơi giữ tiền")
          : tr("Thêm nơi giữ tiền")
        : mode.type === "cancel"
          ? tr("Hủy giao dịch")
          : mode.type === "revise"
            ? tr("Sửa giao dịch")
            : tr("Ghi giao dịch");
  function invalidate() {
    setPreview(null);
    pending.current = null;
    setError("");
    setFieldErrors({});
    setConflict(false);
  }
  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((s) => ({ ...s, [key]: value }));
    invalidate();
  }
  function report(e: unknown) {
    if (e instanceof z.ZodError) {
      setFieldErrors(fieldErrorsFromIssues(e.issues, true));
      setError(tr("Kiểm tra các trường được đánh dấu."));
    } else if (e instanceof FundAPIError && e.fieldErrors) {
      setFieldErrors(e.fieldErrors);
      setError(tr("Kiểm tra các trường được đánh dấu."));
    } else
      setError(
        e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
      );
    focusFirstInvalid(
      document.querySelector(".expense-dialog[open]:not([inert]) .dialog-body"),
      errorRef.current,
    );
    toast(
      "error",
      e instanceof Error ? e.message : tr("Chưa hoàn tất. Hãy thử lại."),
    );
  }
  function action(): FundAction {
    if (mode.type === "configure")
      return actionSchema.parse({
        type: "configure",
        id: entity.current,
        jarIds,
        multipliers,
        priority,
        applyLiving,
        expectedExpenseVersion: view.source.expenseVersion,
        sourceMonth: view.source.month,
      });
    if (mode.type === "location")
      return actionSchema.parse({
        type: "saveLocation",
        id: entity.current,
        name: f.name,
        active: f.active,
      });
    if (mode.type === "cancel")
      return actionSchema.parse({
        type: "reviseTransaction",
        transactionId: entity.current,
        replacement: null,
        reason: f.reason,
      });
    const enteredTime = Date.parse(`${f.occurredAt}:00+07:00`);
    if (!Number.isFinite(enteredTime))
      throw new z.ZodError([
        {
          code: "custom",
          path: ["occurredAt"],
          message: tr("Nhập thời điểm giao dịch hợp lệ."),
        },
      ]);
    const transaction = {
      id: entity.current,
      kind: f.kind,
      fundId: f.fundId,
      locationId: f.locationId,
      amount: normalizeInteger(f.amount),
      occurredAt:
        old && f.occurredAt === localDateTime(old.occurredAt)
          ? old.occurredAt
          : new Date(enteredTime).toISOString(),
      note: f.note,
      ...(f.kind === "transfer"
        ? { toFundId: f.toFundId, toLocationId: f.toLocationId }
        : {}),
    };
    return actionSchema.parse(
      mode.type === "revise"
        ? {
            type: "reviseTransaction",
            transactionId: entity.current,
            replacement: transaction,
            reason: f.reason,
          }
        : { type: "postTransaction", transaction },
    );
  }
  async function submit() {
    if (focusInvalidNumber(document.getElementById(`${id}-fields`))) return;
    if (hidden) return;
    setBusy(true);
    setError("");
    let writing = false;
    try {
      const command = pending.current ?? {
        id: crypto.randomUUID(),
        expectedVersion: view.book?.version ?? 0,
        action: action(),
      };
      pending.current = command;
      if (!preview)
        setPreview({
          command,
          result: await fundsJSON<FundCommandResult>("/preview", command),
        });
      else {
        writing = true;
        await fundsJSON("/commands", command);
        toast("success", tr("Đã lưu thay đổi."));
        onSaved();
      }
    } catch (e) {
      if (e instanceof FundAPIError && e.status === 401) {
        onAuthLost();
        return;
      }
      const unknownWrite =
        writing &&
        (!(e instanceof FundAPIError) ||
          ![400, 401, 403, 409, 415, 422].includes(e.status));
      if (unknownWrite)
        toast(
          "warning",
          tr(
            "Chưa xác nhận được kết quả lưu. Kiểm tra hoặc thử lại cùng yêu cầu.",
          ),
        );
      else report(e);
      setConflict(
        e instanceof FundAPIError &&
          ["VERSION_CONFLICT", "EXPENSE_VERSION_CONFLICT"].includes(e.code),
      );
      if (unknownWrite) setUncertain(true);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (focusInvalidNumber(document.getElementById(`${id}-fields`))) return;
    try {
      if (step === 0) {
        if (applyLiving || !config) selectLiving(view.source, jarIds);
        else if (!jarIds.length) throw new Error(tr("Chọn hũ sinh hoạt."));
      }
      if (step === 1)
        z.object({ multipliers: multipliersSchema }).parse({ multipliers });
      setStep((s) => s + 1);
      setError("");
      setFieldErrors({});
    } catch (e) {
      report(e);
    }
  }
  const fieldId = (key: string) => `${id}-${key.replaceAll(".", "-")}`;
  function field(
    key: string,
    label: string,
    input: ReactElement<{
      "aria-label"?: string;
      "aria-invalid"?: boolean;
      "aria-describedby"?: string;
    }>,
  ) {
    const err =
      fieldErrors[key] ??
      Object.entries(fieldErrors).find(([k]) => k.endsWith("." + key))?.[1];
    return (
      <div key={key} className="fund-field">
        <label htmlFor={fieldId(key)}>
          {label}
          {!["note", "active"].includes(key) && (
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {cloneElement(input, {
          "aria-label": label,
          "aria-invalid": Boolean(err),
          "aria-describedby":
            [
              key === "amount" ? `${fieldId(key)}-hint` : "",
              err ? `${fieldId(key)}-error` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
        })}
        {key === "amount" && (
          <MoneyHint id={`${fieldId(key)}-hint`} value={f.amount} />
        )}
        {err && (
          <small id={`${fieldId(key)}-error`} className="fund-field-error">
            {tr(err)}
          </small>
        )}
      </div>
    );
  }
  function input(
    key: "name" | "amount" | "occurredAt" | "note" | "reason",
    label: string,
  ) {
    return field(
      key,
      label,
      <LocalizedInput
        id={fieldId(key)}
        value={f[key]}
        required={key !== "note"}
        numberKind={key === "amount" ? "integer" : undefined}
        onValueChange={(value) => set(key, value)}
        onBlur={() => {
          if (key === "amount") set(key, normalizeInteger(f.amount));
        }}
        type={
          key === "occurredAt"
            ? "datetime-local"
            : key === "amount" && hidden
              ? "password"
              : "text"
        }
        inputMode={key === "amount" ? "numeric" : undefined}
        readOnly={key === "amount" && hidden}
        maxLength={key === "amount" ? 40 : 1000}
        max={
          key === "occurredAt"
            ? localDateTime(new Date().toISOString())
            : undefined
        }
        aria-invalid={Boolean(
          fieldErrors[key] ||
          Object.keys(fieldErrors).some((k) => k.endsWith("." + key)),
        )}
      />,
    );
  }
  function fundSelect(key: "fundId" | "toFundId", label: string) {
    return field(
      key,
      label,
      <select
        id={fieldId(key)}
        value={f[key]}
        onChange={(e) => set(key, e.target.value as FundId)}
      >
        {fundIds.map((k) => (
          <option key={k} value={k}>
            {fundNames[k]}
          </option>
        ))}
      </select>,
    );
  }
  function locationSelect(key: "locationId" | "toLocationId", label: string) {
    return field(
      key,
      label,
      <select
        id={fieldId(key)}
        value={f[key]}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">{tr("Chọn nơi giữ")}</option>
        {view.book?.locations
          .filter((l) => l.active || l.id === f[key])
          .map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {!l.active ? tr(" · Đã ngừng") : ""}
            </option>
          ))}
      </select>,
    );
  }
  let livingTotal = config?.living.total ?? "0";
  if (applyLiving) {
    try {
      livingTotal = selectLiving(view.source, jarIds).total;
    } catch {
      livingTotal = "0";
    }
  }
  const options = [
    ...view.source.items,
    ...(config?.living.items.filter(
      (i) => !view.source.items.some((j) => j.jarId === i.jarId),
    ) ?? []),
  ];
  const changedFundRows = preview
    ? preview.result.after.funds.flatMap((after) => {
        const before = preview.result.before.funds.find(
          (item) => item.id === after.id,
        );
        if (!before) return [];
        return [
          {
            label: tr("{0} · Số dư", { 0: fundNames[after.id] }),
            before: before.balance,
            after: after.balance,
          },
          {
            label: tr("{0} · Mục tiêu", { 0: fundNames[after.id] }),
            before: before.target,
            after: after.target,
          },
        ].filter((row) => row.before !== row.after);
      })
    : [];
  const changedLocationRows = preview
    ? Object.keys({
        ...preview.result.before.balances,
        ...preview.result.after.balances,
      }).flatMap((key) => {
        const before = preview.result.before.balances[key] ?? "0";
        const after = preview.result.after.balances[key] ?? "0";
        if (before === after) return [];
        const [fund, locationId] = key.split(":");
        return [
          {
            label: `${fundNames[fund as FundId]} · ${view.book?.locations.find((item) => item.id === locationId)?.name ?? tr("Nơi giữ tiền")}`,
            before,
            after,
          },
        ];
      })
    : [];
  return (
    <ExpenseModal
      title={title}
      onClose={onClose}
      busy={busy || uncertain}
      size="form"
      footer={
        <div className="fund-actions">
          <button
            type="button"
            className="expense-secondary"
            disabled={busy || uncertain}
            onClick={onClose}
          >
            <X size={17} aria-hidden="true" />
            {tr("Hủy")}
          </button>
          {mode.type === "configure" && step > 0 && !preview && (
            <button
              className="expense-secondary"
              disabled={busy || uncertain}
              onClick={() => setStep((s) => s - 1)}
            >
              {tr("Quay lại")}
            </button>
          )}
          {mode.type === "configure" && step < 2 && !preview ? (
            <button className="expense-primary" disabled={busy} onClick={next}>
              {tr("Tiếp tục")}
            </button>
          ) : (
            <button
              className={`expense-primary ${mode.type === "cancel" ? "expense-danger" : ""}`}
              disabled={busy || hidden || conflict || unchanged}
              aria-busy={busy}
              onClick={() => void submit()}
            >
              {busy ? (
                <LoadingSpinner />
              ) : preview ? (
                <Save size={17} aria-hidden="true" />
              ) : (
                <ScanEye size={17} aria-hidden="true" />
              )}
              {preview ? tr("Xác nhận lưu") : tr("Xem trước thay đổi")}
            </button>
          )}
        </div>
      }
    >
      <p className="required-fields-note">
        <span className="required-mark" aria-hidden="true">
          *
        </span>{" "}
        {tr("là thông tin cần nhập.")}
      </p>
      <PrivacyReveal />
      <HelpButton
        pageId="funds"
        sectionId={
          mode.type === "configure"
            ? "living"
            : mode.type === "location"
              ? "locations"
              : "transactions"
        }
        label={tr("Hiểu mục tiêu và số dư quỹ")}
      />
      {error && (
        <div
          className="expense-error"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {tr(error)}
          {Object.keys(fieldErrors).length > 0 && (
            <ul>
              {Object.entries(fieldErrors).map(([key, message]) => (
                <li key={key}>
                  <a
                    href={`#${fieldId(key.startsWith("multipliers.") ? key : key.split(".").at(-1)!)}`}
                  >
                    {tr(message)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {uncertain && (
        <p role="status">
          {tr(
            "Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và bấm Xác nhận lưu để kiểm tra lại cùng yêu cầu.",
          )}
        </p>
      )}
      {conflict && (
        <button
          className="expense-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setView(await refresh());
              invalidate();
            } catch (e) {
              if (e instanceof FundAPIError && e.status === 401) onAuthLost();
              else report(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr("Tải dữ liệu mới, giữ nội dung nhập")}
        </button>
      )}
      <fieldset
        id={`${id}-fields`}
        className="fund-fields"
        disabled={busy || uncertain}
      >
        {mode.type === "configure" ? (
          <>
            <p className="eyebrow">
              {tr("Bước")} {step + 1}/3 ·{" "}
              {step === 0
                ? tr("Chi phí sinh hoạt")
                : step === 1
                  ? tr("Quy mô dự phòng")
                  : tr("Thứ tự ưu tiên")}
            </p>
            {step === 0 && (
              <>
                <p>
                  {tr(
                    "Living expense là chi phí thiết yếu để duy trì cuộc sống mỗi tháng. Chọn những hũ bạn cần tiếp tục chi ngay cả khi thu nhập bị gián đoạn.",
                  )}
                </p>
                <p className="fund-note">
                  {tr("Dùng mức cấu hình của tháng")}{" "}
                  {view.source.month.split("-").reverse().join("/")}
                  {tr("; bỏ qua điều chỉnh riêng từng tháng và hũ tích lũy.")}
                </p>
                {config && (
                  <label className="fund-check">
                    <input
                      type="checkbox"
                      checked={applyLiving}
                      onChange={(e) => {
                        setApplyLiving(e.target.checked);
                        setJarIds(config.living.items.map((i) => i.jarId));
                        invalidate();
                      }}
                    />
                    {tr("Cập nhật mức sinh hoạt từ Chi tiêu hiện tại")}
                  </label>
                )}
                {!view.source.items.length && (
                  <p>
                    {tr("Chưa có hũ chi tháng đang hoạt động.")}{" "}
                    <Link href="/budgets">{tr("Thiết lập tại Chi tiêu")}</Link>
                    {tr(", sau đó tải lại dữ liệu.")}
                  </p>
                )}
                {options.map((item) => (
                  <label className="fund-check" key={item.jarId}>
                    <input
                      type="checkbox"
                      checked={jarIds.includes(item.jarId)}
                      disabled={Boolean(config && !applyLiving)}
                      onChange={(e) => {
                        setJarIds((s) =>
                          e.target.checked
                            ? [...s, item.jarId]
                            : s.filter((v) => v !== item.jarId),
                        );
                        invalidate();
                      }}
                    />
                    <span>
                      {item.name}
                      {!view.source.items.some((i) => i.jarId === item.jarId)
                        ? tr(" · Không còn hoạt động")
                        : ""}
                    </span>
                    <strong>{money(item.amount)}</strong>
                  </label>
                ))}
                <p className="fund-total">
                  {tr("Mức sinh hoạt:")}{" "}
                  <strong>
                    {money(livingTotal)}
                    {tr("/tháng")}
                  </strong>
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  {tr(
                    "Nhập số tháng muốn dự phòng cho từng quỹ. Ví dụ phép tính: 2 tháng × mức sinh hoạt. Chọn hệ số phù hợp hoàn cảnh của bạn.",
                  )}
                </p>
                {fundIds.map((k) =>
                  field(
                    `multipliers.${k}`,
                    tr("{0} — hệ số x", { 0: fundNames[k] }),
                    <LocalizedInput
                      numberKind="decimal"
                      precision={2}
                      key={k}
                      id={fieldId(`multipliers.${k}`)}
                      inputMode="decimal"
                      autoComplete="off"
                      value={multipliers[k]}
                      onValueChange={(value) => {
                        setMultipliers((s) => ({
                          ...s,
                          [k]: value,
                        }));
                        invalidate();
                      }}
                    />,
                  ),
                )}
                <p className="fund-note">
                  {tr(
                    "Mục tiêu bằng mức sinh hoạt đã xác nhận nhân x; số tiền làm tròn lên đồng VND.",
                  )}
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <p>
                  {tr(
                    "Quỹ chưa đủ đầu tiên trong thứ tự này sẽ là bước tiếp theo của bạn. Bạn có thể đổi thứ tự sau.",
                  )}
                </p>
                <ol className="fund-priorities">
                  {priority.map((k, i) => (
                    <li key={k}>
                      <span>{fundNames[k]}</span>
                      <button
                        className="expense-icon-button"
                        aria-label={tr("Ưu tiên {0} lên", { 0: fundNames[k] })}
                        disabled={i === 0}
                        onClick={() => {
                          setPriority((s) => {
                            const n = [...s];
                            [n[i - 1], n[i]] = [n[i], n[i - 1]];
                            return n;
                          });
                          invalidate();
                        }}
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        className="expense-icon-button"
                        aria-label={tr("Ưu tiên {0} xuống", {
                          0: fundNames[k],
                        })}
                        disabled={i === 2}
                        onClick={() => {
                          setPriority((s) => {
                            const n = [...s];
                            [n[i + 1], n[i]] = [n[i], n[i + 1]];
                            return n;
                          });
                          invalidate();
                        }}
                      >
                        <ArrowDown size={18} />
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : mode.type === "location" ? (
          <>
            {input("name", tr("Tên nơi giữ tiền"))}
            {location && (
              <label className="fund-check">
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) => set("active", e.target.checked)}
                />
                {tr("Đang sử dụng")}
              </label>
            )}
            <p className="fund-note">
              {tr(
                "Nơi giữ là nhãn ghi sổ trong Fund. Số dư được tách cho từng quỹ.",
              )}
            </p>
          </>
        ) : (
          <>
            {mode.type !== "cancel" && (
              <>
                {field(
                  "kind",
                  tr("Loại giao dịch"),
                  <select
                    id={fieldId("kind")}
                    value={f.kind}
                    onChange={(e) =>
                      set("kind", e.target.value as FundTransaction["kind"])
                    }
                  >
                    {Object.entries(localize(transactionNamesSource)).map(
                      ([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ),
                    )}
                  </select>,
                )}
                <div className="fund-form-grid">
                  {fundSelect(
                    "fundId",
                    f.kind === "transfer" ? tr("Quỹ nguồn") : tr("Quỹ"),
                  )}
                  {locationSelect(
                    "locationId",
                    f.kind === "transfer"
                      ? tr("Nơi nguồn")
                      : tr("Nơi giữ tiền"),
                  )}
                </div>
                {f.kind === "transfer" && (
                  <div className="fund-form-grid">
                    {fundSelect("toFundId", tr("Quỹ nhận"))}
                    {locationSelect("toLocationId", tr("Nơi nhận"))}
                  </div>
                )}
                {input("amount", tr("Số tiền (VND)"))}
                {input("occurredAt", tr("Thời điểm giao dịch (giờ Việt Nam)"))}
                {input(
                  "note",
                  f.kind === "withdraw" || f.kind === "transfer"
                    ? tr("Lý do giao dịch")
                    : tr("Ghi chú"),
                )}
                {!view.book?.locations.some((l) => l.active) && (
                  <p>{tr("Thêm nơi giữ tiền trước khi ghi giao dịch.")}</p>
                )}
              </>
            )}
            {mode.type === "cancel" && old && (
              <p>
                {tr("Hủy giao dịch")}{" "}
                {localize(transactionNamesSource)[old.kind].toLowerCase()}{" "}
                {money(old.amount)} · {displayTime(old.occurredAt, locale)}
                {tr(". Bản gốc vẫn được giữ trong lịch sử.")}
              </p>
            )}
            {(mode.type === "revise" || mode.type === "cancel") &&
              input("reason", tr("Lý do sửa hoặc hủy"))}
          </>
        )}
      </fieldset>
      {preview && (
        <section className="fund-preview" aria-label={tr("Xem trước thay đổi")}>
          <h3>{tr("Kiểm tra thay đổi")}</h3>
          <p className="fund-preview-summary">
            {mode.type === "configure"
              ? tr("Điều chỉnh mục tiêu Quỹ an toàn")
              : mode.type === "location"
                ? `${location?.name ?? tr("Thêm nơi giữ tiền")} → ${f.name} · ${f.active ? tr("Đang sử dụng") : tr("Ngừng sử dụng")}`
                : mode.type === "cancel"
                  ? tr("Hủy {0}", {
                      0: old
                        ? localize(transactionNamesSource)[
                            old.kind
                          ].toLowerCase()
                        : tr("giao dịch"),
                    })
                  : `${localize(transactionNamesSource)[f.kind]} · ${fundNames[f.fundId as FundId]} · ${money(f.amount)}`}
          </p>
          <FundChangeTable
            rows={[
              ...(mode.type === "configure" &&
              (preview.result.beforeConfig?.living.total ?? "0") !==
                preview.result.afterConfig.living.total
                ? [
                    {
                      label: tr("Mức sinh hoạt / tháng"),
                      before: preview.result.beforeConfig?.living.total ?? "0",
                      after: preview.result.afterConfig.living.total,
                    },
                  ]
                : []),
              ...changedFundRows,
            ]}
            money={money}
            hidden={hidden}
          />
          {(changedLocationRows.length > 0 ||
            mode.type === "configure" ||
            old) && (
            <details className="fund-preview-details">
              <summary>{tr("Chi tiết giao dịch và nơi giữ tiền")}</summary>
              {old && (
                <p>
                  {tr("Giao dịch trước:")}{" "}
                  {localize(transactionNamesSource)[old.kind]} ·{" "}
                  {fundNames[old.fundId]} · {money(old.amount)} ·{" "}
                  {displayTime(old.occurredAt, locale)}
                </p>
              )}
              {mode.type === "configure" && (
                <p>
                  {tr("Nguồn tháng")}{" "}
                  {formatMonth(
                    preview.result.afterConfig.living.month!,
                    locale,
                  )}{" "}
                  {tr("· Ưu tiên:")}{" "}
                  {preview.result.afterConfig.priority
                    .map((key) => fundNames[key])
                    .join(" → ")}
                </p>
              )}
              {changedLocationRows.length > 0 && (
                <FundChangeTable
                  rows={changedLocationRows}
                  money={money}
                  hidden={hidden}
                />
              )}
            </details>
          )}
          <p className="fund-note">
            {tr("Chưa ghi dữ liệu. Kiểm tra nội dung rồi xác nhận lưu.")}
          </p>
        </section>
      )}
    </ExpenseModal>
  );
}

function FundChangeTable({
  rows,
  money,
  hidden,
}: {
  rows: { label: string; before: string; after: string }[];
  money: (value: string) => string;
  hidden: boolean;
}) {
  const { t: tr, locale } = useI18n("funds");

  if (!rows.length)
    return (
      <p className="fund-note">
        {tr("Không có số dư hoặc mục tiêu nào thay đổi.")}
      </p>
    );
  return (
    <div
      className="fund-change-table"
      role="table"
      aria-label={tr("Các giá trị thay đổi")}
    >
      <div className="fund-change-row fund-change-header" role="row">
        <span role="columnheader">{tr("Thông tin")}</span>
        <span role="columnheader">{tr("Trước")}</span>
        <span role="columnheader">Sau</span>
        <span role="columnheader">{tr("Chênh lệch")}</span>
      </div>
      {rows.map((row) => {
        const difference = BigInt(row.after) - BigInt(row.before);
        return (
          <div className="fund-change-row" role="row" key={row.label}>
            <strong role="cell">{row.label}</strong>
            <span role="cell">{money(row.before)}</span>
            <span role="cell">{money(row.after)}</span>
            <span role="cell">
              {hidden
                ? "•••••• ₫"
                : `${difference > 0n ? "+" : difference < 0n ? "−" : ""}${money((difference < 0n ? -difference : difference).toString())}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
