"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { usePreference } from "./ui-preferences";

function nodes(children: ReactNode): ReactElement<{
  children?: ReactNode;
  colSpan?: number;
  className?: string;
  "data-column-kind"?: string;
}>[] {
  return Children.toArray(children).flatMap((node) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        colSpan?: number;
        className?: string;
        "data-column-kind"?: string;
      }>(node)
    )
      return [];
    return typeof node.type === "symbol" ? nodes(node.props.children) : [node];
  });
}
function label(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? label(child.props.children)
          : "",
    )
    .join(" ")
    .trim();
}
export function hiddenColumns(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v)
      ? v.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}
export function ColumnTable({
  tableId,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement> & { tableId: string }) {
  const [raw, set] = usePreference(`fm-columns:${tableId}`, "[]");
  const hidden = hiddenColumns(raw);
  const sections = nodes(children);
  const head = sections.find((node) => node.type === "thead");
  const cells = nodes(nodes(head?.props.children)[0]?.props.children);
  const columns = cells.map((cell, index) => ({
    id:
      label(cell.props.children).replace(/[↕↑↓]/g, "").trim() ||
      `Cột ${index + 1}`,
    fixed: index === 0 || /thao tác/i.test(label(cell.props.children)),
  }));
  const visible = columns.map(
    (column) => column.fixed || !hidden.includes(column.id),
  );
  function sectionContent(section: (typeof sections)[number]): ReactNode {
    if (
      section.type !== "thead" &&
      section.type !== "tbody" &&
      section.type !== "tfoot"
    )
      return section;
    return cloneElement(
      section,
      {},
      nodes(section.props.children).map((row) => {
        let offset = 0;
        return cloneElement(
          row,
          {},
          nodes(row.props.children).flatMap((cell) => {
            const span = cell.props.colSpan ?? 1;
            const count = Array.from(
              { length: span },
              (_, i) => visible[offset + i] !== false,
            ).filter(Boolean).length;
            offset += span;
            const column = columns[offset - span];
            const kind =
              offset - span === 0
                ? "text"
                : column && /thao tác/i.test(column.id)
                  ? "actions"
                  : tableId === "income-months" ||
                      (column &&
                        /mức|chuyển sang|cần thêm|bỏ hũ|dự kiến bỏ|thực chi|còn lại|số tiền|đầu kỳ|cuối kỳ|vốn|kết quả|nạp ngoài|rút ngoài|đã chốt|chưa chốt|vượt mức|tổng|tài sản|giá trị/i.test(
                          column.id,
                        ))
                    ? "money"
                    : "text";
            return count
              ? [
                  cloneElement(cell, {
                    "data-column-kind": kind,
                    ...(span > 1 ? { colSpan: count } : {}),
                  }),
                ]
              : [];
          }),
        );
      }),
    );
  }
  return (
    <div className="column-table">
      {(columns.length >= 5 || tableId === "income-months") && (
        <ColumnPicker tableId={tableId} columns={columns} />
      )}
      <table
        {...props}
        style={
          {
            "--visible-columns": visible.filter(Boolean).length,
            ...props.style,
          } as CSSProperties
        }
      >
        {sections.map(sectionContent)}
      </table>
    </div>
  );
}
export function ColumnPicker({
  tableId,
  columns,
}: {
  tableId: string;
  columns: { id: string; fixed?: boolean }[];
}) {
  const [raw, set] = usePreference(`fm-columns:${tableId}`, "[]");
  const hidden = hiddenColumns(raw);
  return (
    <details className="column-picker">
      <summary>
        <Columns3 size={17} aria-hidden="true" />
        Cột hiển thị
      </summary>
      <div className="column-picker-options">
        <p>Chọn thông tin muốn xem</p>
        {columns.map((column, index) => (
          <label key={`${column.id}-${index}`}>
            <input
              type="checkbox"
              disabled={column.fixed}
              checked={column.fixed || !hidden.includes(column.id)}
              onChange={() =>
                set(
                  JSON.stringify(
                    hidden.includes(column.id)
                      ? hidden.filter((id) => id !== column.id)
                      : [...hidden, column.id],
                  ),
                )
              }
            />
            Hiện cột {column.id}
            {column.fixed && <small>Luôn hiện</small>}
          </label>
        ))}
        <button
          type="button"
          className="expense-secondary"
          onClick={() => set("[]")}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Khôi phục mặc định
        </button>
      </div>
    </details>
  );
}
