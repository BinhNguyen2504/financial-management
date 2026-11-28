"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeTooltip, type TooltipPlacement } from "./tooltip-position";

interface Tip {
  anchor: HTMLElement;
  text: string;
  host: HTMLElement;
  source: "hover" | "focus";
}

const rendered = (element: Element) => element.getClientRects().length > 0;

/** A control that currently shows its own text needs no tooltip. */
function textFor(anchor: HTMLElement) {
  const labelled = [...anchor.querySelectorAll("[data-tooltip-label]")];
  return labelled.some(rendered) ? "" : (anchor.dataset.tooltip ?? "");
}

const anchorOf = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest<HTMLElement>("[data-tooltip]")
    : null;

/**
 * The single tooltip for icon-only controls. Mark a control with
 * `data-tooltip`; no wrapper is added, so layout selectors stay intact.
 * Optional: `data-tooltip-placement`, `data-tooltip-escape="pass"` (close
 * buttons) and a `data-tooltip-label` child that hides it while visible.
 */
export function TooltipLayer() {
  const id = useId();
  const element = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let current: Tip | null = null;
    // Dismissed controls stay quiet until the pointer leaves them.
    let suppressed: HTMLElement | null = null;
    // Programmatic focus (dialog open, focus restore) must not show a tooltip.
    let tabbing = false;
    const hide = () => {
      if (!current) return;
      current = null;
      setTip(null);
    };
    const dismiss = () => {
      if (current) suppressed = current.anchor;
      hide();
    };
    const show = (anchor: HTMLElement, source: Tip["source"]) => {
      const text = textFor(anchor);
      if (!text) return hide();
      current = {
        anchor,
        text,
        source,
        // Modal content outside a dialog is inert; the guest landing keeps its
        // own colours.
        host:
          anchor.closest<HTMLElement>("dialog, .public-shell") ?? document.body,
      };
      setTip(current);
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const anchor = anchorOf(event.target);
      if (suppressed !== anchor) suppressed = null;
      if (anchor) {
        if (anchor !== suppressed && current?.anchor !== anchor)
          show(anchor, "hover");
        return;
      }
      if (current?.source !== "hover") return;
      // Stay readable while the pointer crosses the small gap to the tooltip.
      const bounds = element.current?.getBoundingClientRect();
      if (
        bounds &&
        event.clientX >= bounds.left - 9 &&
        event.clientX <= bounds.right + 9 &&
        event.clientY >= bounds.top - 9 &&
        event.clientY <= bounds.bottom + 9
      )
        return;
      hide();
    };
    const pointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget && current?.source === "hover") hide();
    };
    const press = (event: Event) => {
      tabbing = false;
      suppressed = anchorOf(event.target);
      hide();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        tabbing = true;
        return;
      }
      if (!["Escape", "Enter", " "].includes(event.key)) return;
      tabbing = false;
      if (!current) return;
      const pass = current.anchor.dataset.tooltipEscape === "pass";
      dismiss();
      if (event.key === "Escape" && !pass) {
        // Dismiss only the tooltip, not the surrounding dialog or popover.
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const focusIn = (event: FocusEvent) => {
      const anchor = anchorOf(event.target);
      if (
        tabbing &&
        anchor &&
        anchor === event.target &&
        anchor.matches(":focus-visible")
      )
        show(anchor, "focus");
    };
    const focusOut = (event: FocusEvent) => {
      if (current?.anchor === event.target) hide();
    };
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("pointerdown", press, true);
    document.addEventListener("click", press, true);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("keydown", keyDown, true);
    window.addEventListener("blur", hide);
    window.addEventListener("fm-dialog-stack-change", hide);
    window.addEventListener("fm-tooltip-hide", hide);
    return () => {
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("pointerdown", press, true);
      document.removeEventListener("click", press, true);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("keydown", keyDown, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("fm-dialog-stack-change", hide);
      window.removeEventListener("fm-tooltip-hide", hide);
    };
  }, []);

  useLayoutEffect(() => {
    const popup = element.current;
    if (!tip || !popup) return;
    const { anchor } = tip;
    // The top layer escapes scrolling containers and dialog bodies.
    if (
      typeof popup.showPopover === "function" &&
      !popup.matches(":popover-open")
    )
      popup.showPopover();
    const described = anchor.getAttribute("aria-describedby");
    anchor.setAttribute(
      "aria-describedby",
      described ? `${described} ${id}` : id,
    );
    const hide = () => window.dispatchEvent(new Event("fm-tooltip-hide"));
    const position = () => {
      const bounds = anchor.getBoundingClientRect();
      if (
        bounds.bottom < 0 ||
        bounds.top > window.innerHeight ||
        bounds.right < 0 ||
        bounds.left > window.innerWidth
      )
        return hide();
      const size = popup.getBoundingClientRect();
      const placement = anchor.dataset.tooltipPlacement as
        TooltipPlacement | undefined;
      const next = placeTooltip(
        bounds,
        { width: size.width, height: size.height },
        {
          width: document.documentElement.clientWidth,
          height: window.innerHeight,
        },
        placement ?? "top",
      );
      popup.style.left = `${next.left}px`;
      popup.style.top = `${next.top}px`;
    };
    position();
    // "style" is not observed: positioning writes it.
    const observer = new MutationObserver(() => {
      if (!anchor.isConnected || !rendered(anchor)) return hide();
      const text = textFor(anchor);
      if (!text) return hide();
      if (text !== tip.text) setTip({ ...tip, text });
      else position();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-tooltip", "data-sidebar", "class", "hidden"],
    });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      const ids = (anchor.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .filter((value) => value && value !== id);
      if (ids.length) anchor.setAttribute("aria-describedby", ids.join(" "));
      else anchor.removeAttribute("aria-describedby");
    };
  }, [tip, id]);

  return tip
    ? createPortal(
        <div
          ref={element}
          id={id}
          role="tooltip"
          popover="manual"
          className="app-tooltip"
        >
          {tip.text}
        </div>,
        tip.host,
      )
    : null;
}
