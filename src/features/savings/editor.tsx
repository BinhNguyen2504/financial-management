"use client";
import { SavingsEditorFields } from "./editor-fields";
import { SavingsEditorPreview } from "./editor-preview";

import { RequiredFieldsNote } from "@/components/required-fields-note";

import { FormErrorSummary } from "@/components/form-feedback";
import { LoadingSpinner } from "@/components/loading";

import { PrivacyReveal, PrivacyScope } from "@/components/privacy";

import { Modal as ExpenseModal } from "@/components/modal";
import { HelpButton } from "@/features/help/provider";

import { Save, ScanEye, X } from "lucide-react";

import { useSavingsEditor } from "./use-savings-editor";
export { transactionNames } from "./editor-config";
export { kindNames } from "./editor-config";
export type { EditorMode } from "./editor-config";
export function SavingsEditor(props: Parameters<typeof EditorForm>[0]) {
  return (
    <PrivacyScope>
      <EditorForm {...props} />
    </PrivacyScope>
  );
}
function EditorForm(props: Parameters<typeof useSavingsEditor>[0]) {
  const controller = useSavingsEditor(props);
  const {
    fieldErrors,
    hidden,
    busy,
    tr,
    old,
    mode,
    localizedTitles,
    onClose,
    uncertain,
    formId,
    conflict,
    unchanged,
    sensitive,
    preview,
    submit,
    error,
    errorRef,
    reloadAfterConflict,
  } = controller;

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
        <RequiredFieldsNote />
        {uncertain && (
          <p role="status" className="expense-notice">
            {tr(
              "Chưa xác nhận kết quả lưu. Nội dung của bạn được giữ; bấm Xác nhận lưu để kiểm tra.",
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
            onClick={reloadAfterConflict}
          >
            {tr("Tải dữ liệu mới, giữ nội dung nhập")}
          </button>
        )}
        <SavingsEditorFields controller={controller} />
        <SavingsEditorPreview controller={controller} />
      </form>
    </ExpenseModal>
  );
}
