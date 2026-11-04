/** Session-only display preferences. Never put form drafts, amounts or API responses here. */
export class SessionViewStore {
  private volatile = new Map<string, string>();
  private cache = new Map<string, { raw: string; value: unknown }>();

  constructor(private storage: () => Pick<Storage, "getItem" | "setItem">) {}

  read<T>(key: string, initial: T, valid: (value: unknown) => boolean): T {
    let raw = this.volatile.get(key);
    if (raw === undefined) {
      try {
        raw = this.storage().getItem(key) ?? undefined;
      } catch {
        /* The in-memory session still works when browser storage is blocked. */
      }
    }
    if (!raw || raw.length > 4096) return initial;
    const cached = this.cache.get(key);
    if (cached?.raw === raw)
      return valid(cached.value) ? (cached.value as T) : initial;
    try {
      const value: unknown = JSON.parse(raw);
      if (!valid(value)) return initial;
      this.cache.set(key, { raw, value });
      return value as T;
    } catch {
      return initial;
    }
  }

  write(key: string, value: unknown) {
    const raw = JSON.stringify(value);
    this.volatile.set(key, raw);
    try {
      this.storage().setItem(key, raw);
      this.volatile.delete(key);
    } catch {
      /* Keep only this tab's display preference in memory. */
    }
  }
}

export function validViewValue(value: unknown, initial: unknown): boolean {
  if (initial === null)
    return (
      value === null ||
      (typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 2099)
    );
  if (typeof initial === "number")
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= (initial > 31 ? 2099 : 31)
    );
  if (typeof initial === "boolean") return typeof value === "boolean";
  if (typeof initial === "string") {
    if (typeof value !== "string" || value.length > 200) return false;
    if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(initial)) {
      if (
        !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value) ||
        value.length !== initial.length
      )
        return false;
      const date = value.length === 7 ? value + "-01" : value;
      return (
        date >= "2000-01-01" &&
        date <= "2099-12-31" &&
        !Number.isNaN(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date
      );
    }
    return true;
  }
  if (initial && typeof initial === "object" && !Array.isArray(initial)) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    return Object.entries(initial).every(([key, expected]) =>
      validViewValue((value as Record<string, unknown>)[key], expected),
    );
  }
  return false;
}
