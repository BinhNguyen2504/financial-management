import { PublicChrome } from "@/features/landing/public-chrome";
import { LocaleProvider } from "@/i18n/provider";
import { serverLocaleState } from "@/i18n/server";
import { ToastProvider } from "@/components/toast";
import { pageSession } from "@/server/page-auth";
import "@/features/landing/landing.css";
import "@/features/landing/marketing.css";
import "@/features/landing/mobile-preview.css";
import "@/features/landing/faq.css";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { locale, hasCookie }] = await Promise.all([
    pageSession(),
    serverLocaleState(),
  ]);
  return (
    <LocaleProvider initialLocale={locale} hasLocaleCookie={hasCookie}>
      <ToastProvider>
        <PublicChrome member={session.state === "authenticated"}>
          {children}
        </PublicChrome>
      </ToastProvider>
    </LocaleProvider>
  );
}
