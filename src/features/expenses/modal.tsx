"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function ExpenseModal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      // React may remove the dialog before its passive cleanup; restore focus explicitly.
      if (
        trigger?.isConnected &&
        trigger !== document.body &&
        !trigger.classList.contains("skip-link")
      )
        trigger.focus();
      else document.querySelector<HTMLElement>("main")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="expense-dialog"
      aria-labelledby="expense-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="expense-dialog-heading">
        <h2 id="expense-dialog-title">{title}</h2>
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
      {children}
    </dialog>
  );
}
