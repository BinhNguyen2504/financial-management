"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Store only the selection here: callers format current data on every render,
// including when Privacy Mode changes while a tooltip is open.
export function useChartTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [active, setActive] = useState<{
    key: string;
    x: number;
    y: number;
  } | null>(null);
  const close = () => setActive(null);

  useEffect(() => {
    if (!active) return;
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setActive(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    const leave = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" ||
        ref.current?.contains(event.target as Node) ||
        ref.current?.contains(document.activeElement)
      )
        return;
      const bounds = tooltipRef.current?.getBoundingClientRect();
      // Keep the tooltip readable when crossing its small gap or hovering it,
      // while letting pointer events reach any data marks underneath it.
      if (
        bounds &&
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom + 12
      )
        return;
      setActive(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    document.addEventListener("pointermove", leave);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointermove", leave);
      window.removeEventListener("resize", close);
    };
  }, [active]);

  function show(
    key: string,
    target: Element,
    pointer?: { clientX: number; clientY: number },
  ) {
    const bounds = ref.current!.getBoundingClientRect();
    const mark = target.getBoundingClientRect();
    setActive({
      key,
      x: (pointer?.clientX ?? mark.left + mark.width / 2) - bounds.left,
      y: Math.max(0, (pointer?.clientY ?? mark.top) - bounds.top),
    });
  }

  return {
    active: active?.key,
    close,
    onScroll: () => {
      const focused = document.activeElement;
      const key = focused?.getAttribute("data-tooltip-key");
      if (active && key && focused && ref.current?.contains(focused))
        show(key, focused);
      else close();
    },
    container: {
      ref,
      className: "savings-chart-interactive",
      onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") close();
      },
    },
    trigger: (key: string, label: string) => ({
      tabIndex: 0,
      role: "img",
      "aria-label": label,
      "aria-describedby": active?.key === key ? id : undefined,
      "data-active": active?.key === key || undefined,
      "data-tooltip-key": key,
      onPointerEnter: (event: React.PointerEvent<Element>) => {
        const focused = document.activeElement;
        const focusedKey =
          focused && ref.current?.contains(focused)
            ? focused.getAttribute("data-tooltip-key")
            : null;
        // Scrolling a keyboard-focused mark under a stationary pointer must
        // not replace its tooltip with a neighboring mark's values.
        if (
          event.pointerType !== "touch" &&
          (!focusedKey || focusedKey === key)
        )
          show(key, event.currentTarget, event);
      },
      onPointerMove: (event: React.PointerEvent<Element>) => {
        if (event.pointerType !== "touch")
          show(key, event.currentTarget, event);
      },
      onFocus: (event: React.FocusEvent<Element>) =>
        show(key, event.currentTarget),
      onClick: (event: React.MouseEvent<Element>) =>
        show(key, event.currentTarget),
    }),
    tooltip: (content: ReactNode) =>
      active && content ? (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="savings-chart-tooltip"
          style={{
            left: `clamp(8px, ${active.x - 130}px, calc(100% - 268px))`,
            top: active.y,
          }}
        >
          {content}
        </div>
      ) : null,
  };
}
