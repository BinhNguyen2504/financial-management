"use client";

import { useToast } from "@/components/toast";
import { Languages } from "lucide-react";
import { type Locale } from "./locale";
import { useI18n } from "./provider";
import { translate } from "./translate";

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const toast = useToast();
  const change = (value: Locale) => {
    if (value === locale) return;
    setLocale(value);
    toast("success", translate(value, "Đã đổi ngôn ngữ."));
  };
  if (compact)
    return (
      <label className="public-language">
        <Languages size={17} aria-hidden="true" />
        <select
          aria-label={`${t("Ngôn ngữ")} / Language`}
          value={locale}
          onChange={(event) => change(event.target.value as Locale)}
        >
          <option value="vi" lang="vi">
            Tiếng Việt
          </option>
          <option value="en" lang="en">
            English
          </option>
        </select>
      </label>
    );
  return (
    <section className="language-picker">
      <h2>
        {t("Ngôn ngữ")}
        {locale === "vi" ? " / Language" : ""}
      </h2>
      <p>
        {t(
          "Ngôn ngữ và định dạng số được ghi nhớ trên trình duyệt này. Tiền tệ VND và giờ Việt Nam.",
        )}
      </p>
      <fieldset className="theme-picker">
        <legend>{t("Ngôn ngữ hiển thị")}</legend>
        <div className="theme-options">
          {(
            [
              ["vi", "Tiếng Việt"],
              ["en", "English"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} lang={value}>
              <input
                type="radio"
                name="locale"
                value={value}
                checked={locale === value}
                onChange={() => change(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
