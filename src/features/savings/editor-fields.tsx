"use client";
import { LocalizedInput } from "@/components/localized-input";
import { MonthYearSelect } from "@/components/month-year-select";
import { formatDate } from "@/i18n/format";

import { decimalLabel } from "@/components/dialog-content";

import { MoneyHint } from "@/components/money-hint";

import { normalizeInteger } from "@/lib/form-values";

import { type ReactNode } from "react";
import { type useSavingsEditor } from "./use-savings-editor";

export function SavingsEditorFields({
  controller,
}: {
  controller: ReturnType<typeof useSavingsEditor>;
}) {
  const {
    fieldErrors,
    hidden,
    f,
    busy,
    set,
    view,
    tr,
    categories,
    setAllocations,
    uncertain,
    mode,
    localizedKindNames,
    names,
    selectedCategory,
    localizedTransactionNames,
    txAsset,
    txKind,
    hasAmount,
    hasContract,
    inventory,
    opensContract,
    hasWallet,
    hasCharges,
    saleQuantity,
    setSaleQuantity,
    suggestLots,
    saleLots,
    locale,
    allocations,
    setPreview,
    old,
  } = controller;
  function input(
    key: string,
    label: string,
    type = "text",
    secret = false,
    required = true,
  ) {
    if (type === "month")
      return (
        <MonthYearSelect
          key={key}
          label={label}
          value={f[key]}
          id={`savings-field-${key}`}
          name={key}
          onChange={(value) => set(key, value)}
          disabled={busy}
          required={required}
          invalid={!!fieldErrors[key]}
          describedBy={fieldErrors[key] ? `savings-error-${key}` : undefined}
        >
          {fieldErrors[key] && (
            <small id={`savings-error-${key}`} className="field-error">
              {tr(fieldErrors[key])}
            </small>
          )}
        </MonthYearSelect>
      );
    return (
      <label key={key} htmlFor={`savings-field-${key}`}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        <LocalizedInput
          aria-label={label}
          id={`savings-field-${key}`}
          name={key}
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            [
              secret && key !== "quantity" ? `savings-hint-${key}` : "",
              fieldErrors[key] ? `savings-error-${key}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          type={secret && hidden ? "password" : type}
          inputMode={secret ? "decimal" : undefined}
          value={secret && hidden ? "••••••" : f[key]}
          disabled={busy || (secret && hidden)}
          numberKind={
            secret ? (key === "quantity" ? "decimal" : "integer") : undefined
          }
          onValueChange={(value) => set(key, value)}
          onBlur={() => {
            if (secret && key !== "quantity")
              set(key, normalizeInteger(f[key]));
          }}
          required={required}
          autoComplete="off"
          max={
            type === "date" && !["maturity"].includes(key)
              ? view.today
              : undefined
          }
        />
        {secret && key !== "quantity" && (
          <MoneyHint id={`savings-hint-${key}`} value={f[key]} />
        )}
        {fieldErrors[key] && (
          <small id={`savings-error-${key}`} className="field-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  function select(key: string, label: string, options: ReactNode) {
    return (
      <label>
        {label}
        <span className="required-mark" aria-hidden="true">
          *
        </span>
        <select
          id={`savings-field-${key}`}
          required
          aria-invalid={!!fieldErrors[key]}
          aria-describedby={
            fieldErrors[key] ? `savings-error-${key}` : undefined
          }
          aria-label={label}
          value={f[key]}
          onChange={(e) => {
            set(key, e.target.value);
            if (key === "transactionKind") {
              const k = e.target.value;
              const asset = k.includes("Gold")
                ? "gold"
                : [
                      "openingDeposit",
                      "openDeposit",
                      "withdrawDeposit",
                      "interest",
                      "rollover",
                    ].includes(k)
                  ? "deposit"
                  : "cash";
              set(
                "categoryId",
                categories.find((c) => c.kind === asset)?.id ?? "",
              );
              set("cashCategoryId", "");
              set("contractId", "");
              setAllocations({});
            }
          }}
          disabled={busy}
        >
          {options}
        </select>
        {fieldErrors[key] && (
          <small id={`savings-error-${key}`} className="field-error">
            {tr(fieldErrors[key])}
          </small>
        )}
      </label>
    );
  }
  return (
    <fieldset className="dialog-form-section" disabled={busy || uncertain}>
      <legend>{tr("Thông tin giao dịch / danh mục")}</legend>
      {["create", "configure"].includes(mode.type) && (
        <>
          {input("name", tr("Tên danh mục"))}
          {input("description", tr("Mô tả"), "text", false, false)}
          {select(
            "emoji",
            tr("Biểu tượng"),
            ["🌱", "💰", "🏦", "🪙", "💛", "🏡", "✈️", "🎯"].map((v) => (
              <option key={v}>{v}</option>
            )),
          )}
          {mode.type === "create" && (
            <>
              {select(
                "kind",
                tr("Loại tài sản"),
                Object.entries(localizedKindNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                )),
              )}
              {f.kind === "gold" &&
                select(
                  "unit",
                  tr("Đơn vị vàng"),
                  <>
                    <option value="">{tr("Chọn đơn vị")}</option>
                    {["chỉ", "lượng/cây", "gram"].map((v) => (
                      <option key={v} value={v}>
                        {tr(v)}
                      </option>
                    ))}
                  </>,
                )}
            </>
          )}
        </>
      )}
      {[
        "create",
        "configure",
        "archive",
        "restore",
        "close",
        "reopen",
      ].includes(mode.type) &&
        input(
          "month",
          mode.type === "create" ? tr("Tháng bắt đầu") : tr("Tháng hiệu lực"),
          "month",
        )}
      {mode.type === "archive" && (
        <p className="expense-notice">
          {tr(
            "Chỉ lưu trữ sau khi xử lý hết tiền, vàng và sổ tiền gửi. Chọn tháng sau lần giao dịch cuối; lịch sử và báo cáo vẫn được giữ.",
          )}
        </p>
      )}
      {mode.type === "reopen" && (
        <p className="expense-notice">
          {tr(
            "Tháng được chọn và các tháng đã chốt sau đó sẽ cần chốt lại. Bản chốt cũ vẫn được giữ.",
          )}
        </p>
      )}
      {mode.type === "close" && (
        <label className="savings-check">
          <input
            type="checkbox"
            checked={f.acceptStalePrices === "true"}
            onChange={(e) => set("acceptStalePrices", String(e.target.checked))}
          />
          {tr("Chấp nhận giá vàng mang từ tháng trước")}
        </label>
      )}
      {mode.type === "price" && (
        <>
          {select(
            "categoryId",
            tr("Danh mục vàng"),
            <>
              <option value="">{tr("Chọn danh mục")}</option>
              {categories
                .filter((c) => c.kind === "gold")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {names(c)} · {tr(c.unit ?? "")}
                  </option>
                ))}
            </>,
          )}
          {input("date", tr("Ngày giá"), "date")}
          {input(
            "unitPrice",
            tr("Giá bán lại dự kiến (VND/{0})", {
              0: tr(selectedCategory?.unit ?? "đơn vị"),
            }),
            "text",
            true,
          )}
        </>
      )}
      {mode.type === "transaction" && (
        <>
          {select(
            "transactionKind",
            tr("Loại giao dịch"),
            Object.entries(localizedTransactionNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            )),
          )}
          {select(
            "categoryId",
            tr("Danh mục"),
            <>
              <option value="">{tr("Chọn danh mục")}</option>
              {categories
                .filter((c) => c.kind === txAsset)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {names(c)}
                  </option>
                ))}
            </>,
          )}
          {input("date", tr("Ngày giao dịch"), "date")}
          {txKind.startsWith("opening") && (
            <p className="expense-notice">
              {tr(
                "Tài sản có sẵn tại ngày bắt đầu theo dõi, không tính là tiền nạp mới.",
              )}
            </p>
          )}
          {hasAmount &&
            input(
              "amount",
              txKind === "openingGold"
                ? tr("Giá vốn mở đầu (VND)")
                : txKind === "withdrawDeposit"
                  ? tr("Gốc rút (VND)")
                  : tr("Số tiền (VND)"),
              "text",
              true,
            )}
          {["openingGold", "buyGold"].includes(txKind) &&
            input(
              "quantity",
              tr("Số lượng ({0})", {
                0: tr(selectedCategory?.unit ?? "đơn vị"),
              }),
              "text",
              true,
            )}
          {["openingGold", "buyGold", "sellGold"].includes(txKind) &&
            input(
              "unitPrice",
              txKind === "buyGold"
                ? tr("Giá mua mỗi đơn vị (VND)")
                : tr("Giá bán lại mỗi đơn vị (VND)"),
              "text",
              true,
            )}
          {hasContract &&
            select(
              "contractId",
              tr("Sổ tiền gửi"),
              <>
                <option value="">{tr("Chọn sổ")}</option>
                {inventory.contracts
                  .filter((c) => c.categoryId === f.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.opened}
                    </option>
                  ))}
              </>,
            )}
          {opensContract && (
            <>
              {input("name", tr("Tên sổ"))}
              {input("maturity", tr("Ngày đáo hạn"), "date")}
              {input("term", tr("Kỳ hạn / ghi chú sổ"), "text", false, false)}
            </>
          )}
          {["withdrawDeposit", "rollover"].includes(txKind) &&
            input("interest", tr("Lãi thực nhận (VND)"), "text", true)}
          {txKind === "rollover" &&
            input(
              "reinvestInterest",
              tr("Lãi nhập sổ mới (VND)"),
              "text",
              true,
            )}
          {txKind === "interest" &&
            select(
              "capitalize",
              tr("Cách nhận lãi"),
              <>
                <option value="true">{tr("Nhập gốc sổ hiện tại")}</option>
                <option value="false">{tr("Nhận tiền")}</option>
              </>,
            )}
          {hasWallet &&
            !(txKind === "interest" && f.capitalize === "true") &&
            select(
              "cashCategoryId",
              ["buyGold", "openDeposit"].includes(txKind)
                ? tr("Nguồn tiền")
                : tr("Ví nhận tiền"),
              <>
                <option value="">
                  {txKind === "transfer"
                    ? tr("Chọn ví nhận")
                    : tr("Bên ngoài Tiết kiệm")}
                </option>
                {categories
                  .filter((c) => c.kind === "cash" && c.id !== f.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {names(c)}
                    </option>
                  ))}
              </>,
            )}
          {hasCharges && (
            <fieldset className="dialog-form-section">
              <legend>{tr("Phí và thuế")}</legend>
              <div className="savings-form-grid">
                {input("fee", tr("Phí (VND)"), "text", true)}
                {input("tax", tr("Thuế (VND)"), "text", true)}
              </div>
            </fieldset>
          )}
          {txKind === "sellGold" && (
            <fieldset>
              <legend>{tr("Chọn đợt mua để bán · ưu tiên đợt cũ nhất")}</legend>
              <label>
                {tr("Tổng lượng muốn bán (để gợi ý)")}
                <LocalizedInput
                  numberKind="decimal"
                  type={hidden ? "password" : "text"}
                  inputMode="decimal"
                  disabled={hidden || busy}
                  value={hidden ? "••••••" : saleQuantity}
                  onValueChange={setSaleQuantity}
                />
              </label>
              <button
                type="button"
                className="expense-secondary"
                disabled={hidden || busy || !saleQuantity}
                onClick={suggestLots}
              >
                {tr("Gợi ý theo đợt cũ nhất")}
              </button>
              {saleLots.map((l) => (
                <label key={l.id}>
                  {tr("Đợt")} {formatDate(l.date!, locale)} {tr("· còn")}{" "}
                  {hidden ? "••••••" : decimalLabel(l.quantity, locale)}{" "}
                  {tr(selectedCategory?.unit ?? "")}
                  <LocalizedInput
                    numberKind="decimal"
                    aria-label={tr("Lượng bán đợt {0} {1}", {
                      0: l.date,
                      1: l.id.slice(0, 4),
                    })}
                    type={hidden ? "password" : "text"}
                    inputMode="decimal"
                    disabled={busy || hidden}
                    value={hidden ? "••••••" : (allocations[l.id] ?? "")}
                    placeholder="0"
                    onValueChange={(value) => {
                      setAllocations((a) => ({
                        ...a,
                        [l.id]: value,
                      }));
                      setPreview(null);
                    }}
                  />
                </label>
              ))}
              <p className="expense-muted">
                {tr(
                  "Nhập lượng bán vào một hoặc nhiều đợt; để trống những đợt không bán.",
                )}
              </p>
            </fieldset>
          )}
          {input("note", tr("Ghi chú"), "text", false, false)}
        </>
      )}
      {(mode.type === "reopen" ||
        mode.type === "void" ||
        (old && mode.type === "transaction")) &&
        input("reason", tr("Lý do thay đổi"))}
    </fieldset>
  );
}
