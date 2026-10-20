"use client";

import { ColumnTable } from "./column-table";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function DialogPreview({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
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
      aria-label="Xem trước thay đổi"
    >
      {children}
    </section>
  );
}

export function dateLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return day ? `${day}/${month}/${year}` : `${month}/${year}`;
}

// Keep decimal quantities exact; Intl.NumberFormat(Number(value)) loses precision.
export function decimalLabel(value: string) {
  const [whole, fraction] = value.split(".");
  return `${BigInt(whole).toLocaleString("vi-VN")}${fraction ? `,${fraction.replace(/0+$/, "")}`.replace(/,$/, "") : ""}`;
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
  return (
    <section className="dialog-summary" aria-label="Tóm tắt">
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
  if (!text) return null;
  return text.length > 140 ? (
    <details className="dialog-note">
      <summary>Xem ghi chú</summary>
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
      <div
        role="tablist"
        aria-label="Nội dung chi tiết"
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
      </div>
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
  label: string;
  options: { value: string; label: string }[];
  value: (item: T) => string;
  initial?: string;
}
export function DialogList<T>({
  items,
  rowKey,
  columns,
  searchText,
  filters = [],
  getDate,
  empty = "Chưa có dữ liệu.",
  label = "Danh sách",
}: {
  items: T[];
  rowKey: (item: T) => string;
  columns: DialogColumn<T>[];
  searchText?: (item: T) => string;
  filters?: DialogFilter<T>[];
  getDate?: (item: T) => string;
  empty?: string;
  label?: string;
}) {
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
      filters.every((f) => {
        const v = values[f.label] ?? f.initial ?? "";
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
      className="dialog-collection"
      aria-label={label}
      onChange={(event) => event.stopPropagation()}
    >
      <div className="dialog-list-start" ref={start} tabIndex={-1}>
        <h3>{label}</h3>
        <div className="dialog-filters">
          {searchText && (
            <label>
              Tìm kiếm
              <input
                type="search"
                value={query}
                placeholder="Tên, nội dung, ghi chú…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          )}
          {filters.map((filter) => (
            <label key={filter.label}>
              {filter.label}
              <select
                value={values[filter.label] ?? filter.initial ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [filter.label]: e.target.value });
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
                Từ ngày
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
                Đến ngày
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
          {filtered.length} / {items.length} kết quả
          {filtered.length > 0
            ? ` · ${current * 20 + 1}–${Math.min((current + 1) * 20, filtered.length)}`
            : ""}
        </p>
        {from && to && from > to && (
          <p role="alert" className="expense-error">
            Ngày kết thúc phải từ ngày bắt đầu.
          </p>
        )}
      </div>
      {visible.length ? (
        <ColumnTable
          tableId={`dialog:${columns.map((column) => column.label).join("/")}`}
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
                          /^(Tháng|Ngày)$/.test(column.label)
                        ? "is-date"
                        : column.kind === "actions" ||
                            column.label === "Thao tác"
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
                            /^(Tháng|Ngày)$/.test(column.label)
                          ? "is-date"
                          : column.kind === "actions" ||
                              column.label === "Thao tác"
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
            ? "Không có kết quả phù hợp. Hãy đổi bộ lọc hoặc từ khóa."
            : empty}
        </p>
      )}
      {pages > 1 && (
        <nav className="dialog-pagination" aria-label={`Phân trang ${label}`}>
          <button
            type="button"
            className="expense-secondary"
            disabled={current === 0}
            onClick={() => navigate(current - 1)}
          >
            Trang trước
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
  rows: { key: string; label: string; before: ReactNode; after: ReactNode }[];
}) {
  const changedRows = rows.filter((row) => row.before !== row.after);
  if (!changedRows.length)
    return (
      <p className="expense-muted">
        Cập nhật thông tin cấu hình; số liệu đã ghi nhận được giữ nguyên.
      </p>
    );
  return (
    <DialogList
      items={changedRows}
      rowKey={(r) => r.key}
      label="Ảnh hưởng trước và sau"
      columns={[
        {
          label: "Thông tin",
          render: (r) => r.label,
          width: numeric ? "44%" : "20%",
        },
        { label: "Trước", render: (r) => r.before, numeric },
        { label: "Sau", render: (r) => r.after, numeric },
      ]}
    />
  );
}
