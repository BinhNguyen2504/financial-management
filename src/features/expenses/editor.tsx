"use client";
import { ExpenseEditorFields, ExpenseErrors } from "./editor-fields";
import { ExpenseEditorPreview } from "./editor-preview";

import { RequiredFieldsNote } from "@/components/required-fields-note";

import { FormErrorSummary } from "@/components/form-feedback";
import { LoadingSpinner } from "@/components/loading";
import { PrivacyReveal, PrivacyScope } from "@/components/privacy";

import { HelpButton } from "@/features/help/provider";

import { Save, ScanEye, X } from "lucide-react";

import { Modal as ExpenseModal } from "@/components/modal";

import { useExpenseEditor } from "./use-expense-editor";
export type { EditorMode } from "./editor-config";

export function ExpenseEditor(props: Parameters<typeof ExpenseEditorForm>[0]) {
  return (
    <PrivacyScope>
      <ExpenseEditorForm {...props} />
    </PrivacyScope>
  );
}
function ExpenseEditorForm(props: Parameters<typeof useExpenseEditor>[0]) {
  const controller = useExpenseEditor(props);
  const {
    localizedTitles,
    editor,
    onClose,
    busy,
    uncertain,
    preview,
    formId,
    tr,
    conflict,
    unchanged,
    moneyForm,
    hidden,
    commit,
    fieldErrors,
    prepare,
    selectionView,
    setClassifying,
    classifying,
    month,
    onReload,
    changeForm,
    classificationSaved,
  } = controller;

  return (
    <>
      <ExpenseModal
        title={localizedTitles[editor.mode]}
        onClose={onClose}
        busy={busy || uncertain}
        size={
          ["deleteSpend", "deleteLabel", "closeYear"].includes(editor.mode)
            ? "confirm"
            : preview?.changes.length && editor.mode !== "emoji"
              ? "detail"
              : "form"
        }
        footer={
          <div className="expense-actions">
            <button
              form={formId}
              className="expense-secondary"
              type="button"
              disabled={busy || uncertain}
              onClick={onClose}
            >
              <X size={17} aria-hidden="true" />
              {tr("Hủy")}
            </button>
            {preview && (
              <button
                form={formId}
                aria-busy={busy}
                type="button"
                className={`expense-primary ${["deleteSpend", "deleteLabel"].includes(editor.mode) ? "expense-danger" : editor.mode === "stop" ? "expense-warning" : ""}`}
                disabled={
                  busy || conflict || unchanged || (moneyForm && hidden)
                }
                onClick={commit}
              >
                {busy ? (
                  <LoadingSpinner />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {busy
                  ? tr("Đang lưu…")
                  : editor.mode === "closeYear"
                    ? tr("Xác nhận chốt năm")
                    : tr("Xác nhận lưu")}
              </button>
            )}
            {!preview && (
              <button
                form={formId}
                aria-busy={busy}
                className={`expense-primary ${["deleteSpend", "deleteLabel"].includes(editor.mode) ? "expense-danger" : editor.mode === "stop" ? "expense-warning" : ""}`}
                disabled={busy || unchanged || (moneyForm && hidden)}
              >
                {busy ? (
                  <LoadingSpinner />
                ) : (
                  <ScanEye size={17} aria-hidden="true" />
                )}
                {busy ? tr("Đang kiểm tra…") : tr("Xem trước thay đổi")}
              </button>
            )}
          </div>
        }
      >
        <ExpenseErrors.Provider value={fieldErrors}>
          <form
            id={formId}
            className="expense-form"
            noValidate
            onSubmit={prepare}
            onChange={changeForm}
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
              pageId="budgets"
              sectionId={
                editor.mode === "label" || editor.mode === "deleteLabel"
                  ? "classification"
                  : editor.mode === "month"
                    ? "balance"
                    : editor.mode === "closeYear"
                      ? "closed-year"
                      : "jar-types"
              }
              label={tr("Hiểu hũ và cách tính tiền")}
            />
            <FormErrorSummary errors={fieldErrors} prefix="expense-field-" />
            <ExpenseEditorFields controller={controller} />
            <ExpenseEditorPreview controller={controller} />
          </form>
        </ExpenseErrors.Provider>
      </ExpenseModal>
      {classifying && (
        <ExpenseEditor
          editor={{ mode: "label" }}
          view={selectionView}
          month={month}
          onClose={() => setClassifying(false)}
          onReload={onReload}
          onSaved={classificationSaved}
        />
      )}
    </>
  );
}
