"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from "react";
import { Columns3, LockKeyhole, RotateCcw, X } from "lucide-react";
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
  showColumnPicker = true,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement> & {
  tableId: string;
  showColumnPicker?: boolean;
}) {
  const [raw] = usePreference(`fm-columns:${tableId}`, "[]");
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
      {showColumnPicker &&
        (columns.length >= 5 || tableId === "income-months") && (
          <div className="column-table-toolbar">
            <ColumnPicker tableId={tableId} columns={columns} />
          </div>
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
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectable = columns.filter((column) => !column.fixed);
  const fixed = columns.filter((column) => column.fixed);
  const selected = selectable.filter(
    (column) => !hidden.includes(column.id),
  ).length;
  const position = useCallback(() => {
    const popup = panel.current;
    const anchor = trigger.current;
    if (!popup?.matches(":popover-open") || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const gutter = 12;
    const width = Math.min(320, window.innerWidth - gutter * 2);
    popup.style.width = `${width}px`;
    const below = window.innerHeight - rect.bottom - gap - gutter;
    const above = rect.top - gap - gutter;
    const upwards = below < Math.min(420, popup.scrollHeight) && above > below;
    // Narrow phones get a centered panel. In short landscape viewports use
    // the full height too, so the options retain a scrollable area.
    const useViewport =
      window.innerWidth <= 480 ||
      Math.max(above, below) < Math.min(300, window.innerHeight - gutter * 2);
    popup.style.maxHeight = `${Math.max(0, useViewport ? window.innerHeight - gutter * 2 : upwards ? above : below)}px`;
    popup.style.left = `${Math.max(gutter, Math.min(rect.right - width, window.innerWidth - width - gutter))}px`;
    popup.style.top = `${useViewport ? Math.max(gutter, (window.innerHeight - popup.getBoundingClientRect().height) / 2) : upwards ? Math.max(gutter, rect.top - gap - popup.getBoundingClientRect().height) : Math.max(gutter, rect.bottom + gap)}px`;
    popup.dataset.positioned = "true";
  }, []);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, position]);
  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <div className="column-picker">
      <button
        ref={trigger}
        type="button"
        className="column-picker-trigger"
        popoverTarget={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => requestAnimationFrame(position)}
      >
        <Columns3 size={17} aria-hidden="true" />
        Cột hiển thị
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        className="column-picker-options"
        onToggle={(event) => {
          const shown = event.newState === "open";
          setOpen(shown);
          if (shown) {
            position();
            panel.current
              ?.querySelector<HTMLInputElement>("input")
              ?.focus({ preventScroll: true });
          } else if (panel.current) delete panel.current.dataset.positioned;
        }}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        <div className="column-picker-heading">
          <div>
            <h3 id={`${id}-title`}>Cột hiển thị</h3>
            <p>
              {selected}/{selectable.length} cột tùy chọn đang hiện
            </p>
          </div>
          <button
            type="button"
            className="icon-action"
            aria-label="Đóng tùy chọn cột"
            onClick={close}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div
          className="column-picker-list"
          role="group"
          aria-label="Các cột tùy chọn"
        >
          {selectable.map((column, index) => (
            <label key={`${column.id}-${index}`} className="column-picker-row">
              <span>{column.id}</span>
              <input
                type="checkbox"
                aria-label={`Hiện cột ${column.id}`}
                checked={!hidden.includes(column.id)}
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
            </label>
          ))}
        </div>
        {fixed.length > 0 && (
          <p className="column-picker-fixed">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>
              Luôn hiện: {fixed.map((column) => column.id).join(", ")}
            </span>
          </p>
        )}
        <div className="column-picker-footer">
          <button
            type="button"
            className="expense-secondary"
            disabled={selected === selectable.length}
            onClick={() => {
              set("[]");
              // Reset disables this button. Keep keyboard focus in the popover
              // so Escape still dismisses just this layer and returns to its trigger.
              panel.current
                ?.querySelector<HTMLInputElement>("input")
                ?.focus({ preventScroll: true });
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Khôi phục mặc định
          </button>
        </div>
      </div>
    </div>
  );
}
