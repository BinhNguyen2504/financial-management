"use client";
import { useI18n } from "@/i18n/provider";

import { useMoney, useMoneyHidden } from "./privacy";

export function MoneyHint({
  id,
  value,
  empty = "Nhập số tiền VND",
}: {
  id: string;
  value: string;
  empty?: string;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const hidden = useMoneyHidden();
  return (
    <small id={id} className="money-input-hint">
      {value && /^\d{1,24}$/.test(value)
        ? money(value)
        : hidden && value
          ? "•••••• ₫"
          : t(empty)}
    </small>
  );
}
