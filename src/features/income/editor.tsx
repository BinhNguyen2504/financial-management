"use client";
import { IncomeEditorFields } from "./editor-fields";
import { IncomeEditorPreview } from "./editor-preview";

import { RequiredFieldsNote } from "@/components/required-fields-note";

import { LoadingSpinner } from "@/components/loading";

import { PrivacyReveal, PrivacyScope } from "@/components/privacy";

import { Modal as ExpenseModal } from "@/components/modal";
import { HelpButton } from "@/features/help/provider";

import { Save, ScanEye, Trash2, X } from "lucide-react";

import { useIncomeEditor } from "./use-income-editor";
export type { EditorMode } from "./editor-config";
export function IncomeEditor(props: Parameters<typeof IncomeEditorForm>[0]) {
  return (
    <PrivacyScope>
      <IncomeEditorForm {...props} />
    </PrivacyScope>
  );
}
function IncomeEditorForm(props: Parameters<typeof useIncomeEditor>[0]) {
  const controller = useIncomeEditor(props);
  const {
    fieldErrors,
    tr,
    localizedTitles,
    mode,
    onClose,
    busy,
    uncertain,
    deleting,
    formId,
    conflict,
    unchanged,
    hasAmount,
    hidden,
    needsPreview,
    preview,
    submit,
    changed,
    error,
    errorRef,
    reloadAfterConflict,
  } = controller;

  return (
    <ExpenseModal
      title={localizedTitles[mode.type]}
      onClose={onClose}
      busy={busy || uncertain}
      size={deleting ? "confirm" : "form"}
      footer={
        <div className="expense-actions">
          <button
            form={formId}
            type="button"
            className="expense-secondary"
            onClick={onClose}
            disabled={busy || uncertain}
          >
            <X size={17} aria-hidden="true" />
            {tr("Hủy")}
          </button>
          <button
            form={formId}
            aria-busy={busy}
            className={`expense-primary ${deleting ? "expense-danger" : mode.type === "stop" ? "expense-warning" : ""}`}
            disabled={busy || conflict || unchanged || (hasAmount && hidden)}
          >
            {busy ? (
              <LoadingSpinner />
            ) : deleting ? (
              <Trash2 size={17} aria-hidden="true" />
            ) : needsPreview && !preview ? (
              <ScanEye size={17} aria-hidden="true" />
            ) : (
              <Save size={17} aria-hidden="true" />
            )}
            {busy
              ? tr("Đang xử lý…")
              : needsPreview && !preview
                ? tr("Xem trước thay đổi")
                : deleting
                  ? tr("Xác nhận xóa")
                  : needsPreview
                    ? tr("Xác nhận lưu")
                    : tr("Lưu")}
          </button>
        </div>
      }
    >
      <form
        id={formId}
        className="expense-form"
        noValidate
        onSubmit={submit}
        onChange={changed}
      >
        {!deleting && <RequiredFieldsNote />}
        {uncertain && (
          <p role="status" className="expense-notice">
            {tr(
              "Chưa xác nhận kết quả lưu. Giữ nguyên nội dung và bấm Lưu lại để kiểm tra cùng yêu cầu.",
            )}
          </p>
        )}
        <PrivacyReveal />
        <HelpButton
          pageId="income"
          sectionId={
            mode.type === "oneoff" || mode.type === "deleteOneOff"
              ? "oneoff"
              : mode.type === "monthly" || mode.type === "clear"
                ? "monthly-amount"
                : "fixed"
          }
          label={tr("Hiểu khoản thu đang nhập")}
        />
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="form-error-summary"
          >
            {tr(error)}
            {Object.entries(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([key, message]) => (
                  <li key={key}>
                    <a href={`#income-field-${key}`}>{tr(message)}</a>
                  </li>
                ))}
              </ul>
            )}
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
        <IncomeEditorFields controller={controller} />
        <IncomeEditorPreview controller={controller} />
      </form>
    </ExpenseModal>
  );
}
