"use client";
import { useI18n } from "@/i18n/provider";

import { vietnamClock } from "@/domain/expenses/engine";
import { useEffect, useState } from "react";
import { ThemeIcon } from "./theme-decoration";
import {
  visualThemeKeys,
  visualThemes as visualThemesSource,
} from "./visual-theme";
export function DailyNote() {
  const { t: tr, config: localize } = useI18n();

  const [index, setIndex] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const day = vietnamClock().today;
      setIndex(
        Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) %
          localize(visualThemesSource).forest.notes.length,
      );
      clearTimeout(timer);
      const midnight = Date.parse(`${day}T00:00:00+07:00`) + 86400000;
      timer = setTimeout(update, Math.max(1000, midnight - Date.now() + 100));
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <aside className="daily-note">
      <ThemeIcon size={21} kind="sprout" />
      <p>
        <span>{tr("MỘT CHÚT BÌNH YÊN")}</span>
        {visualThemeKeys.map((theme) => (
          <span
            key={theme}
            className="daily-note-message"
            data-visual-only={theme}
          >
            {localize(visualThemesSource)[theme].notes[index]}
          </span>
        ))}
      </p>
    </aside>
  );
}
