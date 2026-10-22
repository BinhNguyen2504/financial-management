"use client";
import { useI18n } from "@/i18n/provider";

import {
  focusFirstInvalid,
  FormErrorSummary,
  nativeErrors,
} from "@/components/form-feedback";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { browserAuth } from "@/lib/supabase/browser";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export function Login({
  configured,
  confirmationError = false,
  returnTo = "/overview",
}: {
  configured: boolean;
  confirmationError?: boolean;
  returnTo?: string;
}) {
  const { t: tr } = useI18n("auth");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Before hydration, native submission would navigate to /login? and lose the draft.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    confirmationError
      ? tr(
          "Liên kết đăng nhập đã hết hạn hoặc không hợp lệ. Hãy yêu cầu email mới.",
        )
      : "",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalid = nativeErrors(form);
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) {
      focusFirstInvalid(
        form,
        form.querySelector<HTMLElement>(".form-error-summary"),
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = browserAuth();
      const result = sent
        ? await client.auth.verifyOtp({ email, token, type: "email" })
        : await client.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
            },
          });
      if (result.error) throw result.error;
      if (sent) window.location.assign(returnTo);
      else {
        setSent(true);
        setMessage(
          tr(
            "Kiểm tra email để mở liên kết đăng nhập, hoặc nhập mã xác nhận nếu email có mã.",
          ),
        );
      }
    } catch {
      setError(
        tr(
          "Không thể đăng nhập. Kiểm tra email, mã xác nhận hoặc thử lại sau.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-login">
      <div className="login-story">
        <p className="landing-kicker">{tr("KHÔNG GIAN CỦA BẠN")}</p>
        <p className="login-story-title">
          {tr("Trở về với một")}
          <br />
          {tr("bức tranh rõ ràng hơn.")}
        </p>
        <p>
          {tr(
            "Theo dõi thu nhập, chăm sóc những hũ chi tiêu và nhìn lại hành trình tích lũy, theo nhịp của bạn.",
          )}
        </p>
        <Garden variant="garden" />
        <Link href="/" className="landing-text-link">
          {tr("← Về trang giới thiệu")}
        </Link>
      </div>
      <section className="panel auth-panel">
        <Garden variant="sprout" />
        <p className="eyebrow">{tr("CHÀO MỪNG BẠN")}</p>
        <h1>{tr("Đăng nhập")}</h1>
        <p className="lead">
          {tr(
            "Dữ liệu tài chính của bạn được lưu riêng và đồng bộ giữa các thiết bị.",
          )}
        </p>
        {!configured ? (
          <p className="expense-notice">
            {tr(
              "Dịch vụ đăng nhập chưa được kết nối. Cần hoàn tất cấu hình cloud để bắt đầu sử dụng.",
            )}
          </p>
        ) : (
          <form onSubmit={submit} className="expense-form" noValidate>
            <p className="required-fields-note">
              <span className="required-mark" aria-hidden="true">
                *
              </span>{" "}
              {tr("là thông tin cần nhập.")}
            </p>
            <FormErrorSummary errors={fieldErrors} prefix="login-field-" />
            <label>
              Email
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              <input
                id="login-field-email"
                name="email"
                aria-label="Email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={
                  fieldErrors.email ? "login-error-email" : undefined
                }
                type="email"
                required
                autoComplete="email"
                value={email}
                disabled={!ready || sent || busy}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((previous) => ({ ...previous, email: "" }));
                }}
              />
              {fieldErrors.email && (
                <small id="login-error-email" className="field-error">
                  {tr(fieldErrors.email)}
                </small>
              )}
            </label>
            {sent && (
              <label>
                {tr("Mã xác nhận")}
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
                <input
                  id="login-field-token"
                  name="token"
                  aria-label={tr("Mã xác nhận")}
                  aria-invalid={!!fieldErrors.token}
                  aria-describedby={
                    fieldErrors.token ? "login-error-token" : undefined
                  }
                  type="text"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={token}
                  disabled={!ready || busy}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setFieldErrors((previous) => ({ ...previous, token: "" }));
                  }}
                />
                {fieldErrors.token && (
                  <small id="login-error-token" className="field-error">
                    {tr(fieldErrors.token)}
                  </small>
                )}
              </label>
            )}
            <button
              aria-busy={busy}
              className="expense-primary"
              disabled={!ready || busy}
            >
              {busy && <LoadingSpinner />}
              {busy
                ? tr("Đang xử lý…")
                : sent
                  ? tr("Đăng nhập")
                  : tr("Gửi mã đăng nhập")}
            </button>
            {sent && (
              <button
                type="button"
                className="expense-secondary"
                disabled={!ready || busy}
                onClick={() => {
                  setSent(false);
                  setToken("");
                }}
              >
                {tr("Đổi email / gửi lại mã")}
              </button>
            )}
            {ready ? (
              <p role="status">{tr(message)}</p>
            ) : (
              <LoadingStatus>{tr("Đang mở biểu mẫu đăng nhập…")}</LoadingStatus>
            )}
            <p role="alert" className="expense-error">
              {tr(error)}
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
