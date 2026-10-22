"use client";
import { useI18n } from "@/i18n/provider";

import { CloudOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AuthUnavailable() {
  const { t: tr } = useI18n("auth");

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section
      className="panel auth-panel"
      aria-labelledby="auth-unavailable-title"
    >
      <CloudOff size={32} aria-hidden="true" />
      <h1 id="auth-unavailable-title">
        {tr("Kết nối đăng nhập đang gián đoạn")}
      </h1>
      <p className="lead">
        {tr(
          "Chưa thể xác minh phiên đăng nhập. Hãy thử lại khi kết nối ổn định.",
        )}
      </p>
      <button
        className="expense-primary"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? tr("Đang kiểm tra…") : tr("Thử lại kết nối")}
      </button>
      <Link className="back-link" href="/">
        {tr("Về trang giới thiệu")}
      </Link>
    </section>
  );
}
