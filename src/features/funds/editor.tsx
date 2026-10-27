"use client";
import { FundEditorFields } from "./editor-fields";
import { FundEditorPreview } from "./editor-preview";

import { RequiredFieldsNote } from "@/components/required-fields-note";

import { LoadingSpinner } from "@/components/loading";

import { PrivacyReveal, PrivacyScope } from "@/components/privacy";

import { Modal as ExpenseModal } from "@/components/modal";
import { HelpButton } from "@/features/help/provider";

import { Save, ScanEye, X } from "lucide-react";

import { type Props } from "./editor-config";
import { useFundEditor } from "./use-fund-editor";
export type { EditorMode } from "./editor-config";
export function FundEditor(props: Props) {
  return (
    <PrivacyScope>
      <Editor {...props} />
    </PrivacyScope>
  );
}

function Editor(props: Parameters<typeof useFundEditor>[0]) {
  const controller = useFundEditor(props);
  const {
    fieldErrors,
    fieldId,
    tr,
    hidden,
    title,
    onClose,
    busy,
    uncertain,
    mode,
    step,
    preview,
    setStep,
    next,
    conflict,
    unchanged,
    submit,
    error,
    errorRef,
    reloadAfterConflict,
  } = controller;

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
      <RequiredFieldsNote />
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
          onClick={reloadAfterConflict}
        >
          {tr("Tải dữ liệu mới, giữ nội dung nhập")}
        </button>
      )}
      <FundEditorFields controller={controller} />
      <FundEditorPreview controller={controller} />
    </ExpenseModal>
  );
}
