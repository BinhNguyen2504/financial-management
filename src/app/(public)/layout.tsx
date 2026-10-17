import Link from "next/link";
import { WalletCards, ArrowUpRight } from "lucide-react";
import { PublicAccount } from "@/features/landing/account-actions";
import "@/features/landing/landing.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link
          href="/"
          className="public-brand"
          aria-label="Financial Manager — Trang giới thiệu"
        >
          <span className="public-brand-mark">
            <WalletCards size={22} aria-hidden="true" />
          </span>
          <span>
            Financial<span className="public-brand-sub">Manager</span>
          </span>
        </Link>
        <nav aria-label="Điều hướng giới thiệu" className="public-nav">
          <Link href="/#trai-nghiem">Trải nghiệm</Link>
          <Link href="/#cau-chuyen">Câu chuyện</Link>
          <Link href="/#dang-phat-trien">Đang phát triển</Link>
        </nav>
        <PublicAccount />
        <noscript>
          <style>{`.public-account { display: none; }`}</style>
          <Link href="/login" className="landing-text-link">
            Đăng nhập
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
          <p>Từ nhu cầu thật. Cho từng ngày rõ ràng hơn.</p>
        </div>
        <div>
          <a href="/#dang-phat-trien">Đang phát triển</a>
          <Link href="/overview" prefetch={false}>
            Mở không gian của bạn <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <span>Tiếng Việt · VND</span>
        </div>
      </footer>
    </div>
  );
}
