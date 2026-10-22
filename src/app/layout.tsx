import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import { UserProvider } from "@/features/profile/user-provider";
import { PreferenceSync, preferenceScript } from "@/components/ui-preferences";
import "./globals.css";
import "@/features/expenses/expenses.css";
import "./zen.css";
import "@/features/profile/profile.css";
import "./experience.css";
import "@/components/scroll-tabs.css";
import "./visual-themes.css";
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://localhost:3000"),
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={nunito.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
        <PreferenceSync />
        <UserProvider>
          <a className="skip-link" href="#main">
            Đến nội dung chính
          </a>
          {children}
          <PwaRegistration />
        </UserProvider>
      </body>
    </html>
  );
}
