import type { Locale } from "./locale";
import {
  english,
  namespaces,
  type MessageKey,
  type Namespace,
} from "./messages";

export type Parameters = Record<string, string | number | undefined>;
export type Translator = (message: string, values?: Parameters) => string;
export type MessageDescriptor = { key: MessageKey; params: Parameters };
export { type MessageKey };

function interpolate(template: string, values: Parameters) {
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name] ?? "")
      : token,
  );
}

function matcher(template: string) {
  const names: string[] = [];
  const pattern = template
    .split(/(\{\w+\})/g)
    .map((part) => {
      if (/^\{\w+\}$/.test(part)) {
        names.push(part.slice(1, -1));
        return "([\\s\\S]*?)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return { names, pattern: new RegExp(`^${pattern}$`) };
}
const templates = Object.entries(english)
  .filter(([key]) => /\{\w+\}/.test(key))
  .sort(
    ([a], [b]) =>
      b.replace(/\{\w+\}/g, "").length - a.replace(/\{\w+\}/g, "").length,
  )
  .map(([key, value]) => ({
    key: key as MessageKey,
    vi: matcher(key),
    en: matcher(value),
  }));

/** Stable source keys and captured parameters are additive metadata for existing API errors. */
export function describeMessage(
  message: string,
): MessageDescriptor | undefined {
  if (Object.prototype.hasOwnProperty.call(english, message))
    return { key: message as MessageKey, params: {} };
  for (const entry of templates) {
    const match = entry.vi.pattern.exec(message);
    if (match)
      return {
        key: entry.key,
        params: Object.fromEntries(
          entry.vi.names.map((name, i) => [name, match[i + 1]]),
        ),
      };
  }
}

/** Translate only explicit product messages. Captured names/notes remain verbatim. */
export function translate(
  locale: Locale,
  message: string | null | undefined,
  values: Parameters = {},
  namespace: Namespace = "common",
): string {
  if (message == null) return "";
  const overrides = namespaces[namespace] as Record<string, string>;
  const all = english as Record<string, string>;
  let key = message,
    params = values;
  if (!Object.prototype.hasOwnProperty.call(all, key)) {
    // Stored notices can outlive a language change. Resolve them back to their message key.
    const reverse =
      Object.entries(overrides).find(([, value]) => value === message) ??
      Object.entries(all).find(([, value]) => value === message);
    if (reverse) key = reverse[0];
    else {
      const source = describeMessage(message);
      if (source) {
        key = source.key;
        params = { ...source.params, ...values };
      } else
        for (const entry of templates) {
          const template = overrides[entry.key] ?? all[entry.key];
          const m = template === all[entry.key] ? entry.en : matcher(template);
          const match = m.pattern.exec(message);
          if (match) {
            key = entry.key;
            params = {
              ...Object.fromEntries(
                m.names.map((name, i) => [name, match[i + 1]]),
              ),
              ...values,
            };
            break;
          }
        }
    }
  }
  if (key === message && !Object.prototype.hasOwnProperty.call(all, key)) {
    const separator = message.indexOf(": ");
    if (separator > 0) {
      const suffix = message.slice(separator + 2);
      const translated = translate(locale, suffix, values, namespace);
      if (translated !== suffix)
        return `${translate(locale, message.slice(0, separator), undefined, namespace)}: ${translated}`;
    }
  }
  // This parameter is a product validation diagnostic, unlike captured account names.
  if (key === "Bản sao lưu không hợp lệ: {0}" && typeof params[0] === "string")
    params = {
      ...params,
      0: translate(locale, params[0], undefined, "errors"),
    };
  return interpolate(
    locale === "en" ? (overrides[key] ?? all[key] ?? message) : key,
    params,
  );
}

export function translator(
  locale: Locale,
  namespace: Namespace = "common",
): Translator {
  const cache = new Map<string, string>();
  return (message, values) => {
    if (message == null) return "";
    if (values) return translate(locale, message, values, namespace);
    const saved = cache.get(message);
    if (saved !== undefined) return saved;
    const next = translate(locale, message, undefined, namespace);
    cache.set(message, next);
    return next;
  };
}

/** Localize product-owned configuration. Never use this on account data. */
export function translateConfig<T>(value: T, t: Translator): T {
  if (typeof value === "string") return t(value) as T;
  if (Array.isArray(value))
    return value.map((item) => translateConfig(item, t)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        translateConfig(item, t),
      ]),
    ) as T;
  return value;
}
