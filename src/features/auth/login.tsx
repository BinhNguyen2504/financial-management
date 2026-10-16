"use client";
import { useState, type FormEvent } from "react";
import { Garden } from "@/components/garden";
import { browserAuth } from "@/lib/supabase/browser";

export function Login({
  configured,
  confirmationError = false,
  returnTo = "/budgets",
}: {
  configured: boolean;
  confirmationError?: boolean;
  returnTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    confirmationError
      ? "Liên kết đăng nhập đã hết hạn hoặc không hợp lệ. Hãy yêu cầu email mới."
      : "",
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
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
          "Kiểm tra email để mở liên kết đăng nhập, hoặc nhập mã xác nhận nếu email có mã.",
        );
      }
    } catch {
      setError(
        "Không thể đăng nhập. Kiểm tra email, mã xác nhận hoặc thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel auth-panel">
      <Garden variant="sprout" />
      <p className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</p>
      <h1>Đăng nhập</h1>
      <p className="lead">
        Dữ liệu tài chính của bạn được lưu riêng và đồng bộ giữa các thiết bị.
      </p>
      {!configured ? (
        <p className="expense-notice">
          Dịch vụ đăng nhập chưa được kết nối. Cần hoàn tất cấu hình cloud để
          bắt đầu sử dụng.
        </p>
      ) : (
        <form onSubmit={submit} className="expense-form">
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              disabled={sent || busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {sent && (
            <label>
              Mã xác nhận
              <input
                type="text"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
          )}
          <button className="expense-primary" disabled={busy}>
            {busy ? "Đang xử lý…" : sent ? "Đăng nhập" : "Gửi mã đăng nhập"}
          </button>
          {sent && (
            <button
              type="button"
              className="expense-secondary"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setToken("");
              }}
            >
              Đổi email / gửi lại mã
            </button>
          )}
          <p role="status">{message}</p>
          <p role="alert" className="expense-error">
            {error}
          </p>
        </form>
      )}
    </section>
  );
}
