"use client";
import { LocalizedInput } from "@/components/localized-input";

import { MoneyHint } from "@/components/money-hint";

import { formatMonth as monthName } from "@/i18n/format";

import { normalizeInteger } from "@/lib/form-values";

import { type useIncomeEditor } from "./use-income-editor";

export function IncomeEditorFields({
  controller,
}: {
  controller: ReturnType<typeof useIncomeEditor>;
}) {
  const {
    fieldErrors,
    tr,
    busy,
    uncertain,
    initialRow,
    locale,
    deleting,
    mode,
    config,
    money,
    hasName,
    name,
    setName,
    description,
    setDescription,
    needsPreview,
    hasAmount,
    today,
    period,
    setPeriod,
    hidden,
    amount,
    setAmount,
    note,
    setNote,
  } = controller;
  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <span className="expense-error" id={`income-error-${key}`}>
        {tr(fieldErrors[key])}
      </span>
    ) : null;
  return (
    <fieldset className="dialog-form-section" disabled={busy || uncertain}>
      <legend>{tr("Thông tin thu nhập")}</legend>
      {initialRow && (
        <p>
          <strong>{initialRow.name}</strong> ·{" "}
          {monthName(initialRow.month, locale)}
        </p>
      )}
      {deleting ? (
        <p className="expense-notice">
          {mode.type === "deleteCategory"
            ? tr("Xóa danh mục “{0}” chưa có số thu.", { 0: config?.name })
            : tr(
                "Xóa số thu {0} của {1}? Tổng đã ghi nhận sẽ được tính lại. Lịch sử thay đổi vẫn được giữ.",
                {
                  0: money(initialRow!.amount!),
                  1: monthName(initialRow!.month, locale),
                },
              )}
        </p>
      ) : (
        <>
          {hasName && (
            <label>
              {tr("Tên")}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              <input
                aria-label={tr("Tên")}
                id="income-field-name"
                required
                maxLength={100}
                value={name}
                disabled={busy}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={
                  fieldErrors.name ? "income-error-name" : undefined
                }
                onChange={(e) => setName(e.target.value)}
              />
              {fieldError("name")}
            </label>
          )}
          {hasName && (
            <label>
              {tr("Mô tả (tùy chọn)")}
              <textarea
                maxLength={1000}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          )}
          <label>
            {mode.type === "create"
              ? tr("Tháng bắt đầu")
              : needsPreview
                ? tr("Tháng hiệu lực")
                : tr("Tháng")}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
            <input
              aria-label={
                mode.type === "create"
                  ? tr("Tháng bắt đầu")
                  : needsPreview
                    ? tr("Tháng hiệu lực")
                    : tr("Tháng")
              }
              id={
                mode.type === "create"
                  ? "income-field-start"
                  : "income-field-month"
              }
              aria-invalid={!!(fieldErrors.month || fieldErrors.start)}
              aria-describedby={
                fieldErrors.start
                  ? "income-error-start"
                  : fieldErrors.month
                    ? "income-error-month"
                    : undefined
              }
              type="month"
              required
              min={"category" in mode ? mode.category.start : "2000-01"}
              max={hasAmount ? today.slice(0, 7) : "2099-12"}
              value={period}
              disabled={busy || mode.type === "monthly"}
              onChange={(e) => setPeriod(e.target.value)}
            />
            {fieldError("month")}
            {fieldError("start")}
          </label>
          {hasAmount && (
            <label>
              {tr("Số tiền thực nhận (VND)")}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              {hidden ? (
                <input
                  aria-label={tr("Số tiền thực nhận (VND)")}
                  id="income-field-amount"
                  value="••••••"
                  readOnly
                  autoComplete="off"
                />
              ) : (
                <LocalizedInput
                  aria-label={tr("Số tiền thực nhận (VND)")}
                  id="income-field-amount"
                  required
                  inputMode="numeric"
                  maxLength={40}
                  value={amount}
                  disabled={busy}
                  aria-invalid={!!fieldErrors.amount}
                  aria-describedby={`income-hint-amount${fieldErrors.amount ? " income-error-amount" : ""}`}
                  numberKind="integer"
                  onValueChange={setAmount}
                  onBlur={() => setAmount(normalizeInteger(amount))}
                />
              )}
              <MoneyHint id="income-hint-amount" value={amount} />
              {fieldError("amount")}
            </label>
          )}
          {mode.type === "monthly" && (
            <label>
              {tr("Ghi chú (tùy chọn)")}
              <textarea
                maxLength={1000}
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          )}
          {mode.type === "stop" && (
            <p className="expense-notice">
              {tr("Ngừng “")}
              {config?.name}
              {tr(
                "” từ tháng hiệu lực, gồm các năm sau. Số thu đã ghi vẫn được giữ và có thể sửa.",
              )}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
