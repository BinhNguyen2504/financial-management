"use client";

import { useI18n } from "@/i18n/provider";

/**
 * Jumps back to the current period. Render it next to the period picker (as a
 * child of `MonthYearSelect`, or right after a date/period field) and only
 * while another period is being viewed.
 */
export function CurrentPeriodButton({ onClick }: { onClick(): void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="expense-secondary period-current"
      onClick={onClick}
    >
      {t("Về kỳ hiện tại")}
    </button>
  );
}

/** Clears the active report filters; hidden when none are set. */
export function ViewControls({
  count = 0,
  onReset,
}: {
  count?: number;
  onReset?(): void;
}) {
  const { t } = useI18n();
  if (!count) return null;
  return (
    <div className="view-controls">
      {onReset && (
        <button type="button" className="expense-secondary" onClick={onReset}>
          {t("Đặt lại bộ lọc")} · {count}
        </button>
      )}
    </div>
  );
}
