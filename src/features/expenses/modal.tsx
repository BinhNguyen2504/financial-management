"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: "form" | "detail" | "confirm";
  description?: ReactNode;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const outsidePointer = useRef(false);
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
      className={`expense-dialog dialog-shell dialog-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? `${titleId}-description` : undefined}
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
        if (outsidePointer.current && outside && !busy) onClose();
        outsidePointer.current = false;
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
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
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </dialog>
  );
}
