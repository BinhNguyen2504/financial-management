"use client";
import { AppLogo } from "@/components/app-logo";
import { useI18n } from "@/i18n/provider";

import { Navigation } from "@/components/navigation";
import { MobileNavigation } from "@/components/mobile-navigation";
import { PrivacyProvider, PrivacyToggle } from "@/components/privacy";
import { ThemeText } from "@/components/theme-decoration";
import { ToastProvider } from "@/components/toast";
import { SidebarToggle } from "@/components/ui-preferences";
import { UserMenu } from "@/components/user-menu";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { HelpProvider } from "@/features/help/provider";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t: tr } = useI18n();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {tr("Đến nội dung chính")}
      </a>
      <PrivacyProvider>
        <SessionBoundary>
          <ToastProvider>
            <HelpProvider>
              <aside className="sidebar" id="app-sidebar">
                <div className="sidebar-header">
                  <Link href="/" className="brand">
                    <span className="brand-icon">
                      <AppLogo size={27} />
                    </span>
                    <span>
                      Financial<span className="brand-sub">Manager</span>
                    </span>
                  </Link>
                </div>
                <p className="nav-label">{tr("KHÔNG GIAN CÁ NHÂN")}</p>
                <Navigation />
                <div className="sidebar-note">
                  <span className="status-dot" />
                  <ThemeText name="storyNote" />
                  <p>{tr("Một chút mỗi ngày, theo nhịp của bạn.")}</p>
                </div>
              </aside>
              <SidebarToggle />
              <div className="app-body">
                <header className="topbar">
                  <Link href="/" className="mobile-brand">
                    <span className="brand-icon">
                      <AppLogo size={24} />
                    </span>
                    <span>
                      Financial
                      <span className="mobile-brand-sub"> Manager</span>
                    </span>
                  </Link>
                  <span className="desktop-label">
                    <AppLogo size={26} />
                    {tr("Tài chính cá nhân")}
                  </span>
                  <PrivacyToggle />
                  <UserMenu />
                  <MobileNavigation />
                </header>
                <main id="main" tabIndex={-1}>
                  {children}
                </main>
                <footer className="footer">
                  <span>
                    {tr("Quản lý tài chính trên web và thiết bị di động")}
                  </span>
                  <span>{tr("© 2026 Bình Nguyễn · VND · Giờ Việt Nam")}</span>
                </footer>
              </div>
            </HelpProvider>
          </ToastProvider>
        </SessionBoundary>
      </PrivacyProvider>
    </div>
  );
}
