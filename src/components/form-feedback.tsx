"use client";
import { AlertCircle } from "lucide-react";

export type FieldErrors = Record<string, string>;
export function nativeErrors(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  for (const input of Array.from(form.elements)) {
    if (
      !(
        input instanceof HTMLInputElement ||
        input instanceof HTMLSelectElement ||
        input instanceof HTMLTextAreaElement
      ) ||
      input.disabled ||
      !input.willValidate
    )
      continue;
    if (!input.validity.valid) {
      const label =
        input.getAttribute("aria-label") ||
        input.labels?.[0]?.textContent?.trim() ||
        "Thông tin";
      const message = input.validity.valueMissing
        ? "Vui lòng nhập hoặc chọn thông tin bắt buộc."
        : input.validity.typeMismatch
          ? "Nhập đúng định dạng, ví dụ binh@example.com cho email."
          : input.validity.rangeUnderflow && input instanceof HTMLInputElement
            ? `Giá trị phải từ ${input.min} trở lên.`
            : input.validity.rangeOverflow && input instanceof HTMLInputElement
              ? `Giá trị không được vượt ${input.max}.`
              : "Giá trị chưa đúng định dạng. Kiểm tra hướng dẫn bên dưới.";
      errors[input.name || input.id] = `${label}: ${message}`;
    }
  }
  return errors;
}
export function FormErrorSummary({
  errors,
  prefix,
}: {
  errors: FieldErrors;
  prefix: string;
}) {
  const entries = Object.entries(errors).filter(([, message]) => !!message);
  if (!entries.length) return null;
  return (
    <div className="form-error-summary" role="alert" tabIndex={-1}>
      <strong>
        <AlertCircle size={18} aria-hidden="true" />
        Kiểm tra thông tin được đánh dấu
      </strong>
      <ul>
        {entries.map(([key, message]) => (
          <li key={key}>
            <a
              href={`#${prefix}${key}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(`${prefix}${key}`)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
