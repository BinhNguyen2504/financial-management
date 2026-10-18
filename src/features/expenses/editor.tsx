"use client";
import { LoadingSpinner } from "@/components/loading";
import { DialogChanges } from "@/components/dialog-content";
import { useId, useRef, useState, type FormEvent } from "react";
import type { ExpenseAction, ExpenseCommand } from "@/domain/expenses/schema";
import type {
  ExpenseRow,
  ExpenseView,
  Label,
  Spend,
} from "@/domain/expenses/types";
import type { CommandResult } from "@/application/expenses";
import { ruleAt } from "@/domain/expenses/engine";
import { ExpenseModal } from "./modal";
import { monthName } from "./format";
import {
  PrivacyScope,
  PrivacyReveal,
  useMoney,
  useMoneyHidden,
} from "@/components/privacy";
import { EmojiPicker } from "./emoji-picker";
import { jarEmoji, type JarEmoji } from "@/domain/expenses/emoji";
import { apiJSON, RequestError } from "./api";

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
function Amount({
  label,
  value,
  onChange,
  optional = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
}) {
  const id = useId();
  const hidden = useMoneyHidden();
  const money = useMoney();
  return (
    <div className="expense-amount">
      <label htmlFor={id}>{label}</label>
      {hidden ? (
        <input
          id={id}
          value="••••••"
          readOnly
          aria-describedby={`${id}-hint`}
          autoComplete="off"
        />
      ) : (
        <input
          id={id}
          aria-describedby={`${id}-hint`}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={24}
          value={value}
          required={!optional}
          onChange={(e) => onChange(e.target.value.replace(/[.,\s₫]/g, ""))}
        />
      )}
      <small id={`${id}-hint`}>
        {value && /^[0-9]{1,24}$/.test(value)
          ? money(value)
          : (hint ?? "Nhập số tiền VND")}
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
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const command = useRef<ExpenseCommand | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const future = (row?.month ?? month) > view.today.slice(0, 7);
  function makeAction(): ExpenseAction {
    const config = { name, description, method, group, amount };
    switch (editor.mode) {
      case "initialize":
        return { type: "initialize", start: period };
      case "create":
        return {
          type: "createJar",
          id: crypto.randomUUID(),
          kind,
          start: period,
          opening,
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
          target: target || null,
          funding: funding || null,
          extra,
          closing: editor.row.kind === "monthly" ? closing || null : null,
        };
      case "spend":
        return {
          type: "upsertSpend",
          id: editor.spend?.id ?? crypto.randomUUID(),
          jarId: editor.row.jarId,
          date,
          amount,
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
        };
      case "deleteLabel":
        return { type: "deleteLabel", id: editor.label.id };
      case "closeYear":
        return { type: "closeYear", year: editor.year };
    }
  }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (moneyForm && hidden) return;
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      const next = {
        id: crypto.randomUUID(),
        expectedVersion: version,
        action: makeAction(),
      };
      const result = await apiJSON<CommandResult>("/preview", {
        method: "POST",
        body: JSON.stringify(next),
      });
      command.current = next;
      setPreview(result);
      requestAnimationFrame(() => previewRef.current?.focus());
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }
  function reportError(e: unknown) {
    setError(
      e instanceof Error ? e.message : "Không thể lưu. Vui lòng thử lại.",
    );
    setConflict(e instanceof RequestError && e.code === "VERSION_CONFLICT");
    requestAnimationFrame(() => errorRef.current?.focus());
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
      await onSaved();
    } catch (e) {
      reportError(e);
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
    <ExpenseModal
      title={titles[editor.mode]}
      onClose={onClose}
      busy={busy}
      size={
        ["deleteSpend", "deleteLabel", "closeYear"].includes(editor.mode)
          ? "confirm"
          : "form"
      }
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            className="expense-secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>
          {preview && (
            <button
              form={formId}
              aria-busy={busy}
              type="button"
              className="expense-primary"
              disabled={busy || conflict || (moneyForm && hidden)}
              onClick={commit}
            >
              {busy && <LoadingSpinner />}
              {busy
                ? "Đang lưu…"
                : editor.mode === "closeYear"
                  ? "Xác nhận chốt năm"
                  : "Xác nhận lưu"}
            </button>
          )}
          {!preview && (
            <button
              form={formId}
              aria-busy={busy}
              className="expense-primary"
              disabled={busy || (moneyForm && hidden)}
            >
              {busy && <LoadingSpinner />}
              {busy ? "Đang kiểm tra…" : "Xem trước thay đổi"}
            </button>
          )}
        </div>
      }
    >
      <form
        id={formId}
        className="expense-form"
        onSubmit={prepare}
        onChange={() => {
          setPreview(null);
          command.current = null;
        }}
      >
        <PrivacyReveal />
        <fieldset className="dialog-form-section" disabled={busy}>
          <legend>Thông tin cần nhập</legend>
          {row && (
            <p className="expense-muted">
              <strong>{row.name}</strong> · {monthName(row.month)}
            </p>
          )}
          {editor.mode === "initialize" && (
            <p>
              Chọn tháng bắt đầu. Những tháng trước đó sẽ không được tự tạo thực
              chi. Bạn nhập số dư đầu kỳ khi thêm từng hũ.
            </p>
          )}
          {["initialize", "create", "configure", "stop", "emoji"].includes(
            editor.mode,
          ) && (
            <label>
              {editor.mode === "initialize" || editor.mode === "create"
                ? "Tháng bắt đầu"
                : "Áp dụng từ tháng"}
              <input
                type="month"
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
                Tên hũ
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Mô tả
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              {editor.mode === "create" ? (
                <label>
                  Loại hũ
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                  >
                    <option value="monthly">Chi trong tháng</option>
                    <option value="accumulation">Tích lũy</option>
                  </select>
                </label>
              ) : (
                <p className="expense-muted">
                  Loại hũ được giữ nguyên để bảo toàn lịch sử.
                </p>
              )}
              <div className="expense-form-grid">
                <label>
                  Phương thức
                  <input
                    required
                    list="expense-methods"
                    maxLength={100}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                </label>
                <label>
                  Nhóm mục đích (tùy chọn)
                  <input
                    list="expense-groups"
                    maxLength={100}
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  />
                </label>
              </div>
              <datalist id="expense-methods">
                {view.book?.labels
                  .filter((l) => l.kind === "method")
                  .map((l) => (
                    <option key={l.id} value={l.name} />
                  ))}
              </datalist>
              <datalist id="expense-groups">
                {view.book?.labels
                  .filter((l) => l.kind === "group")
                  .map((l) => (
                    <option key={l.id} value={l.name} />
                  ))}
              </datalist>
              <Amount
                label="Mức mặc định mỗi tháng"
                value={amount}
                onChange={setAmount}
              />
              {editor.mode === "create" && (
                <Amount
                  label="Số dư đầu kỳ"
                  value={opening}
                  onChange={setOpening}
                  hint="Tiền đã có, không tính là góp mới hoặc thực chi."
                />
              )}
              {editor.mode === "configure" && (
                <p className="expense-notice">
                  Cấu hình mới có hiệu lực từ tháng đã chọn. Các ngoại lệ riêng
                  của tháng khác vẫn được giữ.
                </p>
              )}
            </>
          )}
          {editor.mode === "month" && (
            <>
              <p>
                Mức mặc định: {money(rule?.amount ?? "0")}. Cần thêm theo số dư
                chuyển tiếp: {money(row!.required)}.
              </p>
              <Amount
                label="Mức riêng tháng này (để trống = mặc định)"
                optional
                value={target}
                onChange={setTarget}
              />
              {!future && (
                <>
                  <Amount
                    label="Tiền thêm theo tháng (để trống = tự tính)"
                    optional
                    value={funding}
                    onChange={setFunding}
                  />
                  <Amount
                    label="Tiền bổ sung ngoài mức tháng"
                    value={extra}
                    onChange={setExtra}
                  />
                  {row?.kind === "monthly" && (
                    <Amount
                      label="Số dư cuối tháng"
                      optional
                      value={closing}
                      onChange={setClosing}
                      hint={
                        row.active
                          ? "Để trống mặc định là 0."
                          : "Hũ đã ngừng: để trống giữ nguyên tiền còn lại."
                      }
                    />
                  )}
                </>
              )}
              {future && (
                <p className="expense-notice">
                  Đây là tháng tương lai. Chỉ mức kế hoạch được thay đổi.
                </p>
              )}
            </>
          )}
          {editor.mode === "spend" && (
            <>
              <p>
                Góp vào đầu tháng; mỗi lần sử dụng sẽ được kiểm tra theo thứ tự
                ngày phát sinh.
              </p>
              <label>
                Ngày sử dụng
                <input
                  type="date"
                  required
                  min={`${jar?.start}-01`}
                  max={view.today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <Amount
                label="Số tiền sử dụng"
                value={amount}
                onChange={setAmount}
              />
              <label>
                Ghi chú
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
                Loại
                <select
                  value={labelKind}
                  disabled={Boolean(label)}
                  onChange={(e) =>
                    setLabelKind(e.target.value as typeof labelKind)
                  }
                >
                  <option value="method">Phương thức</option>
                  <option value="group">Nhóm mục đích</option>
                </select>
              </label>
              <label>
                Tên
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <p className="expense-muted">
                Đây là danh sách gợi ý khi nhập. Sửa tên không đổi phân loại đã
                lưu của những tháng trước.
              </p>
            </>
          )}
          {editor.mode === "stop" && (
            <p>
              Ngừng tự cấp tiền từ tháng đã chọn. Số dư, lịch sử và các lần sử
              dụng vẫn được giữ; có thể khôi phục bằng cách sửa cấu hình từ một
              tháng chưa chốt.
            </p>
          )}
          {editor.mode === "deleteSpend" && (
            <p>
              Xóa lần sử dụng {money(editor.spend.amount)} ngày{" "}
              {editor.spend.date}. Số dư từ ngày này sẽ được tính lại; lịch sử
              xóa vẫn được giữ.
            </p>
          )}
          {editor.mode === "deleteLabel" && (
            <p>
              Xóa gợi ý “{editor.label.name}”. Phân loại trong lịch sử các hũ
              không bị xóa.
            </p>
          )}
          {editor.mode === "closeYear" && (
            <p>
              Năm {editor.year} sẽ được khóa để lưu trữ. Số dư đã chuyển tiếp
              được giữ; sau chốt chỉ có thể xem và xuất backup. Hãy hoàn tất số
              dư tháng 12 và các lần sử dụng trước khi chốt.
            </p>
          )}
          <p
            role="alert"
            ref={errorRef}
            tabIndex={-1}
            className="expense-error"
          >
            {error}
          </p>
          {conflict && (
            <button
              type="button"
              className="expense-secondary"
              disabled={busy}
              onClick={updateVersion}
            >
              Tải dữ liệu mới, giữ nội dung đang nhập
            </button>
          )}
        </fieldset>
        {preview && (
          <div
            className="expense-preview"
            ref={previewRef}
            tabIndex={-1}
            aria-label="Xem trước thay đổi"
          >
            <h3>Xem trước trước khi lưu</h3>
            <p>
              {editor.mode === "emoji"
                ? `Biểu tượng mới: ${jarEmoji(name, row?.kind, emoji)}. Mức tháng và số dư được giữ nguyên.`
                : preview.changes.length
                  ? `${preview.changes.length} dòng tháng được cập nhật. Số dư các tháng sau đã được kiểm tra.`
                  : "Thay đổi hợp lệ. Không có số tiền tháng nào bị thay đổi."}
            </p>
            {preview.changes.length > 0 && editor.mode !== "emoji" && (
              <DialogChanges
                rows={preview.changes
                  .slice()
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .flatMap((change) =>
                    (["funding", "spent", "closing"] as const).map((field) => ({
                      key: `${change.jarId}/${change.month}/${field}`,
                      label: `${change.name} · ${monthName(change.month)} · ${{ funding: "Tiền thêm", spent: "Thực chi", closing: "Số dư" }[field]}`,
                      before: change.before
                        ? money(change.before[field])
                        : "Chưa có",
                      after: change.after
                        ? money(change.after[field])
                        : "Đã bỏ dòng",
                    })),
                  )}
              />
            )}
          </div>
        )}
      </form>
    </ExpenseModal>
  );
}
