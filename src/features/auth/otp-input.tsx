"use client";

import { useI18n } from "@/i18n/provider";
import { useRef, type RefObject } from "react";

export const OTP_LENGTH = 8;
export const emptyOtp = () => Array<string>(OTP_LENGTH).fill("");

/** Keep slots separate so deleting a middle digit never shifts the other digits. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  firstInputRef,
  disabled,
  invalid,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete: (token: string) => void;
  firstInputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  invalid: boolean;
}) {
  const { t } = useI18n("auth");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  function focus(index: number) {
    const input = inputs.current[index];
    input?.focus();
    input?.select();
  }
  function update(index: number, raw: string, pasted = false) {
    if (disabled) return;
    const digits = raw.replace(/[\s-]/g, "");
    if (digits && !/^[0-9]+$/.test(digits)) return;
    // Full-code paste/autofill replaces the code from any selected slot.
    if (digits.length > OTP_LENGTH) return;
    const start = digits.length === OTP_LENGTH ? 0 : index;
    const next = [...value];
    if (!digits) next[index] = "";
    else for (let offset = 0; offset < digits.length && start + offset < OTP_LENGTH; offset++) {
      next[start + offset] = digits[offset];
    }
    onChange(next);
    if (digits) focus(Math.min(start + digits.length, OTP_LENGTH - 1));
    if (next.every((digit) => /^[0-9]$/.test(digit)) &&
      (pasted || digits.length === OTP_LENGTH || index === OTP_LENGTH - 1)) {
      onComplete(next.join(""));
    }
  }
  return (
    <div
      className="otp-inputs"
      role="group"
      aria-labelledby="login-token-label"
      aria-describedby={`login-token-hint${invalid ? " login-error-token" : ""}`}
    >
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
            if (index === 0) firstInputRef.current = element;
          }}
          id={index === 0 ? "login-field-token" : `login-token-${index + 1}`}
          aria-label={index === 0 ? t("Mã xác nhận") : t("Chữ số {position} của mã xác nhận", { position: index + 1 })}
          aria-invalid={invalid}
          aria-describedby={`login-token-hint${invalid ? " login-error-token" : ""}`}
          className="otp-digit"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // Allow the browser to deliver a complete autofilled code in one event;
          // the controlled value still displays exactly one digit per slot.
          maxLength={OTP_LENGTH}
          value={digit}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => update(index, event.currentTarget.value)}
          onPaste={(event) => {
            event.preventDefault();
            update(index, event.clipboardData.getData("text"), true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const target = !value[index] && index > 0 ? index - 1 : index;
              const next = [...value];
              next[target] = "";
              onChange(next);
              focus(target);
            } else if (event.key === "Delete") {
              event.preventDefault();
              const next = [...value];
              next[index] = "";
              onChange(next);
            } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              focus(event.key === "Home" ? 0 : event.key === "End" ? OTP_LENGTH - 1
                : Math.max(0, Math.min(OTP_LENGTH - 1, index + (event.key === "ArrowLeft" ? -1 : 1))));
            }
          }}
        />
      ))}
    </div>
  );
}
