"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CloudOff } from "lucide-react";

export function AuthUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section
      className="panel auth-panel"
      aria-labelledby="auth-unavailable-title"
    >
      <CloudOff size={32} aria-hidden="true" />
      <h1 id="auth-unavailable-title">Kết nối đăng nhập đang gián đoạn</h1>
      <p className="lead">
        Chưa thể xác minh phiên đăng nhập. Hãy thử lại khi kết nối ổn định.
      </p>
      <button
        className="expense-primary"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "Đang kiểm tra…" : "Thử lại kết nối"}
      </button>
      <Link className="back-link" href="/">
        Về trang giới thiệu
      </Link>
    </section>
  );
}
