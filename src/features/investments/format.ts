import { formatDecimal } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
/** Percentage stored as hundredths of a percent; retain integer precision for large values. */
export function formatROI(value: string | null, locale: Locale = "vi") {
  if (value === null) return "—";
  const n = BigInt(value),
    sign = n < 0n ? "−" : "",
    abs = n < 0n ? -n : n;
  return `${sign}${formatDecimal(`${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`, locale, 2)}%`;
}
