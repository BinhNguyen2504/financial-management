import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import { UserProvider } from "@/features/profile/user-provider";
import "./globals.css";
import "@/features/expenses/expenses.css";
import "./zen.css";
import "@/features/profile/profile.css";
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://localhost:3000"),
  title: { default: "Financial Manager", template: "%s · Financial Manager" },
  description: "Quản lý thu nhập, hũ chi tiêu và tiết kiệm, theo nhịp của bạn.",
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
