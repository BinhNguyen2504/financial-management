"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

/** Reveal a tab by scrolling its own strip, without scrolling a page or dialog. */
export function ScrollTabs({
  as: Tag = "div",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "nav" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    let frame = 0;
    function reveal() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!strip || getComputedStyle(strip).flexDirection === "column")
          return;
        const focused = document.activeElement;
        const selected =
          (focused instanceof HTMLElement && strip.contains(focused)
            ? focused.closest("button")
            : null) ??
          strip.querySelector<HTMLElement>(
            '[aria-selected="true"], [aria-pressed="true"]',
          );
        if (!selected) return;
        const box = strip.getBoundingClientRect();
        const tab = selected.getBoundingClientRect();
        const gutter = 4;
        if (tab.left < box.left + gutter)
          strip.scrollLeft += tab.left - box.left - gutter;
        else if (tab.right > box.right - gutter)
          strip.scrollLeft += tab.right - box.right + gutter;
      });
    }
    const resize = new ResizeObserver(reveal);
    function observeSizes() {
      resize.disconnect();
      resize.observe(strip!);
      for (const child of strip!.children) resize.observe(child);
    }
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) observeSizes();
      reveal();
    });
    mutation.observe(strip, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-selected", "aria-pressed"],
    });
    observeSizes();
    strip.addEventListener("focusin", reveal);
    reveal();
    return () => {
      cancelAnimationFrame(frame);
      mutation.disconnect();
      resize.disconnect();
      strip.removeEventListener("focusin", reveal);
    };
  }, []);
  return (
    <Tag {...props} ref={ref} className={`scroll-tabs ${className}`}>
      {children}
    </Tag>
  );
}
