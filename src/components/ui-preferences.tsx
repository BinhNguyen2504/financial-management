"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";

const CHANGE = "fm-preference-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE, callback);
  };
}
const session = new Map<string, string>();
export function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      if (session.has(key)) return session.get(key)!;
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return session.get(key) ?? fallback;
      }
    },
    () => fallback,
  );
  function set(next: string) {
    try {
      localStorage.setItem(key, next);
      session.delete(key);
    } catch {
      session.set(key, next);
    }
    window.dispatchEvent(new Event(CHANGE));
  }
  return [value, set] as const;
}

// Runs while HTML is parsed, before the first paint. Only UI preferences are read.
export const preferenceScript = `(function(){try{var t=localStorage.getItem('fm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.sidebar=localStorage.getItem('fm-sidebar')==='collapsed'?'collapsed':'expanded'}catch(e){}})()`;

export function PreferenceSync() {
  const [theme] = usePreference("fm-theme", "system");
  const [sidebar] = usePreference("fm-sidebar", "expanded");
  useEffect(() => {
    if (theme === "light" || theme === "dark")
      document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.sidebar =
      sidebar === "collapsed" ? "collapsed" : "expanded";
  }, [sidebar]);
  // React owns these hoisted metadata nodes. Changing a framework-owned meta
  // imperatively before its hydration can cause a recoverable HTML mismatch.
  return (
    <>
      <meta
        name="theme-color"
        content="#F7F3EB"
        media={
          theme === "dark"
            ? "not all"
            : theme === "light"
              ? undefined
              : "(prefers-color-scheme: light)"
        }
      />
      <meta
        name="theme-color"
        content="#1F2520"
        media={
          theme === "light"
            ? "not all"
            : theme === "dark"
              ? undefined
              : "(prefers-color-scheme: dark)"
        }
      />
    </>
  );
}

export function SidebarToggle() {
  const [value, set] = usePreference("fm-sidebar", "expanded");
  const collapsed = value === "collapsed";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      className="sidebar-toggle icon-action"
      aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
      title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
      aria-expanded={!collapsed}
      aria-controls="app-sidebar"
      onClick={() => set(collapsed ? "expanded" : "collapsed")}
    >
      <Icon size={21} aria-hidden="true" />
    </button>
  );
}

export function ThemePicker() {
  const [value, set] = usePreference("fm-theme", "system");
  return (
    <fieldset className="theme-picker">
      <legend>Giao diện</legend>
      <p>
        Chọn màu phù hợp với bạn. Tùy chọn được ghi nhớ trên trình duyệt này.
      </p>
      <div className="theme-options">
        {[
          { value: "light", title: "Sáng", Icon: Sun },
          { value: "dark", title: "Tối", Icon: Moon },
          { value: "system", title: "Theo hệ thống", Icon: Monitor },
        ].map(({ value: option, title, Icon }) => (
          <label key={option}>
            <input
              type="radio"
              name="theme"
              value={option}
              checked={
                (value === "light" || value === "dark" ? value : "system") ===
                option
              }
              onChange={() => set(option)}
            />
            <Icon size={22} aria-hidden="true" />
            <span>{title}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
