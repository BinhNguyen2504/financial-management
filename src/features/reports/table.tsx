"use client";
import { useState } from "react";
import { ColumnTable } from "@/components/column-table";
import { useMoney, useMoneyHidden } from "@/components/privacy";
import { useI18n } from "@/i18n/provider";
import { formatDecimal } from "@/i18n/format";
import type { Table } from "@/domain/reports/model";

export function ReportTable({
  table,
  paginated = true,
}: {
  table: Table;
  paginated?: boolean;
}) {
  const { t, locale } = useI18n("reports"),
    money = useMoney(),
    hidden = useMoneyHidden();
  const [sort, setSort] = useState({ key: "", direction: 1 }),
    [page, setPage] = useState(1);
  const rows = [...table.rows].sort((a, b) => {
    if (!sort.key) return 0;
    const av = a[sort.key],
      bv = b[sort.key];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const type = table.columns.find((c) => c.key === sort.key)?.type;
    if (type === "money" || type === "percent" || sort.key === "missing") {
      const numeric = (value: string) => BigInt(value.replace(".", ""));
      return (
        (numeric(av) < numeric(bv) ? -1 : numeric(av) > numeric(bv) ? 1 : 0) *
        sort.direction
      );
    }
    return av.localeCompare(bv, locale) * sort.direction;
  });
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    current = Math.min(page, pages);
  const selected = paginated
    ? rows.slice((current - 1) * 20, current * 20)
    : rows;
  return (
    <section className="reports-table-section" aria-label={t(table.title)}>
      <h3>{t(table.title)}</h3>
      {!rows.length ? (
        <p className="expense-muted">{t("Chưa có dữ liệu trong kỳ.")}</p>
      ) : (
        <ColumnTable
          tableId={`reports-${table.id}`}
          style={{
            minWidth:
              table.columns.length > 3 ? table.columns.length * 135 : undefined,
          }}
        >
          <caption>{t(table.title)} · VND</caption>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.type !== "text" ? "reports-number" : undefined}
                  aria-sort={
                    sort.key === c.key
                      ? sort.direction === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() => {
                      setSort({
                        key: c.key,
                        direction: sort.key === c.key ? -sort.direction : 1,
                      });
                      setPage(1);
                    }}
                  >
                    {t(c.label)} ↕
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.map((row) => (
              <tr key={row.id}>
                {table.columns.map((c) => {
                  const value = row[c.key];
                  const productText =
                    ["kind", "status", "mode"].includes(c.key) ||
                    (c.key === "note" &&
                      ["goals.current", "savings.categories"].includes(
                        table.id,
                      ));
                  const label =
                    value == null
                      ? "—"
                      : c.type === "money"
                        ? money(value)
                        : c.type === "percent"
                          ? hidden
                            ? "••• %"
                            : `${formatDecimal(value, locale)}%`
                          : productText
                            ? t(value)
                            : table.id.startsWith("funds.") && c.key === "name"
                              ? ({
                                  emergency: t("Quỹ khẩn cấp"),
                                  rainy_day: t("Quỹ phát sinh"),
                                  sinking: t("Quỹ chi dự kiến"),
                                }[value] ?? value)
                              : value;
                  return (
                    <td
                      key={c.key}
                      className={
                        c.type !== "text"
                          ? "reports-number"
                          : ["month", "date", "deadline"].includes(c.key)
                            ? "reports-date"
                            : undefined
                      }
                    >
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </ColumnTable>
      )}
      {paginated && pages > 1 && (
        <div className="reports-pagination">
          <button
            className="expense-secondary"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            {t("Trang trước")}
          </button>
          <span>{t("Trang {page} / {pages}", { page: current, pages })}</span>
          <button
            className="expense-secondary"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            {t("Trang sau")}
          </button>
        </div>
      )}
    </section>
  );
}
