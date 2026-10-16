import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { PrivacyProvider, PrivacyToggle } from "@/components/privacy";
import { WalletCards, Menu } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
import "@/features/expenses/expenses.css";
import "./zen.css";
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: { default: "Financial Manager", template: "%s · Financial Manager" },
  description: "Quản lý thu nhập, hũ chi tiêu theo tháng và báo cáo trong năm.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Financial Manager",
  },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EB" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2520" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body>
        <PrivacyProvider>
          <a className="skip-link" href="#main">
            Đến nội dung chính
          </a>
          <aside className="sidebar">
            <Link href="/overview" className="brand">
              <span className="brand-icon">
                <WalletCards size={23} aria-hidden="true" />
              </span>
              <span>
                Financial<span className="brand-sub">Manager</span>
              </span>
            </Link>
            <p className="nav-label">KHÔNG GIAN CÁ NHÂN</p>
            <Navigation />
            <div className="sidebar-note">
              <span className="status-dot" />
              Từng bước vun đắp<p>Một chút mỗi ngày, theo nhịp của bạn.</p>
            </div>
          </aside>
          <div className="app-body">
            <header className="topbar">
              <Link href="/overview" className="mobile-brand">
                Financial Manager
              </Link>
              <span className="desktop-label">Tài chính cá nhân</span>
              <PrivacyToggle />
              <details className="mobile-menu">
                <summary>
                  <Menu size={19} aria-hidden="true" /> Menu
                </summary>
                <Navigation mobile />
              </details>
            </header>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer className="footer">
              <span>Thiết kế cho điện thoại & máy tính</span>
              <span>VND · Giờ Việt Nam</span>
            </footer>
          </div>
          <PwaRegistration />
        </PrivacyProvider>
      </body>
    </html>
  );
}
