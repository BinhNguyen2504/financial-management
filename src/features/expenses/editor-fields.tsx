"use client";
import { MonthYearSelect } from "@/components/month-year-select";
import { LocalizedInput } from "@/components/localized-input";
import { formatDate } from "@/i18n/format";

import { useI18n } from "@/i18n/provider";

import { useMoney, useMoneyHidden } from "@/components/privacy";

import { paymentBrands, suggestedBrand } from "@/domain/expenses/label-visuals";

import { HelpButton } from "@/features/help/provider";
import { normalizeInteger } from "@/lib/form-values";
import { Plus, Tag } from "lucide-react";
import { createContext, useContext } from "react";
import { EmojiPicker } from "./emoji-picker";
import { monthName } from "./format";
import { labelIcons, LabelSelect, LabelVisual } from "./label-visual";

import { type useExpenseEditor } from "./use-expense-editor";

export const ExpenseErrors = createContext<Record<string, string>>({});
function Amount({
  field = "amount",
  label,
  value,
  onChange,
  optional = false,
  hint,
}: {
  field?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
}) {
  const { t: tr } = useI18n("expenses");

  const id = `expense-field-${field}`;
  const errors = useContext(ExpenseErrors);
  const hidden = useMoneyHidden();
  const money = useMoney();
  return (
    <div className="expense-amount">
      <label htmlFor={id}>
        {label}
        {!optional && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hidden ? (
        <input
          id={id}
          aria-label={label}
          value="••••••"
          readOnly
          aria-describedby={`${id}-hint${errors[field] ? ` ${id}-error` : ""}`}
          autoComplete="off"
        />
      ) : (
        <LocalizedInput
          id={id}
          aria-label={label}
          aria-describedby={`${id}-hint${errors[field] ? ` ${id}-error` : ""}`}
          name={field}
          aria-invalid={!!errors[field]}
          inputMode="numeric"
          maxLength={40}
          value={value}
          required={!optional}
          numberKind="integer"
          onValueChange={onChange}
          onBlur={() => onChange(normalizeInteger(value))}
        />
      )}
      {errors[field] && (
        <small id={`${id}-error`} className="field-error">
          {tr(errors[field])}
        </small>
      )}
      <small id={`${id}-hint`}>
        {value && /^[0-9]{1,24}$/.test(value)
          ? money(value)
          : (hint ?? tr("Nhập số tiền VND"))}
        {value && hint ? ` · ${hint}` : ""}
      </small>
    </div>
  );
}
export function ExpenseEditorFields({
  controller,
}: {
  controller: ReturnType<typeof useExpenseEditor>;
}) {
  const {
    busy,
    uncertain,
    tr,
    editor,
    row,
    locale,
    fieldErrors,
    period,
    jar,
    view,
    setPeriod,
    emoji,
    name,
    kind,
    setName,
    description,
    setDescription,
    setKind,
    method,
    setMethod,
    selectionView,
    group,
    setGroup,
    setClassifying,
    amount,
    setAmount,
    opening,
    setOpening,
    money,
    rule,
    target,
    setTarget,
    future,
    funding,
    setFunding,
    extra,
    setExtra,
    closing,
    setClosing,
    date,
    setDate,
    note,
    setNote,
    label,
    labelKind,
    setLabelKind,
    brandKey,
    setBrandKey,
    setIconKey,
    iconKey,
    localize,
    errorRef,
    error,
    conflict,
    updateVersion,
    changeEmoji,
  } = controller;

  return (
    <fieldset className="dialog-form-section" disabled={busy || uncertain}>
      <legend>{tr("Thông tin cần nhập")}</legend>
      {["create", "configure", "label"].includes(editor.mode) && (
        <HelpButton
          pageId="budgets"
          sectionId="classification"
          label={tr("Phương thức và nhóm mục đích")}
        />
      )}
      {row && (
        <p className="expense-muted">
          <strong>{row.name}</strong> · {monthName(row.month, locale)}
        </p>
      )}
      {editor.mode === "initialize" && (
        <p>
          {tr(
            "Chọn tháng bắt đầu. Những tháng trước đó sẽ không được tự tạo thực chi. Bạn nhập số dư đầu kỳ khi thêm từng hũ.",
          )}
        </p>
      )}
      {["initialize", "create", "configure", "stop", "emoji"].includes(
        editor.mode,
      ) && (
        <MonthYearSelect
          label={
            editor.mode === "initialize" || editor.mode === "create"
              ? tr("Tháng bắt đầu")
              : tr("Áp dụng từ tháng")
          }
          name={
            editor.mode === "initialize" || editor.mode === "create"
              ? "start"
              : "month"
          }
          id={
            editor.mode === "initialize" || editor.mode === "create"
              ? "expense-field-start"
              : "expense-field-month"
          }
          invalid={!!(fieldErrors.start || fieldErrors.month)}
          describedBy={
            fieldErrors.start || fieldErrors.month
              ? editor.mode === "initialize" || editor.mode === "create"
                ? "expense-error-start"
                : "expense-error-month"
              : undefined
          }
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
          onChange={setPeriod}
        >
          {(fieldErrors.start || fieldErrors.month) && (
            <small
              id={
                editor.mode === "initialize" || editor.mode === "create"
                  ? "expense-error-start"
                  : "expense-error-month"
              }
              className="field-error"
            >
              {tr(fieldErrors.start || fieldErrors.month)}
            </small>
          )}
        </MonthYearSelect>
      )}
      {(editor.mode === "create" || editor.mode === "emoji") && (
        <EmojiPicker
          value={emoji}
          onChange={changeEmoji}
          name={name}
          kind={row?.kind ?? kind}
        />
      )}
      {(editor.mode === "create" || editor.mode === "configure") && (
        <>
          <label>
            {tr("Tên hũ")}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
            <input
              required
              maxLength={100}
              aria-label={tr("Tên hũ")}
              id="expense-field-name"
              name="name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={
                fieldErrors.name ? "expense-error-name" : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && (
              <small id="expense-error-name" className="field-error">
                {tr(fieldErrors.name)}
              </small>
            )}
          </label>
          <label>
            {tr("Mô tả")}
            <textarea
              rows={2}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {editor.mode === "create" ? (
            <label>
              {tr("Loại hũ")}
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="monthly">{tr("Chi trong tháng")}</option>
                <option value="accumulation">{tr("Tích lũy")}</option>
              </select>
            </label>
          ) : (
            <p className="expense-muted">
              {tr("Loại hũ được giữ nguyên để bảo toàn lịch sử.")}
            </p>
          )}
          <div className="expense-form-grid">
            <LabelSelect
              name={tr("Phương thức")}
              value={method}
              onChange={setMethod}
              labels={selectionView.book?.labels ?? []}
              kind="method"
              error={fieldErrors.method}
            />
            <LabelSelect
              name={tr("Nhóm mục đích (tùy chọn)")}
              value={group}
              onChange={setGroup}
              labels={selectionView.book?.labels ?? []}
              kind="group"
              error={fieldErrors.group}
            />
          </div>
          <button
            type="button"
            className="expense-secondary"
            onClick={() => setClassifying(true)}
          >
            <Plus size={17} aria-hidden="true" />
            {tr("Thêm phương thức / nhóm")}
          </button>
          <Amount
            label={tr("Mức mặc định mỗi tháng")}
            value={amount}
            onChange={setAmount}
          />
          {editor.mode === "create" && (
            <Amount
              label={tr("Số dư đầu kỳ")}
              field="opening"
              value={opening}
              onChange={setOpening}
              hint={tr("Tiền đã có, không tính là góp mới hoặc thực chi.")}
            />
          )}
          {editor.mode === "configure" && (
            <p className="expense-notice">
              {tr(
                "Cấu hình mới có hiệu lực từ tháng đã chọn. Các ngoại lệ riêng của tháng khác vẫn được giữ.",
              )}
            </p>
          )}
        </>
      )}
      {editor.mode === "month" && (
        <>
          <p>
            {tr("Mức mặc định:")} {money(rule?.amount ?? "0")}
            {tr(". Cần thêm theo số dư chuyển tiếp:")} {money(row!.required)}.
          </p>
          <Amount
            label={tr("Mức riêng tháng này (để trống = mặc định)")}
            optional
            field="target"
            value={target}
            onChange={setTarget}
          />
          {!future && (
            <>
              <Amount
                label={tr("Tiền thêm theo tháng (để trống = tự tính)")}
                optional
                field="funding"
                value={funding}
                onChange={setFunding}
              />
              <Amount
                label={tr("Tiền bổ sung ngoài mức tháng")}
                field="extra"
                value={extra}
                onChange={setExtra}
              />
              {row?.kind === "monthly" && (
                <Amount
                  label={tr("Số dư cuối tháng")}
                  optional
                  field="closing"
                  value={closing}
                  onChange={setClosing}
                  hint={
                    row.active
                      ? tr("Để trống mặc định là 0.")
                      : tr("Hũ đã ngừng: để trống giữ nguyên tiền còn lại.")
                  }
                />
              )}
            </>
          )}
          {future && (
            <p className="expense-notice">
              {tr("Đây là tháng tương lai. Chỉ mức kế hoạch được thay đổi.")}
            </p>
          )}
        </>
      )}
      {editor.mode === "spend" && (
        <>
          <p>
            {tr(
              "Góp vào đầu tháng; mỗi lần sử dụng sẽ được kiểm tra theo thứ tự ngày phát sinh.",
            )}
          </p>
          <label>
            {tr("Ngày sử dụng")}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
            <input
              type="date"
              aria-label={tr("Ngày sử dụng")}
              id="expense-field-date"
              name="date"
              aria-invalid={!!fieldErrors.date}
              aria-describedby={
                fieldErrors.date ? "expense-error-date" : undefined
              }
              required
              min={`${jar?.start}-01`}
              max={view.today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {fieldErrors.date && (
              <small id="expense-error-date" className="field-error">
                {tr(fieldErrors.date)}
              </small>
            )}
          </label>
          <Amount
            label={tr("Số tiền sử dụng")}
            value={amount}
            onChange={setAmount}
          />
          <label>
            {tr("Ghi chú")}
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
            {tr("Loại")}
            {label ? (
              <span className="form-readonly-value">
                {labelKind === "method"
                  ? tr("Phương thức")
                  : tr("Nhóm mục đích")}
              </span>
            ) : (
              <select
                value={labelKind}
                onChange={(e) =>
                  setLabelKind(e.target.value as typeof labelKind)
                }
              >
                <option value="method">{tr("Phương thức")}</option>
                <option value="group">{tr("Nhóm mục đích")}</option>
              </select>
            )}
          </label>
          <label>
            {tr("Tên")}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
            <input
              required
              maxLength={100}
              aria-label={tr("Tên")}
              id="expense-field-name"
              name="name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={
                fieldErrors.name ? "expense-error-name" : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && (
              <small id="expense-error-name" className="field-error">
                {tr(fieldErrors.name)}
              </small>
            )}
          </label>
          {labelKind === "method" && (
            <label>
              {tr("Thương hiệu")}
              <select
                aria-label={tr("Thương hiệu")}
                value={brandKey}
                onChange={(e) => {
                  setBrandKey(e.target.value);
                  if (e.target.value) setIconKey("");
                }}
              >
                <option value="">{tr("Không chọn thương hiệu")}</option>
                {(["bank", "wallet"] as const).map((category) => (
                  <optgroup
                    key={category}
                    label={
                      category === "bank" ? tr("Ngân hàng") : tr("Ví điện tử")
                    }
                  >
                    {paymentBrands
                      .filter((brand) => brand.category === category)
                      .map((brand) => (
                        <option key={brand.key} value={brand.key}>
                          {brand.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          {labelKind === "method" && !brandKey && suggestedBrand(name) && (
            <button
              type="button"
              className="expense-secondary"
              onClick={() => {
                setBrandKey(suggestedBrand(name)!.key);
                setIconKey("");
              }}
            >
              <Tag size={17} aria-hidden="true" />
              {tr("Dùng logo")} {suggestedBrand(name)!.name}
            </button>
          )}
          {!brandKey && (
            <label>
              {tr("Biểu tượng")}
              <select
                aria-label={tr("Biểu tượng")}
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
              >
                <option value="">{tr("Tự động theo tên")}</option>
                {Object.entries(localize(labelIcons)).map(([key, item]) => (
                  <option value={key} key={key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="label-name">
            <LabelVisual
              name={name}
              label={{
                id: label?.id ?? "",
                kind: labelKind,
                name,
                brandKey: brandKey || null,
                iconKey: iconKey || null,
              }}
              kind={labelKind}
            />
            {name || tr("Xem trước biểu tượng")}
          </p>
          <p className="expense-muted">
            {tr(
              "Chỉ các lựa chọn trong danh sách này được dùng khi thêm hũ. Sửa tên không đổi phân loại đã lưu của những tháng trước.",
            )}
          </p>
        </>
      )}
      {editor.mode === "stop" && (
        <p>
          {tr(
            "Ngừng tự cấp tiền từ tháng đã chọn. Số dư, lịch sử và các lần sử dụng vẫn được giữ; có thể khôi phục bằng cách sửa cấu hình từ một tháng chưa chốt.",
          )}
        </p>
      )}
      {editor.mode === "deleteSpend" && (
        <p>
          {tr("Xóa lần sử dụng")} {money(editor.spend.amount)} {tr("ngày")}{" "}
          {formatDate(editor.spend.date!, locale)}
          {tr(
            ". Số dư từ ngày này sẽ được tính lại; lịch sử xóa vẫn được giữ.",
          )}
        </p>
      )}
      {editor.mode === "deleteLabel" && (
        <p>
          {tr("Xóa lựa chọn “")}
          {editor.label.name}
          {tr("”. Phân loại trong lịch sử các hũ không bị xóa.")}
        </p>
      )}
      {editor.mode === "closeYear" && (
        <p>
          {tr("Năm")} {editor.year}{" "}
          {tr(
            "sẽ được khóa để lưu trữ. Số dư đã chuyển tiếp được giữ; sau chốt chỉ có thể xem và tải bản sao lưu. Hãy hoàn tất số dư tháng 12 và các lần sử dụng trước khi chốt.",
          )}
        </p>
      )}
      <p role="alert" ref={errorRef} tabIndex={-1} className="expense-error">
        {tr(error)}
      </p>
      {conflict && (
        <button
          type="button"
          className="expense-secondary"
          disabled={busy}
          onClick={updateVersion}
        >
          {tr("Tải dữ liệu mới, giữ nội dung đang nhập")}
        </button>
      )}
    </fieldset>
  );
}
