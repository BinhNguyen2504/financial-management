"use client";

import { modules } from "@/features/catalog";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { intlLocale, LOCALE_KEY, localeOf, type Locale } from "./locale";
import type { Namespace } from "./messages";
import { translateConfig, translator } from "./translate";

const Context = createContext({
  locale: "vi" as Locale,
  setLocale: (_locale: Locale) => {},
});
let sessionLocale: Locale | undefined;
const CHANGE = "fm-locale-change";

function persist(locale: Locale) {
  sessionLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
    sessionLocale = undefined;
  } catch {
    /* Session remains usable. */
  }
  try {
    document.cookie = `${LOCALE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* In-memory choice still works when all persistence is blocked. */
  }
}

export function LocaleProvider({
  initialLocale,
  hasLocaleCookie = false,
  children,
}: {
  initialLocale: Locale;
  hasLocaleCookie?: boolean;
  children: ReactNode;
}) {
  const [locale, update] = useState(initialLocale);
  const pathname = usePathname();
  const setLocale = useCallback((next: Locale) => {
    persist(next);
    update(next);
    window.dispatchEvent(new CustomEvent(CHANGE, { detail: next }));
  }, []);
  useEffect(() => {
    function read() {
      let next = sessionLocale ?? initialLocale;
      try {
        next =
          sessionLocale ??
          (hasLocaleCookie
            ? initialLocale
            : localeOf(localStorage.getItem(LOCALE_KEY)));
      } catch {
        /* Use SSR or session choice. */
      }
      persist(next);
      update(next);
    }
    function storage(event: StorageEvent) {
      if (event.key === LOCALE_KEY || event.key === null) {
        sessionLocale = undefined;
        let next = localeOf(event.newValue);
        if (event.key === null) {
          try {
            next = localeOf(localStorage.getItem(LOCALE_KEY));
          } catch {
            /* Default after clearing storage. */
          }
        }
        persist(next);
        update(next);
      }
    }
    function changed(event: Event) {
      update(localeOf((event as CustomEvent).detail));
    }
    read();
    window.addEventListener("storage", storage);
    window.addEventListener(CHANGE, changed);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(CHANGE, changed);
    };
  }, [initialLocale, hasLocaleCookie]);
  useEffect(() => {
    const source =
      pathname === "/profile"
        ? "Thông tin cá nhân"
        : modules.find((item) => `/${item.slug}` === pathname)?.title;
    if (source)
      document.title = `${translator(locale)(source)} · Financial Manager`;
  }, [locale, pathname]);
  return (
    <Context.Provider value={{ locale, setLocale }}>
      <div className="locale-scope" lang={locale}>
        {children}
      </div>
    </Context.Provider>
  );
}

export function useI18n(namespace: Namespace = "common") {
  const context = useContext(Context);
  const t = useMemo(
    () => translator(context.locale, namespace),
    [context.locale, namespace],
  );
  const config = useMemo(() => {
    const cache = new WeakMap<object, unknown>();
    return <T,>(value: T): T => {
      if (value && typeof value === "object") {
        if (cache.has(value)) return cache.get(value) as T;
        const translated = translateConfig(value, t);
        cache.set(value, translated);
        return translated;
      }
      return translateConfig(value, t);
    };
  }, [t]);
  return { ...context, t, numberLocale: intlLocale(context.locale), config };
}

export function LocalizedText({ message }: { message: string }) {
  const { t } = useI18n();
  return t(message);
}
