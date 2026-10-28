"use client";
import { RequiredFieldsNote } from "@/components/required-fields-note";
import { useI18n } from "@/i18n/provider";

import {
  focusFirstInvalid,
  FormErrorSummary,
  nativeErrors,
} from "@/components/form-feedback";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { browserAuth } from "@/lib/supabase/browser";
import { OtpInput, emptyOtp, OTP_LENGTH } from "./otp-input";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function Login({
  configured,
  confirmationError = false,
  returnTo = "/overview",
}: {
  configured: boolean;
  confirmationError?: boolean;
  returnTo?: string;
}) {
  const { t: tr, locale } = useI18n("auth");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(emptyOtp);
  const token = digits.join("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const tokenInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  // UX cooldown only; Supabase remains responsible for enforcing rate limits.
  const sendAfter = useRef(new Map<string, number>());
  const [now, setNow] = useState(0);
  const emailKey = email.trim().toLowerCase();
  const wait = Math.max(
    0,
    // eslint-disable-next-line react-hooks/refs -- The cooldown map is updated by events and rendered by the existing clock state.
    Math.ceil(((sendAfter.current.get(emailKey) ?? 0) - now) / 1000),
  );
  // Before hydration, native submission would navigate to /login? and lose the draft.
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep native submission disabled until hydration has attached the form handlers.
  useEffect(() => setReady(true), []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (ready && !busy) {
      if (sent) tokenInput.current?.focus();
      else emailInput.current?.focus();
    }
  }, [ready, sent, busy]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    confirmationError
      ? "Liên kết đăng nhập đã hết hạn hoặc không hợp lệ. Hãy yêu cầu email mới."
      : "",
  );
  async function authenticate(
    action: "send" | "verify",
    completedToken = token,
  ) {
    if (pending.current) return;
    const address = email.trim();
    const key = address.toLowerCase();
    if (action === "send" && (sendAfter.current.get(key) ?? 0) > Date.now())
      return;
    pending.current = true;
    setBusy(true);
    setFieldErrors({});
    setError("");
    setMessage("");
    try {
      const client = browserAuth();
      if (action === "verify") {
        const { data, error: failure } = await client.auth.verifyOtp({
          email: address,
          token: completedToken,
          type: "email",
        });
        if (failure) throw failure;
        if (!data.session?.access_token || !data.user) {
          setError("Chưa thể xác nhận phiên đăng nhập. Hãy thử lại.");
          return;
        }
        window.location.assign(returnTo);
      } else {
        // The Supabase email templates must contain {{ .Token }} instead of a link.
        // Keep the existing account-creation policy (the SDK/server default).
        const { error: failure } = await client.auth.signInWithOtp({
          email: address,
        });
        if (failure) throw failure;
        const timestamp = Date.now();
        sendAfter.current.set(key, timestamp + 60_000);
        setNow(timestamp);
        setEmail(address);
        setDigits(emptyOtp());
        setSent(true);
        setMessage(
          "Mã đăng nhập đã được gửi. Kiểm tra cả thư mục Spam nếu chưa thấy email.",
        );
      }
    } catch (failure) {
      const code =
        failure && typeof failure === "object" && "code" in failure
          ? failure.code
          : undefined;
      const status =
        failure && typeof failure === "object" && "status" in failure
          ? failure.status
          : undefined;
      if (
        status === 429 ||
        code === "over_email_send_rate_limit" ||
        code === "over_request_rate_limit"
      ) {
        if (action === "send") {
          const timestamp = Date.now();
          sendAfter.current.set(key, timestamp + 60_000);
          setNow(timestamp);
        }
        setError("Bạn đã thử quá nhiều lần. Hãy chờ một lát rồi thử lại.");
      } else if (
        action === "verify" &&
        (code === "otp_expired" || code === "access_denied")
      ) {
        setFieldErrors({
          token:
            "Mã không đúng, đã hết hạn hoặc đã được sử dụng. Kiểm tra mã hoặc yêu cầu mã mới.",
        });
      } else if (
        !navigator.onLine ||
        !status ||
        (typeof status === "number" && status >= 500)
      ) {
        setError(
          "Không thể kết nối dịch vụ đăng nhập. Kiểm tra kết nối và thử lại.",
        );
      } else {
        setError(
          action === "send"
            ? "Chưa thể gửi mã đăng nhập. Kiểm tra email hoặc thử lại sau."
            : "Chưa thể xác nhận phiên đăng nhập. Hãy thử lại.",
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalid = nativeErrors(form, locale);
    if (sent && (token.length !== OTP_LENGTH || !/^[0-9]+$/.test(token)))
      invalid.token = "Nhập đủ 8 chữ số của mã đăng nhập.";
    setError("");
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) {
      focusFirstInvalid(
        form,
        form.querySelector<HTMLElement>(".form-error-summary"),
      );
      return;
    }
    await authenticate(sent ? "verify" : "send");
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
        <p>{tr("Nhận mã đăng nhập gồm 8 chữ số qua email.")}</p>
        <p className="lead">
          {tr(
            "Dữ liệu tài chính của bạn được lưu riêng và đồng bộ giữa các thiết bị.",
          )}
        </p>
        {!configured ? (
          <p className="expense-notice">
            {tr("Đăng nhập hiện chưa sẵn sàng. Vui lòng thử lại sau.")}
          </p>
        ) : (
          <form onSubmit={submit} className="expense-form" noValidate>
            <RequiredFieldsNote />
            <FormErrorSummary errors={fieldErrors} prefix="login-field-" />
            <label>
              Email
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              <input
                ref={emailInput}
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
              <div className="login-code-field">
                <label htmlFor="login-field-token" id="login-token-label">
                  {tr("Mã xác nhận")}
                  <span className="required-mark" aria-hidden="true">
                    *
                  </span>
                </label>
                <OtpInput
                  firstInputRef={tokenInput}
                  value={digits}
                  disabled={!ready || busy}
                  invalid={!!fieldErrors.token}
                  onChange={(next) => {
                    setDigits(next);
                    setError("");
                    setFieldErrors((previous) => ({ ...previous, token: "" }));
                  }}
                  onComplete={(code) => void authenticate("verify", code)}
                />
                <small id="login-token-hint">
                  {tr(
                    "Nhập mã trong email gửi tới {email}. Mã dùng một lần, có hiệu lực 30 phút.",
                    { email },
                  )}
                </small>
                <small id="login-token-auto">
                  {tr("Nhập đủ 8 số hoặc dán mã để tự động đăng nhập.")}
                </small>
                {fieldErrors.token && (
                  <small id="login-error-token" className="field-error">
                    {tr(fieldErrors.token)}
                  </small>
                )}
              </div>
            )}
            <button
              aria-busy={busy}
              className="expense-primary"
              disabled={!ready || busy || (!sent && wait > 0)}
            >
              {busy && <LoadingSpinner />}
              {busy
                ? tr("Đang xử lý…")
                : sent
                  ? tr("Đăng nhập")
                  : wait > 0
                    ? tr("Gửi lại sau {seconds} giây", { seconds: wait })
                    : tr("Gửi mã đăng nhập")}
            </button>
            {sent && (
              <>
                <button
                  type="button"
                  className="expense-secondary"
                  disabled={!ready || busy || wait > 0}
                  onClick={() => void authenticate("send")}
                >
                  {wait > 0
                    ? tr("Gửi lại sau {seconds} giây", { seconds: wait })
                    : tr("Gửi lại mã")}
                </button>
                <button
                  type="button"
                  className="expense-secondary"
                  disabled={!ready || busy}
                  onClick={() => {
                    setSent(false);
                    setDigits(emptyOtp());
                    setMessage("");
                    setError("");
                    setFieldErrors({});
                  }}
                >
                  {tr("Đổi email")}
                </button>
              </>
            )}
            {ready ? (
              <p role="status">{tr(message)}</p>
            ) : (
              <LoadingStatus>{tr("Đang mở biểu mẫu đăng nhập…")}</LoadingStatus>
            )}
            {error && (
              <p role="alert" className="expense-error">
                {tr(error)}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
