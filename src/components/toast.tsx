"use client";
import { useI18n } from "@/i18n/provider";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type ToastKind = "success" | "error" | "warning";
type Toast = { id: number; kind: ToastKind; message: string };
const ToastContext = createContext<{
  show: (kind: ToastKind, message: string) => void;
  activeDialog: HTMLDialogElement | null;
  toast: Toast | null;
  dismiss: () => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeDialog, setActiveDialog] = useState<HTMLDialogElement | null>(
    null,
  );
  const nextId = useRef(0);
  useEffect(() => {
    const sync = () =>
      setActiveDialog(
        document.querySelector<HTMLDialogElement>("dialog[open]:not([inert])"),
      );
    window.addEventListener("fm-dialog-stack-change", sync);
    sync();
    return () => window.removeEventListener("fm-dialog-stack-change", sync);
  }, []);
  useEffect(() => {
    if (!toast || toast.kind !== "success") return;
    const timer = window.setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);
  const value = {
    show: (kind: ToastKind, message: string) =>
      setToast({ id: ++nextId.current, kind, message }),
    activeDialog,
    toast,
    dismiss: () => setToast(null),
  };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("ToastProvider is missing");
  return context.show;
}

export function ToastViewport({
  dialogRef,
}: {
  dialogRef?: RefObject<HTMLDialogElement | null>;
}) {
  const { t: tr } = useI18n();

  const context = useContext(ToastContext);
  if (
    !context?.toast ||
    (dialogRef
      ? context.activeDialog !== dialogRef.current
      : !!context.activeDialog)
  )
    return null;
  const { toast, dismiss } = context;
  const Icon =
    toast.kind === "success"
      ? CheckCircle2
      : toast.kind === "error"
        ? AlertCircle
        : Info;
  return (
    <div
      className={`toast-viewport${dialogRef ? " toast-viewport--dialog" : ""}`}
    >
      <div
        className={`app-toast app-toast--${toast.kind}`}
        role={toast.kind === "error" ? "alert" : "status"}
        data-toast-kind={toast.kind}
      >
        <Icon size={20} aria-hidden="true" />
        <span>{tr(toast.message)}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={tr("Đóng thông báo")}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
