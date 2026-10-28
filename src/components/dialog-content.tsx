"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";

import { formatDate, formatDecimal } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import { translate } from "@/i18n/translate";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ColumnTable } from "./column-table";

export function DialogPreview({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const { t: tr } = useI18n();

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className={className}
      role="region"
      aria-label={tr("Xem trước thay đổi")}
    >
      {children}
    </section>
  );
}

export function dateLabel(value: string, locale: Locale = "vi") {
  return formatDate(value, locale);
}
export function decimalLabel(value: string, locale: Locale = "vi") {
  return formatDecimal(value, locale);
}

export function DialogSummary({
  label,
  value,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  children?: ReactNode;
}) {
  const { t: tr } = useI18n();

  return (
    <section className="dialog-summary" aria-label={tr("Tóm tắt")}>
      <p className="dialog-summary-label">{label}</p>
      <strong className="dialog-summary-value">{value}</strong>
      {children}
    </section>
  );
}

export function DialogFacts({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="dialog-facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DialogNote({ text }: { text?: string }) {
  const { t: tr } = useI18n();

  if (!text) return null;
  return text.length > 140 ? (
    <details className="dialog-note">
      <summary>{tr("Xem ghi chú")}</summary>
      <p>{text}</p>
    </details>
  ) : (
    <p className="dialog-note">{text}</p>
  );
}

export function DialogTabs({
  tabs,
}: {
  tabs: { id: string; label: string; count?: number; content: ReactNode }[];
}) {
  const { t: tr } = useI18n();

  const uid = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const root = useRef<HTMLDivElement>(null);
  const offsets = useRef<Record<string, number>>({});
  const current = tabs.some((t) => t.id === active) ? active : tabs[0]?.id;
  function select(id: string) {
    const body = root.current?.closest<HTMLElement>(".dialog-body");
    if (body && current) offsets.current[current] = body.scrollTop;
    setActive(id);
    requestAnimationFrame(() => {
      if (body) body.scrollTop = offsets.current[id] ?? 0;
    });
  }
  return (
    <div ref={root} className="dialog-tabs-content">
      <ScrollTabs
        role="tablist"
        aria-label={tr("Nội dung chi tiết")}
        className="dialog-tabs"
      >
        {tabs.map((tab, index) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            id={`${uid}-${tab.id}-tab`}
            aria-controls={`${uid}-${tab.id}-panel`}
            aria-selected={current === tab.id}
            tabIndex={current === tab.id ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                      tabs.length;
              select(tabs[next].id);
              document
                .getElementById(`${uid}-${tabs[next].id}-tab`)
                ?.focus({ preventScroll: true });
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="dialog-count">{tab.count}</span>
            )}
          </button>
        ))}
      </ScrollTabs>
      {tabs.map((tab) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={`${uid}-${tab.id}-panel`}
          aria-labelledby={`${uid}-${tab.id}-tab`}
          hidden={current !== tab.id}
        >
          {tab.content}
        </section>
      ))}
    </div>
  );
}

export interface DialogColumn<T> {
  label: string;
  render: (item: T) => ReactNode;
  numeric?: boolean;
  kind?: "text" | "date" | "actions";
  width?: string;
}
export interface DialogFilter<T> {
  id?: string;
  label: string;
  options: { value: string; label: string }[];
  value: (item: T) => string;
  initial?: string;
}
export function DialogList<T>({
  items,
  rowKey,
  columns = [],
  searchText,
  filters = [],
  getDate,
  empty = "Chưa có dữ liệu.",
  label = "Danh sách",
  renderItem,
}: {
  items: T[];
  rowKey: (item: T) => string;
  columns?: DialogColumn<T>[];
  searchText?: (item: T) => string;
  filters?: DialogFilter<T>[];
  getDate?: (item: T) => string;
  empty?: string;
  label?: string;
  renderItem?: (item: T) => ReactNode;
}) {
  const { t: tr } = useI18n();

  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const start = useRef<HTMLDivElement>(null);
  const normalize = (v: string) =>
    v
      .toLocaleLowerCase("vi-VN")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const filtered = items.filter(
    (item) =>
      (!query ||
        normalize(searchText?.(item) ?? "").includes(
          normalize(query.trim()),
        )) &&
      filters.every((f, index) => {
        const v = values[f.id ?? String(index)] ?? f.initial ?? "";
        return !v || f.value(item) === v;
      }) &&
      (!getDate ||
        ((!from || getDate(item) >= from) && (!to || getDate(item) <= to))),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * 20, current * 20 + 20);
  function navigate(next: number) {
    setPage(next);
    start.current?.focus({ preventScroll: true });
    start.current?.scrollIntoView({ block: "start" });
  }
  return (
    <div
      className={`dialog-collection${renderItem ? " dialog-collection-compact" : ""}`}
      aria-label={tr(label)}
      onChange={(event) => event.stopPropagation()}
    >
      <div className="dialog-list-start" ref={start} tabIndex={-1}>
        <h3>{tr(label)}</h3>
        <div className="dialog-filters">
          {searchText && (
            <label>
              {tr("Tìm kiếm")}
              <input
                type="search"
                value={query}
                placeholder={tr("Tên, nội dung, ghi chú…")}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          )}
          {filters.map((filter, index) => (
            <label key={filter.id ?? index}>
              {filter.label}
              <select
                value={
                  values[filter.id ?? String(index)] ?? filter.initial ?? ""
                }
                onChange={(e) => {
                  setValues({
                    ...values,
                    [filter.id ?? String(index)]: e.target.value,
                  });
                  setPage(0);
                }}
              >
                {filter.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {getDate && (
            <>
              <label>
                {tr("Từ ngày")}
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                {tr("Đến ngày")}
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
            </>
          )}
        </div>
        <p className="dialog-result-count" role="status">
          {filtered.length} / {items.length} {tr("kết quả")}
          {filtered.length > 0
            ? ` · ${current * 20 + 1}–${Math.min((current + 1) * 20, filtered.length)}`
            : ""}
        </p>
        {from && to && from > to && (
          <p role="alert" className="expense-error">
            {tr("Ngày kết thúc phải từ ngày bắt đầu.")}
          </p>
        )}
      </div>
      {visible.length && renderItem ? (
        <ul className="dialog-compact-list" aria-label={tr(label)}>
          {visible.map((item) => (
            <li key={rowKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
      ) : visible.length ? (
        <ColumnTable
          tableId={`dialog:${columns.map((column) => translate("vi", column.label)).join("/")}`}
          className="dialog-data-table"
        >
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  scope="col"
                  key={column.label}
                  className={
                    column.numeric
                      ? "is-numeric"
                      : column.kind === "date" ||
                          /^(Tháng|Ngày|Month|Date)$/.test(column.label)
                        ? "is-date"
                        : column.kind === "actions" ||
                            column.label === tr("Thao tác")
                          ? "is-actions"
                          : ""
                  }
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={rowKey(item)}>
                {columns.map((column) => (
                  <td
                    key={column.label}
                    className={
                      column.numeric
                        ? "is-numeric"
                        : column.kind === "date" ||
                            /^(Tháng|Ngày|Month|Date)$/.test(column.label)
                          ? "is-date"
                          : column.kind === "actions" ||
                              column.label === tr("Thao tác")
                            ? "is-actions"
                            : ""
                    }
                    style={column.width ? { width: column.width } : undefined}
                  >
                    <span className="dialog-cell-label" aria-hidden="true">
                      {column.label}
                    </span>
                    <div>{column.render(item)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </ColumnTable>
      ) : (
        <p className="dialog-empty">
          {items.length
            ? tr("Không có kết quả phù hợp. Hãy đổi bộ lọc hoặc từ khóa.")
            : empty}
        </p>
      )}
      {pages > 1 && (
        <nav
          className="dialog-pagination"
          aria-label={tr("Phân trang {0}", { 0: label })}
        >
          <button
            type="button"
            className="expense-secondary"
            disabled={current === 0}
            onClick={() => navigate(current - 1)}
          >
            {tr("Trang trước")}
          </button>
          <span>
            Trang {current + 1} / {pages}
          </span>
          <button
            type="button"
            className="expense-secondary"
            disabled={current === pages - 1}
            onClick={() => navigate(current + 1)}
          >
            Trang sau
          </button>
        </nav>
      )}
    </div>
  );
}

export function DialogChanges({
  rows,
  numeric = false,
}: {
  numeric?: boolean;
  rows: {
    key: string;
    label: string;
    period?: string;
    subject?: string;
    before: ReactNode;
    after: ReactNode;
  }[];
}) {
  const { t: tr } = useI18n();

  const changedRows = rows.filter((row) => row.before !== row.after);
  if (!changedRows.length)
    return (
      <p className="expense-muted">
        {tr(
          "Cập nhật thông tin cấu hình; số liệu đã ghi nhận được giữ nguyên.",
        )}
      </p>
    );
  return (
    <DialogList
      items={changedRows}
      rowKey={(r) => r.key}
      label={tr("Ảnh hưởng trước và sau")}
      columns={[
        ...(changedRows.some((r) => r.period)
          ? [
              {
                label: tr("Tháng"),
                kind: "date" as const,
                render: (r: (typeof rows)[number]) => r.period ?? "—",
              },
            ]
          : []),
        ...(changedRows.some((r) => r.subject)
          ? [
              {
                label: tr("Hũ"),
                render: (r: (typeof rows)[number]) => r.subject ?? "—",
              },
            ]
          : []),
        {
          label: tr("Thông tin"),
          render: (r) => r.label,
          width: changedRows.some((r) => r.period || r.subject)
            ? undefined
            : numeric
              ? "44%"
              : "20%",
        },
        { label: tr("Trước"), render: (r) => r.before, numeric },
        { label: tr("Sau"), render: (r) => r.after, numeric },
      ]}
    />
  );
}
