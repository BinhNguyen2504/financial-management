"use client";
import { LocalizedInput } from "@/components/localized-input";

import { MoneyHint } from "@/components/money-hint";

import {
  fundIds,
  type FundId,
  type FundTransaction,
} from "@/domain/funds/schema";

import { normalizeInteger } from "@/lib/form-values";
import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { cloneElement, type ReactElement } from "react";

import {
  displayTime,
  fundNames,
  localDateTime,
  transactionNames as transactionNamesSource,
} from "./content";

import { type useFundEditor } from "./use-fund-editor";

export function FundEditorFields({
  controller,
}: {
  controller: ReturnType<typeof useFundEditor>;
}) {
  const {
    fieldErrors,
    fieldId,
    f,
    tr,
    set,
    hidden,
    view,
    id,
    busy,
    uncertain,
    mode,
    step,
    config,
    applyLiving,
    setApplyLiving,
    setJarIds,
    invalidate,
    options,
    jarIds,
    money,
    livingTotal,
    multipliers,
    setMultipliers,
    priority,
    setPriority,
    location,
    localize,
    old,
    locale,
  } = controller;
  function field(
    key: string,
    label: string,
    input: ReactElement<{
      "aria-label"?: string;
      "aria-invalid"?: boolean;
      "aria-describedby"?: string;
    }>,
  ) {
    const err =
      fieldErrors[key] ??
      Object.entries(fieldErrors).find(([k]) => k.endsWith("." + key))?.[1];
    return (
      <div key={key} className="fund-field">
        <label htmlFor={fieldId(key)}>
          {label}
          {!["note", "active"].includes(key) && (
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {cloneElement(input, {
          "aria-label": label,
          "aria-invalid": Boolean(err),
          "aria-describedby":
            [
              key === "amount" ? `${fieldId(key)}-hint` : "",
              err ? `${fieldId(key)}-error` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
        })}
        {key === "amount" && (
          <MoneyHint id={`${fieldId(key)}-hint`} value={f.amount} />
        )}
        {err && (
          <small id={`${fieldId(key)}-error`} className="fund-field-error">
            {tr(err)}
          </small>
        )}
      </div>
    );
  }
  function input(
    key: "name" | "amount" | "occurredAt" | "note" | "reason",
    label: string,
  ) {
    return field(
      key,
      label,
      <LocalizedInput
        id={fieldId(key)}
        value={f[key]}
        required={key !== "note"}
        numberKind={key === "amount" ? "integer" : undefined}
        onValueChange={(value) => set(key, value)}
        onBlur={() => {
          if (key === "amount") set(key, normalizeInteger(f.amount));
        }}
        type={
          key === "occurredAt"
            ? "datetime-local"
            : key === "amount" && hidden
              ? "password"
              : "text"
        }
        inputMode={key === "amount" ? "numeric" : undefined}
        readOnly={key === "amount" && hidden}
        maxLength={key === "amount" ? 40 : 1000}
        max={
          key === "occurredAt"
            ? localDateTime(new Date().toISOString())
            : undefined
        }
        aria-invalid={Boolean(
          fieldErrors[key] ||
          Object.keys(fieldErrors).some((k) => k.endsWith("." + key)),
        )}
      />,
    );
  }
  function fundSelect(key: "fundId" | "toFundId", label: string) {
    return field(
      key,
      label,
      <select
        id={fieldId(key)}
        value={f[key]}
        onChange={(e) => set(key, e.target.value as FundId)}
      >
        {fundIds.map((k) => (
          <option key={k} value={k}>
            {fundNames[k]}
          </option>
        ))}
      </select>,
    );
  }
  function locationSelect(key: "locationId" | "toLocationId", label: string) {
    return field(
      key,
      label,
      <select
        id={fieldId(key)}
        value={f[key]}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">{tr("Chọn nơi giữ")}</option>
        {view.book?.locations
          .filter((l) => l.active || l.id === f[key])
          .map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {!l.active ? tr(" · Đã ngừng") : ""}
            </option>
          ))}
      </select>,
    );
  }
  return (
    <fieldset
      id={`${id}-fields`}
      className="fund-fields"
      disabled={busy || uncertain}
    >
      {mode.type === "configure" ? (
        <>
          <p className="eyebrow">
            {tr("Bước")} {step + 1}/3 ·{" "}
            {step === 0
              ? tr("Chi phí sinh hoạt")
              : step === 1
                ? tr("Quy mô dự phòng")
                : tr("Thứ tự ưu tiên")}
          </p>
          {step === 0 && (
            <>
              <p>
                {tr(
                  "Living expense là chi phí thiết yếu để duy trì cuộc sống mỗi tháng. Chọn những hũ bạn cần tiếp tục chi ngay cả khi thu nhập bị gián đoạn.",
                )}
              </p>
              <p className="fund-note">
                {tr("Dùng mức cấu hình của tháng")}{" "}
                {view.source.month.split("-").reverse().join("/")}
                {tr("; bỏ qua điều chỉnh riêng từng tháng và hũ tích lũy.")}
              </p>
              {config && (
                <label className="fund-check">
                  <input
                    type="checkbox"
                    checked={applyLiving}
                    onChange={(e) => {
                      setApplyLiving(e.target.checked);
                      setJarIds(config.living.items.map((i) => i.jarId));
                      invalidate();
                    }}
                  />
                  {tr("Cập nhật mức sinh hoạt từ Chi tiêu hiện tại")}
                </label>
              )}
              {!view.source.items.length && (
                <p>
                  {tr("Chưa có hũ chi tháng đang hoạt động.")}{" "}
                  <Link href="/budgets">{tr("Thiết lập tại Chi tiêu")}</Link>
                  {tr(", sau đó tải lại dữ liệu.")}
                </p>
              )}
              {options.map((item) => (
                <label className="fund-check" key={item.jarId}>
                  <input
                    type="checkbox"
                    checked={jarIds.includes(item.jarId)}
                    disabled={Boolean(config && !applyLiving)}
                    onChange={(e) => {
                      setJarIds((s) =>
                        e.target.checked
                          ? [...s, item.jarId]
                          : s.filter((v) => v !== item.jarId),
                      );
                      invalidate();
                    }}
                  />
                  <span>
                    {item.name}
                    {!view.source.items.some((i) => i.jarId === item.jarId)
                      ? tr(" · Không còn hoạt động")
                      : ""}
                  </span>
                  <strong>{money(item.amount)}</strong>
                </label>
              ))}
              <p className="fund-total">
                {tr("Mức sinh hoạt:")}{" "}
                <strong>
                  {money(livingTotal)}
                  {tr("/tháng")}
                </strong>
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <p>
                {tr(
                  "Nhập số tháng muốn dự phòng cho từng quỹ. Ví dụ phép tính: 2 tháng × mức sinh hoạt. Chọn hệ số phù hợp hoàn cảnh của bạn.",
                )}
              </p>
              {fundIds.map((k) =>
                field(
                  `multipliers.${k}`,
                  tr("{0} — hệ số x", { 0: fundNames[k] }),
                  <LocalizedInput
                    numberKind="decimal"
                    precision={2}
                    key={k}
                    id={fieldId(`multipliers.${k}`)}
                    inputMode="decimal"
                    autoComplete="off"
                    value={multipliers[k]}
                    onValueChange={(value) => {
                      setMultipliers((s) => ({
                        ...s,
                        [k]: value,
                      }));
                      invalidate();
                    }}
                  />,
                ),
              )}
              <p className="fund-note">
                {tr(
                  "Mục tiêu bằng mức sinh hoạt đã xác nhận nhân x; số tiền làm tròn lên đồng VND.",
                )}
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <p>
                {tr(
                  "Quỹ chưa đủ đầu tiên trong thứ tự này sẽ là bước tiếp theo của bạn. Bạn có thể đổi thứ tự sau.",
                )}
              </p>
              <ol className="fund-priorities">
                {priority.map((k, i) => (
                  <li key={k}>
                    <span>{fundNames[k]}</span>
                    <button
                      className="expense-icon-button"
                      aria-label={tr("Ưu tiên {0} lên", { 0: fundNames[k] })}
                      disabled={i === 0}
                      onClick={() => {
                        setPriority((s) => {
                          const n = [...s];
                          [n[i - 1], n[i]] = [n[i], n[i - 1]];
                          return n;
                        });
                        invalidate();
                      }}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      className="expense-icon-button"
                      aria-label={tr("Ưu tiên {0} xuống", {
                        0: fundNames[k],
                      })}
                      disabled={i === 2}
                      onClick={() => {
                        setPriority((s) => {
                          const n = [...s];
                          [n[i + 1], n[i]] = [n[i], n[i + 1]];
                          return n;
                        });
                        invalidate();
                      }}
                    >
                      <ArrowDown size={18} />
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : mode.type === "location" ? (
        <>
          {input("name", tr("Tên nơi giữ tiền"))}
          {location && (
            <label className="fund-check">
              <input
                type="checkbox"
                checked={f.active}
                onChange={(e) => set("active", e.target.checked)}
              />
              {tr("Đang sử dụng")}
            </label>
          )}
          <p className="fund-note">
            {tr(
              "Nơi giữ là nhãn ghi sổ trong Fund. Số dư được tách cho từng quỹ.",
            )}
          </p>
        </>
      ) : (
        <>
          {mode.type !== "cancel" && (
            <>
              {field(
                "kind",
                tr("Loại giao dịch"),
                <select
                  id={fieldId("kind")}
                  value={f.kind}
                  onChange={(e) =>
                    set("kind", e.target.value as FundTransaction["kind"])
                  }
                >
                  {Object.entries(localize(transactionNamesSource)).map(
                    ([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ),
                  )}
                </select>,
              )}
              <div className="fund-form-grid">
                {fundSelect(
                  "fundId",
                  f.kind === "transfer" ? tr("Quỹ nguồn") : tr("Quỹ"),
                )}
                {locationSelect(
                  "locationId",
                  f.kind === "transfer" ? tr("Nơi nguồn") : tr("Nơi giữ tiền"),
                )}
              </div>
              {f.kind === "transfer" && (
                <div className="fund-form-grid">
                  {fundSelect("toFundId", tr("Quỹ nhận"))}
                  {locationSelect("toLocationId", tr("Nơi nhận"))}
                </div>
              )}
              {input("amount", tr("Số tiền (VND)"))}
              {input("occurredAt", tr("Thời điểm giao dịch (giờ Việt Nam)"))}
              {input(
                "note",
                f.kind === "withdraw" || f.kind === "transfer"
                  ? tr("Lý do giao dịch")
                  : tr("Ghi chú"),
              )}
              {!view.book?.locations.some((l) => l.active) && (
                <p>{tr("Thêm nơi giữ tiền trước khi ghi giao dịch.")}</p>
              )}
            </>
          )}
          {mode.type === "cancel" && old && (
            <p>
              {tr("Hủy giao dịch")}{" "}
              {localize(transactionNamesSource)[old.kind].toLowerCase()}{" "}
              {money(old.amount)} · {displayTime(old.occurredAt, locale)}
              {tr(". Bản gốc vẫn được giữ trong lịch sử.")}
            </p>
          )}
          {(mode.type === "revise" || mode.type === "cancel") &&
            input("reason", tr("Lý do sửa hoặc hủy"))}
        </>
      )}
    </fieldset>
  );
}
