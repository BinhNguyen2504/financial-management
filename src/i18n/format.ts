import { intlLocale, type Locale } from "./locale";

export function formatMoney(value: string, locale: Locale = "vi") {
  return `${BigInt(value).toLocaleString(intlLocale(locale))} ₫`;
}

/** Format exact decimal strings without passing their significant digits through Number. */
export function formatDecimal(
  value: string,
  locale: Locale = "vi",
  minimumFractionDigits = 0,
) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const [, sign, whole, raw = ""] = match;
  const fraction = raw.replace(/0+$/, "").padEnd(minimumFractionDigits, "0");
  return `${sign}${BigInt(whole).toLocaleString(intlLocale(locale))}${fraction ? `${locale === "vi" ? "," : "."}${fraction}` : ""}`;
}

export function formatDate(value: string, locale: Locale = "vi") {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!day) return `${month}/${year}`;
  // Both selected locales use day/month/year. Never parse a date-only value as local time.
  return `${day}/${month}/${year}`;
}

export function formatMonth(value: string, locale: Locale = "vi") {
  const year = value.slice(0, 4),
    month = Number(value.slice(5, 7));
  return locale === "vi"
    ? `Tháng ${month}/${year}`
    : new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(Number(year), month - 1, 1)));
}

export function formatTime(value: string, locale: Locale = "vi") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/** Locale separators must form complete groups. A fractional VND amount is never rounded. */
export function parseInteger(
  value: string,
  locale: Locale = "vi",
): string | null {
  const input = value.trim().replace(/\s*₫$/, "").trim();
  if (/^\d*$/.test(input)) return input.replace(/^0+(?=\d)/, "");
  const grouped =
    locale === "vi" ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
  return grouped.test(input)
    ? input.replace(/[.,]/g, "").replace(/^0+(?=\d)/, "")
    : null;
}

export function parseDecimal(
  value: string,
  locale: Locale = "vi",
  precision = 6,
): string | null {
  const input = value.trim();
  if (!input) return "";
  const decimal = locale === "vi" ? "," : ".";
  const parts = input.split(decimal);
  if (parts.length > 2) return null;
  const whole = parseInteger(parts[0], locale);
  if (whole === null || !whole) return null;
  if (parts.length === 1) return whole;
  if (!new RegExp(`^\\d{0,${precision}}$`).test(parts[1])) return null;
  return `${whole}.${parts[1]}`;
}
