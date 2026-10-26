"use client";
import { useI18n } from "@/i18n/provider";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Garden } from "./garden";
import {
  displayMode,
  VISUAL_THEME_KEY,
  visualTheme,
  visualThemeKeys,
  visualThemes as visualThemesSource,
} from "./visual-theme";

const CHANGE = "fm-preference-change";
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    // A newer persisted choice wins over a temporary fallback after storage recovers.
    if (event.key) session.delete(event.key);
    else session.clear();
    callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE, callback);
  };
}
const session = new Map<string, string>();
function readPreference(key: string, fallback: string) {
  if (session.has(key)) return session.get(key)!;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readPreference(key, fallback),
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

export function useVisualTheme() {
  const [value] = usePreference(VISUAL_THEME_KEY, "forest");
  return visualTheme(value);
}

// Runs while HTML is parsed, before the first paint. Only UI preferences are read.
export const preferenceScript = `(function(){try{var v=localStorage.getItem('fm-visual-theme');document.documentElement.dataset.visualTheme=${JSON.stringify(visualThemeKeys)}.includes(v)?v:'forest';var t=localStorage.getItem('fm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.sidebar=localStorage.getItem('fm-sidebar')==='collapsed'?'collapsed':'expanded'}catch(e){}})()`;

export function PreferenceSync() {
  const [storedMode] = usePreference("fm-theme", "system");
  const [storedVisual] = usePreference(VISUAL_THEME_KEY, "forest");
  const theme = displayMode(storedMode);
  const visual = visualTheme(storedVisual);
  const colors = visualThemesSource[visual].browserColors;
  const [sidebar] = usePreference("fm-sidebar", "expanded");
  useEffect(() => {
    // Read the live snapshot on hydration: the server fallback must not undo
    // the preferences already applied by the parser script before first paint.
    const mode = displayMode(readPreference("fm-theme", "system"));
    const selected = visualTheme(readPreference(VISUAL_THEME_KEY, "forest"));
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.visualTheme = selected;
  }, [theme, visual]);
  useEffect(() => {
    document.documentElement.dataset.sidebar =
      readPreference("fm-sidebar", "expanded") === "collapsed"
        ? "collapsed"
        : "expanded";
  }, [sidebar]);
  // React owns these hoisted metadata nodes. Changing a framework-owned meta
  // imperatively before its hydration can cause a recoverable HTML mismatch.
  return (
    <>
      <meta
        name="theme-color"
        content={colors.light}
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
        content={colors.dark}
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
  const { t: tr } = useI18n();

  const [value, set] = usePreference("fm-sidebar", "expanded");
  const collapsed = value === "collapsed";
  const Icon = collapsed ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      className="sidebar-toggle icon-action"
      tabIndex={0}
      aria-label={collapsed ? tr("Mở rộng menu") : tr("Thu gọn menu")}
      title={collapsed ? tr("Mở rộng menu") : tr("Thu gọn menu")}
      aria-expanded={!collapsed}
      aria-controls="app-sidebar"
      onClick={() => set(collapsed ? "expanded" : "collapsed")}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

export function ThemePicker() {
  const { t: tr, config: localize } = useI18n();

  const [storedMode, setMode] = usePreference("fm-theme", "system");
  const [storedVisual, setVisual] = usePreference(VISUAL_THEME_KEY, "forest");
  const value = displayMode(storedMode);
  const selected = visualTheme(storedVisual);
  function changePreference(set: (next: string) => void, next: string) {
    document.documentElement.dataset.themeTransition = "true";
    set(next);
  }
  return (
    <div className="appearance-picker">
      <h2>{tr("Giao diện")}</h2>
      <p>
        {tr(
          "Chọn màu phù hợp với bạn. Tùy chọn được ghi nhớ trên trình duyệt này.",
        )}
      </p>
      <fieldset className="theme-picker visual-theme-picker">
        <legend>{tr("Chủ đề")}</legend>
        <div className="visual-theme-options">
          {visualThemeKeys.map((key) => {
            const option = localize(visualThemesSource)[key];
            return (
              <label className="visual-theme-card" key={key}>
                <input
                  type="radio"
                  name="visual-theme"
                  value={key}
                  aria-label={`${option.name} — ${option.colorName}`}
                  checked={selected === key}
                  tabIndex={selected === key ? 0 : -1}
                  onChange={() => changePreference(setVisual, key)}
                />
                <div className="theme-card-art">
                  <Garden theme={key} />
                </div>
                <span className="theme-card-title">
                  {option.name}
                  <Check size={20} aria-hidden="true" />
                </span>
                <span className="theme-card-color">{option.colorName}</span>
                <span className="theme-card-description">
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="theme-picker mode-picker">
        <legend>{tr("Chế độ hiển thị")}</legend>
        <div className="theme-options">
          {[
            { value: "light", title: tr("Sáng"), Icon: Sun },
            { value: "dark", title: tr("Tối"), Icon: Moon },
            { value: "system", title: tr("Theo hệ thống"), Icon: Monitor },
          ].map(({ value: option, title, Icon }) => (
            <label key={option}>
              <input
                type="radio"
                name="theme"
                value={option}
                tabIndex={value === option ? 0 : -1}
                checked={
                  (value === "light" || value === "dark" ? value : "system") ===
                  option
                }
                onChange={() => changePreference(setMode, option)}
              />
              <Icon size={22} aria-hidden="true" />
              <span>{title}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
