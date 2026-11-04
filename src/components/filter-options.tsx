"use client";

import { useI18n } from "@/i18n/provider";
import { useId, useState, type ReactNode } from "react";

/** The controls stay mounted, so hidden filters retain their values and labels. */
export function FilterOptions({
  count,
  onReset,
  children,
}: {
  count: number;
  onReset(): void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="filter-options" data-expanded={open}>
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
