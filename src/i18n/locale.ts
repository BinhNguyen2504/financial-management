export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_KEY = "fm-locale";
export function localeOf(value: unknown): Locale {
  return value === "en" ? "en" : "vi";
}
export function intlLocale(locale: Locale) {
  return locale === "en" ? "en-GB" : "vi-VN";
}
