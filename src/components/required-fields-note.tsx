"use client";

import { useI18n } from "@/i18n/provider";

export function RequiredFieldsNote() {
  const { t } = useI18n();
  return (
    <p className="required-fields-note">
      <span className="required-mark" aria-hidden="true">
        *
      </span>
      {t("Bắt buộc")}
    </p>
  );
}
