"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/i18n/provider";

export function ActionOptions({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    const fit = () => {
      const menu = body.current,
        anchor = root.current;
      if (!menu || !anchor) return;
      menu.style.removeProperty("left");
      menu.style.removeProperty("right");
      if (getComputedStyle(menu).position !== "absolute") return;
      const width = menu.getBoundingClientRect().width;
      const bounds = anchor.getBoundingClientRect();
      const left = Math.max(
        20,
        Math.min(
          bounds.right - width,
          document.documentElement.clientWidth - width - 20,
        ),
      );
      menu.style.left = `${left - bounds.left}px`;
      menu.style.right = "auto";
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (root.current) observer.observe(root.current);
    if (body.current) observer.observe(body.current);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [open, locale]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent | FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className="action-options"
      data-expanded={open}
      data-focus-return
    >
      <button
        type="button"
        ref={trigger}
        data-focus-return-target
        className="expense-secondary action-options-trigger"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("Thao tác khác")}
      </button>
      <div ref={body} id={id} className="action-options-body">
        {children}
      </div>
    </div>
  );
}
