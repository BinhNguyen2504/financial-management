"use client";

import { useId, type ReactNode } from "react";
import { useI18n } from "@/i18n/provider";
import { monthInYear } from "@/lib/month-period";
import "./month-year-select.css";

export function MonthYearSelect({
  value,
  onChange,
  min = "2000-01",
  max = "2099-12",
  label,
  labelAccessory,
  id,
  name,
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  yearLabel,
  children,
  monthDisabled,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  labelAccessory?: ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  yearLabel?: (year: number) => string;
  children?: ReactNode;
  monthDisabled?: (period: string) => boolean;
}) {
  const { t: tr, locale } = useI18n();
  const generated = useId();
  const controlId = id ?? generated;
  const year = value.slice(0, 4);
  const month = value.slice(5, 7);
  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));
  const years = Array.from(
    { length: Math.max(0, lastYear - firstYear + 1) },
    (_, i) => firstYear + i,
  );
  const accessible = (part: string) => (label ? `${label} · ${part}` : part);
  return (
    <div
      className="month-year-field"
      role="group"
      aria-label={label ?? tr("Chọn tháng và năm")}
    >
      {label && (
        <div
          className={`month-year-legend${labelAccessory ? " has-accessory" : ""}`}
        >
          <span>
            {label}
            {required && (
              <span className="required-mark" aria-hidden="true">
                *
              </span>
            )}
          </span>
          {labelAccessory}
        </div>
      )}
      <div className="month-year-controls">
        <label htmlFor={controlId}>
          {tr("Năm")}
          <select
            id={controlId}
            value={year}
            required={required}
            disabled={disabled}
            aria-label={accessible(tr("Năm"))}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(monthInYear(value, Number(event.target.value), min, max))
            }
          >
            {!year && (
              <option value="" disabled>
                {tr("Năm")}
              </option>
            )}
            {years.map((item) => (
              <option key={item} value={item}>
                {yearLabel?.(item) ?? item}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${controlId}-month`}>
          {tr("Tháng")}
          <select
            id={`${controlId}-month`}
            value={month ? Number(month) : ""}
            required={required}
            disabled={disabled}
            aria-label={accessible(tr("Tháng"))}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(
                `${year || firstYear}-${event.target.value.padStart(2, "0")}`,
              )
            }
          >
            {!month && (
              <option value="" disabled>
                {tr("Tháng")}
              </option>
            )}
            {Array.from({ length: 12 }, (_, i) =>
              String(i + 1).padStart(2, "0"),
            ).map((item) => {
              const period = `${year || firstYear}-${item}`;
              return (
                <option
                  key={item}
                  value={Number(item)}
                  disabled={
                    period < min || period > max || monthDisabled?.(period)
                  }
                >
                  {locale === "vi"
                    ? `${tr("Tháng")} ${Number(item)}`
                    : new Intl.DateTimeFormat("en-GB", {
                        month: "long",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2020, Number(item) - 1, 1)))}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      {children}
    </div>
  );
}
