import { parseInteger } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
// Keep form comparison and monetary normalization independent of floating point.
export function normalizeInteger(value: string) {
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, "") : value;
}
export function integerInput(
  value: string,
  locale: Locale = "vi",
): string | null {
  return parseInteger(value, locale);
}
export function comparable(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value.trim());
  if (Array.isArray(value)) return `[${value.map(comparable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${comparable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

const monetaryFields = new Set([
  "amount",
  "fee",
  "tax",
  "interest",
  "reinvestInterest",
  "unitPrice",
  "cost",
  "value",
  "opening",
  "target",
  "funding",
  "extra",
  "closing",
]);
export function normalizedMoneyFields(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      monetaryFields.has(key) ? normalizeInteger(value) : value,
    ]),
  );
}
