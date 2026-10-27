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
  pause: (source: "pointer" | "focus", paused: boolean) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
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
    if (!toast || toast.kind !== "success" || hovered || focused) return;
    const timer = window.setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [toast, hovered, focused]);
  useEffect(() => {
    // A toast moves between viewports when the native dialog stack changes.
    setHovered(false);
    setFocused(false);
  }, [activeDialog]);
  const value = {
    show: (kind: ToastKind, message: string) => {
      setHovered(false);
      setFocused(false);
      setToast({ id: ++nextId.current, kind, message });
    },
    activeDialog,
    toast,
    dismiss: () => setToast(null),
    pause: (source: "pointer" | "focus", paused: boolean) => {
      (source === "pointer" ? setHovered : setFocused)(paused);
    },
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
  const { toast, dismiss, pause } = context;
  const Icon =
    toast.kind === "success"
      ? CheckCircle2
      : toast.kind === "error"
        ? AlertCircle
        : Info;
  const title =
    toast.kind === "success"
      ? "Thành công"
      : toast.kind === "error"
        ? "Chưa thể hoàn tất"
        : "Cần kiểm tra";
  return (
    <div
      className={`toast-viewport${dialogRef ? " toast-viewport--dialog" : ""}`}
    >
      <div
        key={toast.id}
        className={`app-toast app-toast--${toast.kind}`}
        role={toast.kind === "error" ? "alert" : "status"}
        aria-atomic="true"
        data-toast-kind={toast.kind}
        onMouseEnter={() => pause("pointer", true)}
        onMouseLeave={() => pause("pointer", false)}
        onFocus={() => pause("focus", true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            pause("focus", false);
        }}
      >
        <Icon className="app-toast-icon" size={22} aria-hidden="true" />
        <div className="app-toast-content">
          <strong className="app-toast-title">{tr(title)}</strong>
          <p className="app-toast-message">{tr(toast.message)}</p>
        </div>
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
