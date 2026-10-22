"use client";

import { useToast } from "@/components/toast";
import { useI18n } from "./provider";
import { translate } from "./translate";

export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  const toast = useToast();
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
                onChange={() => {
                  setLocale(value);
                  toast("success", translate(value, "Đã đổi ngôn ngữ."));
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
