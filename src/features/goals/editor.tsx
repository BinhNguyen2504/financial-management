"use client";
import { useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { PrivacyReveal, PrivacyScope } from "@/components/privacy";
import { useI18n } from "@/i18n/provider";
import { userFacingError } from "@/i18n/user-facing-errors";
import { fieldErrorsFromIssues } from "@/lib/field-errors";
import {
  actionSchema,
  type GoalAction,
  type GoalCommand,
} from "@/domain/goals/schema";
import { type GoalView } from "@/domain/goals/engine";
import type { GoalCommandResult } from "@/application/goals";
import { GoalAPIError, goalsJSON } from "./api";
import { statusNames } from "./editor-config";
import { GoalFields } from "./editor-fields";
import { GoalPreview } from "./editor-preview";

export function GoalEditor(props: {
  initial: GoalAction;
  view: GoalView;
  onClose(): void;
  onSaved(): void;
  onReload(): Promise<GoalView>;
  onAuthLost(): void;
}) {
  return (
    <PrivacyScope>
      <Editor {...props} />
    </PrivacyScope>
  );
}
function Editor({
  initial,
  view,
  onClose,
  onSaved,
  onReload,
  onAuthLost,
}: Parameters<typeof GoalEditor>[0]) {
  const { t: tr } = useI18n("goals");
  const [action, setAction] = useState(initial),
    [preview, setPreview] = useState<GoalCommandResult | null>(null),
    [command, setCommand] = useState<GoalCommand | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [discard, setDiscard] = useState(false),
    [needsReload, setNeedsReload] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const generation = useRef(view.dataGeneration ?? 0);
  const errorRef = useRef<HTMLDivElement>(null),
    dirty = JSON.stringify(action) !== JSON.stringify(initial);
  function change(next: GoalAction) {
    setAction(next);
    setPreview(null);
    setCommand(null);
    setFields({});
    setError("");
  }
  function close() {
    if (
      dirty ||
      preview ||
      uncertain ||
      document
        .getElementById("goal-editor")
        ?.querySelector("[data-number-invalid=true]")
    )
      setDiscard(true);
    else onClose();
  }
  async function submit(save = false) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) {
      setFields(fieldErrorsFromIssues(parsed.error.issues, true));
      setError(tr("Kiểm tra các trường được đánh dấu."));
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    setError("");
    const payload =
      save && command
        ? command
        : {
            id: crypto.randomUUID(),
            expectedVersion: view.book?.version ?? 0,
            expectedSources: view.sources.versions,
            action: parsed.data,
          };
    try {
      if (save) {
        await goalsJSON("/commands", payload, generation.current);
        onSaved();
      } else {
        const next = await goalsJSON<GoalCommandResult>(
          "/preview",
          payload,
          generation.current,
        );
        setPreview(next);
        setCommand(payload);
      }
    } catch (e) {
      if (e instanceof GoalAPIError && e.status === 401) {
        onAuthLost();
        return;
      }
      setError(
        tr(
          userFacingError(
            e instanceof Error
              ? e.message
              : "Chưa thể hoàn tất thao tác. Hãy thử lại.",
            e instanceof GoalAPIError ? e.code : undefined,
          ),
        ),
      );
      if (e instanceof GoalAPIError) {
        setFields(e.fieldErrors ?? {});
        if (e.status === 409) {
          setPreview(null);
          setCommand(null);
          setNeedsReload(true);
        }
        if (save && (e.status === 0 || e.status >= 500)) setUncertain(true);
      }
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  const input = action.type === "saveGoal" ? action.goal : null,
    existing = input ? view.book?.goals.find((g) => g.id === input.id) : null;
  const title = input
    ? existing
      ? "Điều chỉnh mục tiêu"
      : "Tạo mục tiêu"
    : action.type === "setStatus"
      ? statusNames[action.status]
      : action.type === "reorder"
        ? "Đổi thứ tự ưu tiên"
        : action.type === "reviseTransaction"
          ? action.replacement
            ? "Sửa giao dịch"
            : "Hủy giao dịch"
          : "Ghi giao dịch";
  const footer = (
    <>
      <button className="expense-secondary" onClick={close} disabled={busy}>
        {tr("Hủy")}
      </button>
      {preview ? (
        <>
          <button
            className="expense-secondary"
            disabled={busy || uncertain}
            onClick={() => {
              setPreview(null);
              setCommand(null);
            }}
          >
            {tr("Quay lại")}
          </button>
          <button
            className="expense-primary"
            disabled={busy}
            onClick={() => void submit(true)}
          >
            {tr(busy ? "Đang lưu…" : "Xác nhận lưu")}
          </button>
        </>
      ) : (
        <button
          type="submit"
          form="goal-editor"
          className="expense-primary"
          disabled={busy || needsReload}
        >
          {tr(busy ? "Đang tải…" : "Xem trước thay đổi")}
        </button>
      )}
    </>
  );
  return (
    <>
      <Modal title={tr(title)} onClose={close} busy={busy} footer={footer}>
        <PrivacyReveal />
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="expense-error"
          >
            {error}
            {Object.entries(fields).map(([key, message]) => (
              <p key={key}>{tr(message)}</p>
            ))}
            {needsReload && (
              <button
                className="expense-secondary"
                onClick={() => {
                  setBusy(true);
                  void onReload()
                    .then(() => {
                      setNeedsReload(false);
                      setError("");
                    })
                    .catch(() => {})
                    .finally(() => setBusy(false));
                }}
              >
                {tr("Tải dữ liệu mới")}
              </button>
            )}
          </div>
        )}
        {uncertain && (
          <p role="status">
            {tr(
              "Chưa xác nhận được kết quả lưu. Giữ nguyên yêu cầu và thử Xác nhận lưu để kiểm tra lại.",
            )}
          </p>
        )}
        {preview ? (
          <GoalPreview
            action={action}
            view={view}
            preview={preview}
            title={title}
          />
        ) : (
          <GoalFields
            action={action}
            view={view}
            fields={fields}
            change={change}
            onSubmit={() => void submit()}
            busy={busy}
          />
        )}
      </Modal>
      {discard && (
        <Modal
          title={tr("Bỏ thay đổi?")}
          size="confirm"
          onClose={() => setDiscard(false)}
          footer={
            <>
              <button
                className="expense-secondary"
                onClick={() => setDiscard(false)}
              >
                {tr("Tiếp tục nhập")}
              </button>
              <button className="expense-primary" onClick={onClose}>
                {tr("Bỏ thay đổi")}
              </button>
            </>
          }
        >
          <p>{tr("Nội dung chưa lưu sẽ bị bỏ.")}</p>
        </Modal>
      )}
    </>
  );
}
