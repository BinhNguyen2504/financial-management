"use client";

import "./multi-select-filter.css";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectLabels {
  /** Shown when nothing is selected: no restriction, like the "Tất cả" option of a single select. */
  all: string;
  /** Shown for two or more selected values, e.g. "2 đã chọn". */
  count(selected: number): string;
  clear: string;
}

/**
 * A select-like control for filters that accept more than one value. The button shows a short
 * summary; it opens a panel where every option is a row with a checkbox. An empty selection means
 * "no restriction". The panel uses the native popover (Escape, outside click and top layer included).
 */
export function MultiSelectFilter({
  legend,
  options,
  value,
  onChange,
  labels,
}: {
  legend: string;
  options: MultiSelectOption[];
  value: string[];
  onChange(next: string[]): void;
  labels: MultiSelectLabels;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Only keyboard users need focus moved into the list; with a pointer it would look like a selection.
  const byKeyboard = useRef(false);
  const selected = options.filter((option) => value.includes(option.value));
  const summary =
    selected.length === 0
      ? labels.all
      : selected.length === 1
        ? selected[0].label
        : labels.count(selected.length);
  const toggle = (item: string, checked: boolean) =>
    onChange(
      checked
        ? [...new Set([...value, item])]
        : value.filter((current) => current !== item),
    );
  const position = useCallback(() => {
    const popup = panel.current;
    const anchor = trigger.current;
    if (!popup?.matches(":popover-open") || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const gutter = 12;
    const width = Math.min(
      Math.max(rect.width, 260),
      window.innerWidth - gutter * 2,
    );
    popup.style.width = `${width}px`;
    const below = window.innerHeight - rect.bottom - gap - gutter;
    const above = rect.top - gap - gutter;
    const upwards = below < Math.min(280, popup.scrollHeight) && above > below;
    popup.style.maxHeight = `${Math.max(120, upwards ? above : below)}px`;
    popup.style.left = `${Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter))}px`;
    popup.style.top = `${upwards ? Math.max(gutter, rect.top - gap - popup.getBoundingClientRect().height) : rect.bottom + gap}px`;
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
  // The layout can move while the panel is open (content above changes height), so follow the field.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let last = "";
    const follow = () => {
      const rect = trigger.current?.getBoundingClientRect();
      const key = rect ? `${rect.left}|${rect.top}|${rect.width}` : "";
      if (key !== last) {
        last = key;
        position();
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [open, options.length, position]);
  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <div className="multi-filter" data-active={value.length > 0}>
      <span className="multi-filter-label" id={`${id}-label`}>
        {legend}
      </span>
      <button
        ref={trigger}
        type="button"
        className="multi-filter-trigger"
        popoverTarget={id}
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={(event) => {
          byKeyboard.current = event.detail === 0;
          requestAnimationFrame(position);
        }}
      >
        <span className="multi-filter-value" id={`${id}-value`}>
          {summary}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="group"
        aria-labelledby={`${id}-label`}
        className="multi-filter-options"
        onToggle={(event) => {
          const shown = event.newState === "open";
          setOpen(shown);
          if (shown) {
            position();
            if (byKeyboard.current)
              (
                panel.current?.querySelector<HTMLInputElement>(
                  "input:checked",
                ) ?? panel.current?.querySelector<HTMLInputElement>("input")
              )?.focus({ preventScroll: true });
          } else if (panel.current) delete panel.current.dataset.positioned;
        }}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        <div className="multi-filter-list">
          {options.map((option) => (
            <label className="multi-filter-row" key={option.value}>
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={(e) => toggle(option.value, e.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <div className="multi-filter-footer">
          <button
            type="button"
            className="multi-filter-clear"
            disabled={value.length === 0}
            onClick={() => {
              onChange([]);
              // The button disables itself; keep focus inside the panel so Escape still works.
              panel.current
                ?.querySelector<HTMLInputElement>("input")
                ?.focus({ preventScroll: true });
            }}
          >
            {labels.clear}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Keeps only string arrays so a stale or edited session value cannot break filtering. */
export function validStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 50 &&
    value.every((item) => typeof item === "string" && item.length <= 200)
  );
}
