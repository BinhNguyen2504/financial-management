"use client";
import { AppLogo } from "@/components/app-logo";
import { PublicAccount } from "@/features/landing/account-actions";
import { PublicShell } from "@/features/landing/landing-audience";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export function PublicChrome({
  children,
  member,
}: {
  children: React.ReactNode;
  member: boolean;
}) {
  const { t: tr, locale } = useI18n("landing");
  return (
    <PublicShell>
      <a className="skip-link" href="#main">
        {tr("Đến nội dung chính")}
      </a>
      <header className="public-header">
        <Link
          href="/"
          className="public-brand"
          aria-label={tr("Financial Manager — Trang giới thiệu")}
        >
          <span className="public-brand-mark">
            <AppLogo size={26} />
          </span>
          <span>
            Financial<span className="public-brand-sub">Manager</span>
          </span>
        </Link>
        <nav aria-label={tr("Điều hướng giới thiệu")} className="public-nav">
          <Link href="/#trai-nghiem">{tr("Trải nghiệm")}</Link>
          <Link href="/#cau-chuyen">{tr("Câu chuyện")}</Link>
          <Link href="/#dang-phat-trien">{tr("Đang phát triển")}</Link>
        </nav>
        <PublicAccount />
        <noscript>
          <style>{`.public-account { display: none; }`}</style>
          <Link
            href={member ? "/profile" : "/login"}
            className="landing-text-link"
          >
            {member ? "Thông tin cá nhân" : "Đăng nhập"}
          </Link>
        </noscript>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="public-footer">
        <div>
          <Link className="public-footer-brand" href="/">
            Financial Manager
          </Link>
          <p>{tr("Từ nhu cầu thật. Cho từng ngày rõ ràng hơn.")}</p>
          <p>{tr("Quản lý tài chính trên web và thiết bị di động.")}</p>
        </div>
        <div>
          <a href="/#dang-phat-trien">{tr("Đang phát triển")}</a>
          <Link href="/overview" prefetch={false}>
            {tr("Mở không gian của bạn")}{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <span>
            © 2026 Bình Nguyễn · {locale === "vi" ? "Tiếng Việt" : "English"} ·
            VND
          </span>
        </div>
      </footer>
    </PublicShell>
  );
}
