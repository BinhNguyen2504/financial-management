"use client";
import { useI18n } from "@/i18n/provider";

import type { IncomeRow } from "@/domain/income/types";
import { formatMonth as monthName } from "@/i18n/format";
import { AlertCircle, PlusCircle } from "lucide-react";

export function missingIncomeRows(rows: IncomeRow[], today: string) {
  return rows.filter(
    (row) =>
      row.kind === "fixed" &&
      row.active &&
      row.amount === null &&
      row.month <= today.slice(0, 7),
  );
}
export function MissingIncome({
  rows,
  today,
  onEnter,
}: {
  rows: IncomeRow[];
  today: string;
  onEnter(row: IncomeRow): void;
}) {
  const { t: tr, locale } = useI18n("income");

  const missing = missingIncomeRows(rows, today);
  if (!missing.length)
    return (
      <p className="expense-muted">
        {tr("Đã ghi nhận đủ các khoản thu cố định đến hạn trong kỳ.")}
      </p>
    );
  const months = [...new Set(missing.map((row) => row.month))].sort();
  return (
    <div className="income-missing-list">
      <div className="data-warning" role="status">
        <AlertCircle size={20} aria-hidden="true" />
        <strong>
          {tr("Còn")} {missing.length} {tr("khoản thu cố định chưa nhập trong")}{" "}
          {months.length} {tr("tháng.")}
        </strong>
        <span>{tr("Chọn khoản bên dưới để bổ sung.")}</span>
      </div>
      {months.map((month) => (
        <details key={month} open={months.length === 1}>
          <summary>
            <span className="status-badge status-missing">
              {monthName(month, locale)} ·{" "}
              {missing.filter((row) => row.month === month).length}{" "}
              {tr("danh mục chưa nhập")}
            </span>
          </summary>
          <div className="income-missing-actions">
            {missing
              .filter((row) => row.month === month)
              .map((row) => (
                <button
                  type="button"
                  className="expense-secondary"
                  key={`${row.key}/${row.month}`}
                  onClick={() => onEnter(row)}
                >
                  <PlusCircle size={17} aria-hidden="true" />
                  {tr("Nhập")} {row.name} · {monthName(row.month, locale)}
                </button>
              ))}
          </div>
        </details>
      ))}
    </div>
  );
}
