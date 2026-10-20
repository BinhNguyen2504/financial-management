"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import "@/components/dialog-content.css";

const openDialogs = new Set<HTMLDialogElement>();
let previousOverflow = "";

function updateDialogStack() {
  const stack = [...openDialogs];
  stack.forEach((element, index) => {
    const covered = index < stack.length - 1;
    element.inert = covered;
    if (covered) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  });
}

export function ExpenseModal({
  title,
  children,
  onClose,
  busy = false,
  size = "form",
  description,
  footer,
  stableTabs = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: "form" | "detail" | "confirm" | "help";
  description?: ReactNode;
  footer?: ReactNode;
  stableTabs?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const outsidePointer = useRef(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  function finishClose() {
    if (!closingRef.current) return;
    closingRef.current = false;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onClose();
  }
  function requestClose() {
    if (busy || closingRef.current) return;
    if (
      size !== "help" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    if (dialog.current) {
      const style = getComputedStyle(dialog.current);
      dialog.current.style.setProperty(
        "--help-exit-transform",
        style.transform,
      );
      dialog.current.style.setProperty("--help-exit-opacity", style.opacity);
    }
    closingRef.current = true;
    setClosing(true);
    // Keep the native modal, focus trap and scroll lock until exit completes.
    // The fallback also releases it if animations are disabled or interrupted.
    closeTimer.current = setTimeout(finishClose, 300);
  }
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (openDialogs.size === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogs.add(element);
    element.showModal();
    updateDialogStack();
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      element.close();
      openDialogs.delete(element);
      updateDialogStack();
      if (openDialogs.size === 0)
        document.body.style.overflow = previousOverflow;
      // React may remove the dialog before its passive cleanup; restore focus explicitly.
      if (
        trigger?.isConnected &&
        trigger !== document.body &&
        !trigger.classList.contains("skip-link")
      )
        trigger.focus({ preventScroll: true });
      else {
        const parent = [...openDialogs].at(-1);
        if (parent)
          parent
            .querySelector<HTMLElement>("button:not([disabled])")
            ?.focus({ preventScroll: true });
        else document.querySelector<HTMLElement>("main")?.focus();
      }
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`expense-dialog dialog-shell dialog-${size}${stableTabs ? " dialog-stable-tabs" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={description ? `${titleId}-description` : undefined}
      data-closing={closing || undefined}
      onAnimationEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.animationName === "help-slide-out"
        )
          finishClose();
      }}
      onKeyDown={(event) => {
        if (size !== "help" || event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
          ),
        ].filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = controls[0],
          last = controls.at(-1);
        const active = document.activeElement;
        // TOC navigation focuses headings (tabIndex=-1) after the buttons.
        // Native dialog tabbing can otherwise leave the page for browser chrome.
        const beforeFirst =
          active &&
          first &&
          Boolean(
            first.compareDocumentPosition(active) &
            Node.DOCUMENT_POSITION_PRECEDING,
          );
        const afterLast =
          active &&
          last &&
          Boolean(
            last.compareDocumentPosition(active) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        const target =
          event.shiftKey && (active === first || beforeFirst)
            ? last
            : !event.shiftKey && (active === last || afterLast)
              ? first
              : null;
        if (target) {
          event.preventDefault();
          target.focus();
        }
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        outsidePointer.current =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const outside =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
        if (outsidePointer.current && outside) requestClose();
        outsidePointer.current = false;
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
    >
      <div className="expense-dialog-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && (
            <p id={`${titleId}-description`} className="dialog-description">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          className="expense-icon-button"
          aria-label="Đóng"
          disabled={busy}
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </dialog>
  );
}
