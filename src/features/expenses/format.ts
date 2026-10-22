import { formatMoney, formatMonth } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
export function money(value: string, locale: Locale = "vi"): string {
  return formatMoney(value, locale);
}
export function monthName(value: string, locale: Locale = "vi"): string {
  return formatMonth(value, locale);
}
export function sum(values: string[]): string {
  return values.reduce((n, v) => n + BigInt(v), 0n).toString();
}
export function ratio(value: string, maximum: string): number {
  return BigInt(maximum) === 0n
    ? 0
    : Number((BigInt(value) * 10000n) / BigInt(maximum)) / 100;
}
