import type { Metadata } from "next";
import Link from "next/link";
import { WalletCards, Menu } from "lucide-react";
import { SidebarToggle } from "@/components/ui-preferences";
import { Navigation } from "@/components/navigation";
import { PrivacyProvider, PrivacyToggle } from "@/components/privacy";
import { UserMenu } from "@/components/user-menu";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { HelpProvider } from "@/features/help/provider";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <PrivacyProvider>
        <SessionBoundary>
          <HelpProvider>
            <aside className="sidebar" id="app-sidebar">
              <Link href="/" className="brand">
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
                <SidebarToggle />
                <Link href="/" className="mobile-brand">
                  Financial Manager
                </Link>
                <span className="desktop-label">
                  <WalletCards size={22} aria-hidden="true" />
                  Tài chính cá nhân
                </span>
                <PrivacyToggle />
                <UserMenu />
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
                <span>Quản lý tài chính trên web và thiết bị di động</span>
                <span>© 2026 Bình Nguyễn · VND · Giờ Việt Nam</span>
              </footer>
            </div>
          </HelpProvider>
        </SessionBoundary>
      </PrivacyProvider>
    </div>
  );
}
