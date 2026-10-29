"use client";
import type { ReactNode } from "react";
import { LocalizedInput } from "@/components/localized-input";
import { MoneyHint } from "@/components/money-hint";
import { ruleAt } from "@/domain/investments/engine";
import { normalizeInteger } from "@/lib/form-values";
import { type useInvestmentEditor } from "./use-investment-editor";

export function InvestmentEditorFields({
  controller,
}: {
  controller: ReturnType<typeof useInvestmentEditor>;
}) {
  const {
    hidden,
    f,
    set,
    view,
    fieldErrors,
    tr,
    eligible,
    busy,
    uncertain,
    mode,
    financial,
    localizedTransactionNames,
    kind,
    sellAll,
    categories,
  } = controller;
  const disabled = busy || uncertain;
  function labelText(label: string, required: boolean) {
    return (
      <span className="investment-field-label">
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </span>
    );
  }
  function error(key: string) {
    return (
      fieldErrors[key] && (
        <small id={`investment-error-${key}`} className="field-error">
          {tr(fieldErrors[key])}
        </small>
      )
    );
  }
  function input(
    key: string,
    label: string,
    type = "text",
    wide = false,
    hint?: string,
    action?: ReactNode,
  ) {
    const money = type === "money";
    const required = ![
      "description",
      "note",
      "counterparty",
      "fee",
      "tax",
    ].includes(key);
    return (
      <label
        key={key}
        htmlFor={`investment-${key}`}
        className={`investment-field${wide ? " investment-field-wide" : ""}`}
      >
        {labelText(label, required)}
        <LocalizedInput
          aria-label={label}
          id={`investment-${key}`}
          type={money ? (hidden ? "password" : "text") : type}
          inputMode={money ? "numeric" : undefined}
          autoComplete="off"
          value={f[key] ?? ""}
          required={required}
          numberKind={money ? "integer" : undefined}
          onValueChange={(value) => set(key, value)}
          onBlur={() => {
            if (money) set(key, normalizeInteger(f[key]));
          }}
          max={type === "date" ? view.today : undefined}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            [
              money ? `investment-hint-${key}` : "",
              hint ? `investment-description-${key}` : "",
              fieldErrors[key] ? `investment-error-${key}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {money && (
          <MoneyHint id={`investment-hint-${key}`} value={f[key] ?? ""} />
        )}
        {error(key)}
        {hint && (
          <small id={`investment-description-${key}`} className="expense-muted">
            {hint}
          </small>
        )}
        {action}
      </label>
    );
  }
  function select(
    key: string,
    label: string,
    options: ReactNode,
    required = true,
  ) {
    return (
      <label className="investment-field" htmlFor={`investment-${key}`}>
        {labelText(label, required)}
        <select
          id={`investment-${key}`}
          required={required}
          aria-label={label}
          value={f[key]}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            fieldErrors[key] ? `investment-error-${key}` : undefined
          }
          onChange={(event) => {
            set(key, event.target.value);
            if (key === "transactionKind") set("categoryId", "");
          }}
        >
          {options}
        </select>
        {error(key)}
      </label>
    );
  }
  function group(title: string, children: ReactNode) {
    return (
      <fieldset className="investment-fields" disabled={disabled}>
        <legend>{title}</legend>
        {children}
      </fieldset>
    );
  }
  const cashLabel =
    kind === "buy"
      ? tr("Nguồn tiền")
      : kind === "sell"
        ? tr("Nơi nhận tiền")
        : tr("Ví nhận");
  const hasSettlement = ["buy", "sell", "transfer"].includes(kind);
  return (
    <div className="investment-editor-fields">
      {(mode.type === "create" || mode.type === "configure") &&
        group(
          tr("Thông tin danh mục"),
          <>
            {mode.type === "create" && (
              <div className="investment-suggestions">
                {[
                  [tr("Cổ phiếu"), "📈"],
                  [tr("Quỹ cổ phiếu"), "🌿"],
                  [tr("Quỹ trái phiếu"), "🏦"],
                  ["Crypto", "🌐"],
                  [tr("Tiền chờ TCBS"), "💼"],
                ].map(([name, emoji]) => (
                  <button
                    type="button"
                    className="expense-secondary"
                    key={name}
                    onClick={() => {
                      set("name", name);
                      set("emoji", emoji);
                      set(
                        "kind",
                        name === tr("Tiền chờ TCBS") ? "cash" : "investment",
                      );
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {input("name", tr("Tên danh mục"))}
            {input("emoji", "Emoji")}
            {select(
              "kind",
              tr("Loại danh mục"),
              <>
                <option value="investment">{tr("Danh mục đầu tư")}</option>
                <option value="cash">{tr("Ví tiền chờ")}</option>
              </>,
            )}
            {input(
              mode.type === "create" ? "start" : "date",
              mode.type === "create" ? tr("Ngày bắt đầu") : tr("Ngày hiệu lực"),
              "date",
            )}
            {input("description", tr("Ghi chú danh mục"), "text", true)}
            <p className="expense-muted">
              {tr(
                "Số dư mở đầu được ghi riêng tại ngày bắt đầu. Loại danh mục chỉ đổi được khi chưa có phát sinh.",
              )}
            </p>
          </>,
        )}
      {(mode.type === "archive" || mode.type === "restore") &&
        group(
          tr("Thông tin danh mục"),
          <>
            {input("date", tr("Ngày hiệu lực"), "date", true)}
            <p>
              {mode.type === "archive"
                ? tr(
                    "Chỉ lưu trữ khi vốn và giá trị tài sản, hoặc tiền ví đều bằng 0. Lịch sử được giữ nguyên; có thể khôi phục.",
                  )
                : tr(
                    "Khôi phục danh mục để tiếp tục ghi giao dịch từ ngày hiệu lực.",
                  )}
            </p>
          </>,
        )}
      {financial && (
        <>
          {group(
            tr("Thông tin giao dịch"),
            <>
              {mode.type === "revise" ? (
                <label className="investment-field">
                  {labelText(tr("Loại giao dịch"), false)}
                  <span className="form-readonly-value">
                    {localizedTransactionNames[kind]}
                  </span>
                </label>
              ) : (
                select(
                  "transactionKind",
                  tr("Loại giao dịch"),
                  Object.entries(localizedTransactionNames).map(
                    ([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ),
                  ),
                )
              )}
              {input("date", tr("Ngày giao dịch"), "date")}
              {select(
                "categoryId",
                tr("Danh mục / ví"),
                <>
                  <option value="">{tr("Chọn danh mục / ví")}</option>
                  {eligible.map((category) => (
                    <option key={category.id} value={category.id}>
                      {ruleAt(category, f.date)?.name}
                    </option>
                  ))}
                </>,
              )}
              {hasSettlement &&
                select(
                  "cashCategoryId",
                  cashLabel,
                  <>
                    <option value="">
                      {kind === "transfer"
                        ? tr("Chọn ví nhận")
                        : tr("Bên ngoài")}
                    </option>
                    {categories
                      .filter(
                        (c) =>
                          c.kind === "cash" &&
                          c.id !== f.categoryId &&
                          ruleAt(c, f.date)?.active,
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {ruleAt(c, f.date)?.name}
                        </option>
                      ))}
                  </>,
                  kind === "transfer",
                )}
            </>,
          )}
          {group(
            tr("Số tiền và định giá"),
            <>
              {[
                "openingCash",
                "deposit",
                "withdraw",
                "transfer",
                "buy",
                "sell",
              ].includes(kind) &&
                input(
                  "amount",
                  kind === "sell"
                    ? tr("Tiền bán trước phí/thuế (VND)")
                    : kind === "buy"
                      ? tr("Tiền mua trước phí/thuế (VND)")
                      : tr("Số tiền (VND)"),
                  "money",
                  kind !== "sell",
                )}
              {(kind === "openingInvestment" || kind === "sell") &&
                input(
                  "cost",
                  kind === "sell"
                    ? tr("Giá vốn phần đã bán (VND)")
                    : tr("Giá vốn mở đầu (VND)"),
                  "money",
                  kind !== "sell",
                )}
              {kind === "sell" && (
                <button
                  type="button"
                  className="expense-secondary investment-sell-all"
                  onClick={sellAll}
                >
                  {tr("Bán hết: lấy toàn bộ vốn, giá trị còn lại 0")}
                </button>
              )}
              {(kind === "buy" || kind === "sell") && (
                <fieldset className="investment-fields investment-fees">
                  <legend>{tr("Phí và thuế")}</legend>
                  {input("fee", tr("Phí (VND)"), "money")}
                  {input("tax", tr("Thuế (VND)"), "money")}
                </fieldset>
              )}
              {["openingInvestment", "buy", "sell", "valuation"].includes(
                kind,
              ) &&
                input(
                  "value",
                  kind === "buy" || kind === "sell"
                    ? tr("Giá trị tài sản còn giữ sau giao dịch (VND)")
                    : tr("Giá trị định giá (VND)"),
                  "money",
                  true,
                  tr(
                    "Tổng giá trị của riêng danh mục, không gồm tiền chờ. Có thể nhập 0; không lấy giá vốn thay cho giá thị trường.",
                  ),
                )}
            </>,
          )}
          {group(
            tr("Thông tin bổ sung"),
            <>
              {input(
                "counterparty",
                tr("Nguồn / đích bên ngoài (tùy chọn)"),
                "text",
                true,
              )}
              {input("note", tr("Ghi chú giao dịch"), "text", true)}
              {mode.type === "revise" &&
                input("reason", tr("Lý do sửa / hủy"), "text", true)}
            </>,
          )}
        </>
      )}
      {mode.type === "cancel" &&
        group(
          tr("Hủy giao dịch"),
          <>
            {input("reason", tr("Lý do sửa / hủy"), "text", true)}
            <p>
              {tr(
                "Hủy hiệu lực giao dịch này và tính lại diễn biến phía sau. Bản cũ vẫn nằm trong lịch sử.",
              )}
            </p>
          </>,
        )}
    </div>
  );
}
