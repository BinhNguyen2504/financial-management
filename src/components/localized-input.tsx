"use client";

import {
  formatDate,
  formatMoney,
  parseDecimal,
  parseInteger,
} from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import { useI18n } from "@/i18n/provider";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string;
  onValueChange(value: string): void;
  numberKind?: "integer" | "decimal";
  precision?: number;
};

function display(value: string, kind: Props["numberKind"], locale: Locale) {
  return kind === "decimal" && locale === "vi"
    ? value.replace(".", ",")
    : value;
}

/** Only canonical valid values leave this field. Invalid drafts retain their input locale. */
export function LocalizedInput({
  value,
  onValueChange,
  numberKind,
  precision = 6,
  ...props
}: Props) {
  const { locale, t } = useI18n();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({
    raw: display(value, numberKind, locale),
    value,
    locale,
    invalid: false,
  });
  const stale =
    !draft.invalid && (draft.value !== value || draft.locale !== locale);
  const raw = stale ? display(value, numberKind, locale) : draft.raw;
  const inputLocale = draft.invalid ? draft.locale : locale;
  const invalid = Boolean(
    numberKind && draft.invalid && !props.disabled && !props.readOnly,
  );
  const error = t(
    numberKind === "integer"
      ? "Nhập số nguyên VND, ví dụ {0}."
      : "Nhập số thập phân, ví dụ {0}.",
    {
      0:
        numberKind === "integer"
          ? formatMoney("1000000", inputLocale)
          : inputLocale === "vi"
            ? "1,25"
            : "1.25",
    },
  );
  useEffect(() => {
    input.current?.setCustomValidity(invalid ? error : "");
  }, [invalid, error]);
  return (
    <>
      <input
        {...props}
        ref={input}
        value={numberKind ? raw : value}
        data-number-invalid={invalid ? "true" : undefined}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        aria-describedby={
          [
            props["aria-describedby"],
            invalid ? errorId : "",
            props.type === "date" ? `${errorId}-date` : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => {
          const entered = event.target.value;
          if (!numberKind) {
            onValueChange(entered);
            return;
          }
          const parsed =
            numberKind === "integer"
              ? parseInteger(entered, inputLocale)
              : parseDecimal(entered, inputLocale, precision);
          const bad =
            parsed === null ||
            (numberKind === "decimal" && parsed.endsWith("."));
          setDraft({
            raw: entered,
            value: bad ? value : parsed!,
            locale: inputLocale,
            invalid: bad,
          });
          // Keep DOM validity in sync before another control can submit in the same event turn.
          event.currentTarget.setCustomValidity(bad ? error : "");
          if (!bad) onValueChange(parsed!);
        }}
        onBlur={(event) => {
          props.onBlur?.(event);
          // The parent may already hold the canonical value, so its blur
          // normalization cannot trigger a new render to clear leading zeros.
          // Keep invalid drafts verbatim, including their original locale.
          if (numberKind && !draft.invalid) {
            setDraft({
              raw: display(value, numberKind, locale),
              value,
              locale,
              invalid: false,
            });
          }
        }}
      />
      {props.type === "date" && (
        <small id={`${errorId}-date`} className="expense-muted">
          {t("Ngày nhập theo định dạng ngày/tháng/năm; giờ Việt Nam.")}
          {value ? ` ${formatDate(value, locale)}` : ""}
        </small>
      )}
      {invalid && (
        <small id={errorId} className="field-error" role="alert">
          {error}
          {inputLocale !== locale
            ? ` ${t("Bản nháp này dùng định dạng {0}.", { 0: inputLocale === "en" ? "English" : "Tiếng Việt" })}`
            : ""}
        </small>
      )}
    </>
  );
}

export function focusInvalidNumber(scope: ParentNode | null) {
  const invalid = scope?.querySelector<HTMLInputElement>(
    'input[data-number-invalid="true"]:not(:disabled):not([readonly])',
  );
  if (!invalid) return false;
  invalid.focus({ preventScroll: true });
  invalid.scrollIntoView({ block: "center" });
  return true;
}
