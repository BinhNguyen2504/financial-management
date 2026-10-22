"use client";
import { useI18n } from "@/i18n/provider";

import { LoadingSpinner } from "@/components/loading";

import { focusPointerControl } from "@/components/pointer-focus";
import { initials, profileFields } from "@/features/profile/fields";
import { useUser } from "@/features/profile/user-provider";
import { browserAuth } from "@/lib/supabase/browser";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function UserMenu({
  showSignInLabel = false,
}: {
  showSignInLabel?: boolean;
}) {
  const { t: tr } = useI18n();

  const pathname = usePathname();
  const { user, loading, error, reload, setSigningOut } = useUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  async function signOut() {
    setSigningOut(true);
    setBusy(true);
    setLogoutError("");
    try {
      const client = browserAuth();
      const { error } = await client.auth.signOut();
      if (error) {
        // Auth may clear the local session even when remote revocation fails.
        // Leave financial screens as soon as that session has been removed.
        const { data } = await client.auth.getSession();
        if (data.session) throw error;
      }
      window.location.replace("/");
    } catch {
      setSigningOut(false);
      setLogoutError(tr("Chưa thể đăng xuất. Kiểm tra kết nối và thử lại."));
      setBusy(false);
    }
  }
  if (loading)
    return (
      <span
        className="user-avatar user-loading"
        role="status"
        aria-label={tr("Đang tải thông tin cá nhân")}
      >
        <LoadingSpinner />
      </span>
    );
  if (error)
    return (
      <button
        className="user-trigger"
        aria-label={tr("Thử tải thông tin cá nhân")}
        title={tr(error)}
        onClick={() => void reload()}
      >
        <UserRound size={19} aria-hidden="true" />
      </button>
    );
  if (!user)
    return (
      <Link
        href="/login"
        className="user-trigger"
        aria-label={
          showSignInLabel ? tr("Đăng nhập") : tr("Đăng nhập tài khoản")
        }
        title={tr("Đăng nhập")}
      >
        <UserRound size={19} aria-hidden="true" />
        {showSignInLabel && <span>{tr("Đăng nhập")}</span>}
      </Link>
    );
  const name = profileFields(user.user_metadata).full_name || tr("Bạn");
  return (
    <div
      className="user-menu"
      onMouseDownCapture={focusPointerControl}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="user-trigger"
        aria-label={tr("Tài khoản của {0}", { 0: name })}
        aria-expanded={open}
        aria-controls={id}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          document.querySelector(".mobile-menu")?.removeAttribute("open");
          setOpen(true);
          requestAnimationFrame(() =>
            root.current?.querySelector("a")?.focus(),
          );
        }}
        onClick={() => {
          if (!open)
            document.querySelector(".mobile-menu")?.removeAttribute("open");
          setOpen(!open);
        }}
      >
        <span className="user-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="user-trigger-name">{name}</span>
        <ChevronDown size={15} aria-hidden="true" className="user-chevron" />
      </button>
      {open && (
        <div id={id} className="user-popover">
          <div className="user-identity">
            <strong>{name}</strong>
            <span>{user.email}</span>
          </div>
          <Link
            href={`/profile?from=${encodeURIComponent(pathname)}`}
            onClick={() => setOpen(false)}
          >
            <UserRound size={18} aria-hidden="true" />
            {tr("Thông tin cá nhân")}
          </Link>
          <div className="user-logout">
            <button
              aria-busy={busy}
              disabled={busy}
              onClick={() => void signOut()}
            >
              {busy ? (
                <LoadingSpinner />
              ) : (
                <LogOut size={18} aria-hidden="true" />
              )}
              {busy ? tr("Đang đăng xuất…") : tr("Đăng xuất")}
            </button>
          </div>
          {logoutError && (
            <p role="alert" className="expense-error">
              {tr(logoutError)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
