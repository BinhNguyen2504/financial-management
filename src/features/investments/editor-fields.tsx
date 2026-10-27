"use client";
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
  function input(key: string, label: string, type = "text") {
    const masked = type === "money" && hidden;
    const required = ![
      "description",
      "note",
      "counterparty",
      "fee",
      "tax",
    ].includes(key);
    return (
      <label key={key} htmlFor={`investment-${key}`}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        <LocalizedInput
          aria-label={label}
          id={`investment-${key}`}
          type={masked ? "password" : type === "money" ? "text" : type}
          inputMode={type === "money" ? "numeric" : undefined}
          autoComplete="off"
          value={f[key] ?? ""}
          required={required}
          numberKind={type === "money" ? "integer" : undefined}
          onValueChange={(value) => set(key, value)}
          onBlur={() => {
            if (type === "money") set(key, normalizeInteger(f[key]));
          }}
          max={type === "date" ? view.today : undefined}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            [
              type === "money" ? `investment-hint-${key}` : "",
              fieldErrors[key] ? `investment-error-${key}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {type === "money" && (
          <MoneyHint id={`investment-hint-${key}`} value={f[key] ?? ""} />
        )}
        {fieldErrors[key] && (
          <small id={`investment-error-${key}`} className="expense-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  function categorySelect() {
    return (
      <label>
        {tr("Danh mục / ví")}
        <select
          required
          aria-label={tr("Danh mục / ví")}
          id="investment-categoryId"
          aria-invalid={!!fieldErrors.categoryId}
          aria-describedby={
            fieldErrors.categoryId ? "investment-error-categoryId" : undefined
          }
          value={f.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
        >
          <option value="">{tr("Chọn danh mục / ví")}</option>
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>
              {ruleAt(c, f.date)?.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <small id="investment-error-categoryId" className="expense-error">
            {tr(fieldErrors.categoryId)}
          </small>
        )}
      </label>
    );
  }
  return (
    <fieldset disabled={busy || uncertain} className="investment-fields">
      <legend>{tr("Thông tin giao dịch / danh mục")}</legend>
      {(mode.type === "create" || mode.type === "configure") && (
        <>
          {mode.type === "create" ? (
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
          ) : null}
          {input("name", tr("Tên danh mục"))}
          {input("emoji", "Emoji")}
          {input("description", tr("Ghi chú danh mục"))}
          <label>
            {tr("Loại danh mục")}
            <select
              value={f.kind}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="investment">{tr("Danh mục đầu tư")}</option>
              <option value="cash">{tr("Ví tiền chờ")}</option>
            </select>
          </label>
          {input(
            mode.type === "create" ? "start" : "date",
            mode.type === "create" ? tr("Ngày bắt đầu") : tr("Ngày hiệu lực"),
            "date",
          )}
          <p className="expense-muted">
            {tr(
              "Số dư mở đầu được ghi riêng tại ngày bắt đầu. Loại danh mục chỉ đổi được khi chưa có phát sinh.",
            )}
          </p>
        </>
      )}
      {(mode.type === "archive" || mode.type === "restore") && (
        <>
          {input("date", tr("Ngày hiệu lực"), "date")}
          <p>
            {mode.type === "archive"
              ? tr(
                  "Chỉ lưu trữ khi vốn và giá trị tài sản, hoặc tiền ví đều bằng 0. Lịch sử được giữ nguyên; có thể khôi phục.",
                )
              : tr(
                  "Khôi phục danh mục để tiếp tục ghi giao dịch từ ngày hiệu lực.",
                )}
          </p>
        </>
      )}
      {financial && (
        <>
          <label>
            {tr("Loại giao dịch")}
            {mode.type === "revise" ? (
              <span className="form-readonly-value">
                {localizedTransactionNames[kind]}
              </span>
            ) : (
              <select
                value={kind}
                onChange={(e) => {
                  set("transactionKind", e.target.value);
                  set("categoryId", "");
                }}
              >
                {Object.entries(localizedTransactionNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </label>
          {input("date", tr("Ngày giao dịch"), "date")}
          {categorySelect()}
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
            )}
          {(kind === "openingInvestment" || kind === "sell") &&
            input(
              "cost",
              kind === "sell"
                ? tr("Giá vốn phần đã bán (VND)")
                : tr("Giá vốn mở đầu (VND)"),
              "money",
            )}
          {kind === "sell" && (
            <button
              type="button"
              className="expense-secondary"
              onClick={sellAll}
            >
              {tr("Bán hết: lấy toàn bộ vốn, giá trị còn lại 0")}
            </button>
          )}
          {(kind === "buy" || kind === "sell") && (
            <>
              <fieldset className="dialog-form-section">
                <legend>{tr("Phí và thuế")}</legend>
                {input("fee", tr("Phí (VND)"), "money")}
                {input("tax", tr("Thuế (VND)"), "money")}
              </fieldset>
            </>
          )}
          {["buy", "sell", "transfer"].includes(kind) && (
            <label>
              {kind === "buy"
                ? tr("Nguồn tiền")
                : kind === "sell"
                  ? tr("Nơi nhận tiền")
                  : tr("Ví nhận")}
              <select
                required={kind === "transfer"}
                id="investment-cashCategoryId"
                aria-invalid={!!fieldErrors.cashCategoryId}
                aria-describedby={
                  fieldErrors.cashCategoryId
                    ? "investment-error-cashCategoryId"
                    : undefined
                }
                value={f.cashCategoryId}
                onChange={(e) => set("cashCategoryId", e.target.value)}
              >
                <option value="">
                  {kind === "transfer" ? tr("Chọn ví nhận") : tr("Bên ngoài")}
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
              </select>
              {fieldErrors.cashCategoryId && (
                <small
                  id="investment-error-cashCategoryId"
                  className="expense-error"
                >
                  {tr(fieldErrors.cashCategoryId)}
                </small>
              )}
            </label>
          )}
          {["openingInvestment", "buy", "sell", "valuation"].includes(kind) && (
            <>
              {input(
                "value",
                kind === "buy" || kind === "sell"
                  ? tr("Giá trị tài sản còn giữ sau giao dịch (VND)")
                  : tr("Giá trị định giá (VND)"),
                "money",
              )}
              <p className="expense-muted">
                {tr(
                  "Tổng giá trị của riêng danh mục, không gồm tiền chờ. Có thể nhập 0; không lấy giá vốn thay cho giá thị trường.",
                )}
              </p>
            </>
          )}
          {input("counterparty", tr("Nguồn / đích bên ngoài (tùy chọn)"))}
          {input("note", tr("Ghi chú giao dịch"))}
        </>
      )}
      {(mode.type === "revise" || mode.type === "cancel") &&
        input("reason", tr("Lý do sửa / hủy"))}
      {mode.type === "cancel" && (
        <p>
          {tr(
            "Hủy hiệu lực giao dịch này và tính lại diễn biến phía sau. Bản cũ vẫn nằm trong lịch sử.",
          )}
        </p>
      )}
    </fieldset>
  );
}
