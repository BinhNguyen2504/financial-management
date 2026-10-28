"use client";

import { useEffect, useRef, type DetailsHTMLAttributes } from "react";

/** Native disclosure first: readable without JS, with the existing DOM and CSS. */
export function AnimatedDetails({
  children,
  className = "",
  open,
  ...props
}: DetailsHTMLAttributes<HTMLDetailsElement>) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    const summary = details?.querySelector<HTMLElement>(":scope > summary");
    if (!details || !summary) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let expanded = details.open;
    let targetHeight = 0;
    let savedOverflow = "";
    const inert = new Map<HTMLElement, boolean>();

    function restoreContent() {
      for (const [element, value] of inert) element.inert = value;
      inert.clear();
    }
    function finish() {
      animation?.cancel();
      animation = undefined;
      details!.open = expanded;
      details!.style.overflow = savedOverflow;
      summary!.removeAttribute("aria-expanded");
      details!.removeAttribute("data-closing");
      restoreContent();
    }
    function closedHeight() {
      const box = getComputedStyle(details!);
      const heading = getComputedStyle(summary!);
      return (
        summary!.getBoundingClientRect().height +
        [
          box.paddingTop,
          box.paddingBottom,
          box.borderTopWidth,
          box.borderBottomWidth,
          heading.marginTop,
          heading.marginBottom,
        ].reduce((sum, value) => sum + (parseFloat(value) || 0), 0)
      );
    }
    function animate(from: number) {
      animation?.cancel();
      // No persistent height: expanded content can grow, translate or resize freely.
      targetHeight = expanded
        ? details!.getBoundingClientRect().height
        : closedHeight();
      animation = details!.animate(
        [{ height: `${from}px` }, { height: `${targetHeight}px` }],
        { duration: expanded ? 280 : 190, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
      animation.onfinish = finish;
    }
    function click(event: MouseEvent) {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.closest("summary") !== summary ||
        target.closest("a, button, input, select, textarea") ||
        event.defaultPrevented ||
        event.button !== 0
      )
        return;
      if (motion.matches || typeof details!.animate !== "function") return;
      event.preventDefault();
      const from = details!.getBoundingClientRect().height;
      if (!animation) {
        expanded = details!.open;
        savedOverflow = details!.style.overflow;
      }
      expanded = !expanded;
      restoreContent();
      if (!expanded) {
        if (
          details!.contains(document.activeElement) &&
          !summary!.contains(document.activeElement)
        )
          summary!.focus({ preventScroll: true });
        for (const child of details!.children) {
          if (child instanceof HTMLElement && child !== summary) {
            inert.set(child, child.inert);
            child.inert = true;
          }
        }
      }
      details!.open = true;
      details!.toggleAttribute("data-closing", !expanded);
      summary!.setAttribute("aria-expanded", String(expanded));
      details!.style.overflow = "clip";
      animate(from);
    }
    function resize() {
      if (!animation || !expanded) return;
      const from = details!.getBoundingClientRect().height;
      const timing = animation.currentTime;
      // Temporarily remove the effect to measure the natural content height.
      animation.cancel();
      const natural = details!.getBoundingClientRect().height;
      if (Math.abs(natural - targetHeight) > 1) animate(from);
      else {
        animation.play();
        animation.currentTime = timing;
      }
    }
    function motionChanged() {
      if (motion.matches && animation) finish();
    }
    const observer = new ResizeObserver(resize);
    for (const child of details.children) observer.observe(child);
    const mutation = new MutationObserver(() => {
      for (const child of details.children) observer.observe(child);
      resize();
    });
    mutation.observe(details, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    summary.addEventListener("click", click);
    motion.addEventListener("change", motionChanged);
    return () => {
      observer.disconnect();
      mutation.disconnect();
      summary.removeEventListener("click", click);
      motion.removeEventListener("change", motionChanged);
      animation?.cancel();
      if (animation) details.style.overflow = savedOverflow;
      summary.removeAttribute("aria-expanded");
      details.removeAttribute("data-closing");
      restoreContent();
    };
  }, [open]);

  return (
    <details
      {...props}
      open={open}
      ref={ref}
      className={`animated-details ${className}`}
    >
      {children}
    </details>
  );
}
