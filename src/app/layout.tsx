import { serverLocale } from "@/i18n/server";
import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import { UserProvider } from "@/features/profile/user-provider";
import { PreferenceSync, preferenceScript } from "@/components/ui-preferences";
import { getSeoConfig } from "@/lib/seo";
import { pageSession } from "@/server/page-auth";
import "./globals.css";
import "@/features/expenses/expenses.css";
import "./zen.css";
import "@/features/profile/profile.css";
import "./experience.css";
import "@/components/scroll-tabs.css";
import "./visual-themes.css";
import "@/components/illustrated-heading.css";
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSeoConfig().metadataBase),
  robots: { index: false, follow: false },
  title: { default: "Financial Manager", template: "%s · Financial Manager" },
  description:
    "Quản lý thu nhập, hũ chi tiêu, tiết kiệm và đầu tư, theo nhịp của bạn.",
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
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, locale] = await Promise.all([pageSession(), serverLocale()]);
  return (
    <html
      lang={locale}
      className={nunito.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
        <PreferenceSync />
        <UserProvider
          initialUser={session.state === "authenticated" ? session.user : null}
        >
          {children}
          <PwaRegistration />
        </UserProvider>
      </body>
    </html>
  );
}
