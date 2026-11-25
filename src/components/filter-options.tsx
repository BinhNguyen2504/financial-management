"use client";

import { useI18n } from "@/i18n/provider";
import { useId, useState, type ReactNode } from "react";

/** The controls stay mounted, so hidden filters retain their values and labels. */
export function FilterOptions({
  count,
  onReset,
  resetPlacement = "before",
  children,
}: {
  count: number;
  onReset(): void;
  /**
   * "after" puts the reset row below the controls on desktop, so choosing the first filter value
   * cannot push the controls down under the pointer (needed when several values are picked in a row).
   */
  resetPlacement?: "before" | "after";
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div
      className="filter-options"
      data-expanded={open}
      data-reset-placement={resetPlacement}
    >
      <div className="filter-options-tools" data-active={count > 0}>
        <button
          type="button"
          className="expense-secondary filter-options-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {t("Bộ lọc")} · {count}
        </button>
        {count > 0 && (
          <button type="button" className="expense-secondary" onClick={onReset}>
            {t("Đặt lại bộ lọc")}
          </button>
        )}
      </div>
      <div id={id} className="filter-options-body">
        {children}
      </div>
    </div>
  );
}
