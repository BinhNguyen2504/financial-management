"use client";

import { useI18n } from "@/i18n/provider";

export function ViewControls({
  past,
  onCurrent,
  count = 0,
  onReset,
}: {
  past?: boolean;
  onCurrent?(): void;
  count?: number;
  onReset?(): void;
}) {
  const { t } = useI18n();
  if (!past && !count) return null;
  return (
    <div className="view-controls">
      {past && onCurrent && (
        <button type="button" className="expense-secondary" onClick={onCurrent}>
          {t("Về kỳ hiện tại")}
        </button>
      )}
      {count > 0 && onReset && (
        <button type="button" className="expense-secondary" onClick={onReset}>
          {t("Đặt lại bộ lọc")} · {count}
        </button>
      )}
    </div>
  );
}
