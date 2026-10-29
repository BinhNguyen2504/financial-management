"use client";
import { useRef } from "react";
import { InvestmentEditorFields } from "./editor-fields";
import { InvestmentEditorPreview } from "./editor-preview";

import { FormErrorSummary } from "@/components/form-feedback";
import { focusPointerControl } from "@/components/pointer-focus";
import { RequiredFieldsNote } from "@/components/required-fields-note";

import { LoadingSpinner } from "@/components/loading";

import { PrivacyReveal, PrivacyScope } from "@/components/privacy";

import type { InvestmentView } from "@/domain/investments/types";
import { Modal as ExpenseModal } from "@/components/modal";
import { HelpButton } from "@/features/help/provider";

import { Save, ScanEye, X } from "lucide-react";

import { type EditorMode } from "./editor-config";
import { useInvestmentEditor } from "./use-investment-editor";
export { transactionNames } from "./editor-config";
export type { EditorMode } from "./editor-config";
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
function Editor(props: Parameters<typeof useInvestmentEditor>[0]) {
  const controller = useInvestmentEditor(props);
  const continueButton = useRef<HTMLButtonElement>(null);
  const {
    hidden,
    fieldErrors,
    tr,
    title,
    close,
    busy,
    uncertain,
    mode,
    formId,
    conflict,
    unchanged,
    preview,
    submit,
    kind,
    error,
    errorRef,
    reloadAfterConflict,
    confirmDiscard,
    continueEditing,
    discard,
    invalidatePreview,
  } = controller;

  return (
    <>
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
              onMouseDown={focusPointerControl}
              onClick={close}
              disabled={busy || uncertain}
            >
              <X size={17} aria-hidden="true" /> {tr("Đóng cửa sổ")}
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
          onChangeCapture={invalidatePreview}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <PrivacyReveal />
          <div className="investment-form-tools">
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
            <RequiredFieldsNote />
          </div>
          {error && (
            <div ref={errorRef} tabIndex={-1}>
              {Object.keys(fieldErrors).length ? (
                <FormErrorSummary errors={fieldErrors} prefix="investment-" />
              ) : (
                <div role="alert" className="expense-error">
                  {tr(error)}
                </div>
              )}
            </div>
          )}
          {uncertain && (
            <p className="expense-notice">
              {tr(
                "Chưa xác nhận kết quả lưu. Nội dung tạm giữ nguyên; bấm xác nhận lại để kiểm tra.",
              )}
            </p>
          )}
          <InvestmentEditorFields controller={controller} />
          <InvestmentEditorPreview controller={controller} />
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
        </form>
      </ExpenseModal>
      {confirmDiscard && (
        <ExpenseModal
          title={tr("Đóng cửa sổ và bỏ nội dung chưa lưu?")}
          size="confirm"
          onClose={continueEditing}
          initialFocusRef={continueButton}
          footer={
            <div className="expense-actions">
              <button
                type="button"
                className="expense-secondary"
                ref={continueButton}
                onMouseDown={focusPointerControl}
                onClick={continueEditing}
              >
                {tr("Tiếp tục nhập")}
              </button>
              <button
                type="button"
                className="expense-primary expense-danger"
                onClick={discard}
              >
                {tr("Bỏ thay đổi")}
              </button>
            </div>
          }
        >
          <p>
            {tr(
              "Nội dung chưa lưu sẽ bị bỏ. Bạn có thể tiếp tục nhập để giữ lại bản nháp.",
            )}
          </p>
        </ExpenseModal>
      )}
    </>
  );
}
