"use client";

import { Menu } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Navigation } from "./navigation";

export function MobileNavigation() {
  const { t: tr } = useI18n();
  const root = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const id = useId();
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const close = () => {
      element.open = false;
      trigger.current?.setAttribute("aria-expanded", "false");
    };
    close();
    const outside = (event: PointerEvent) => {
      if (!element.contains(event.target as Node)) close();
    };
    const focusOutside = (event: FocusEvent) => {
      if (!element.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        !element.open ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      close();
      trigger.current?.focus({ preventScroll: true });
    };
    const desktop = window.matchMedia("(min-width: 960px)");
    const resized = () => {
      if (desktop.matches) close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener("keydown", escape);
    desktop.addEventListener("change", resized);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusOutside);
      document.removeEventListener("keydown", escape);
      desktop.removeEventListener("change", resized);
    };
  }, [pathname]);
  return (
    <details
      ref={root}
      className="mobile-menu"
      onToggle={(event) => {
        trigger.current?.setAttribute(
          "aria-expanded",
          String(event.currentTarget.open),
        );
      }}
    >
      <summary
        ref={trigger}
        aria-label={tr("Menu chức năng")}
        aria-expanded="false"
        aria-controls={id}
      >
        <Menu size={19} aria-hidden="true" /> Menu
      </summary>
      <div id={id}>
        <Navigation mobile />
      </div>
    </details>
  );
}
