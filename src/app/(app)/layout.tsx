import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/i18n/provider";
import { serverLocaleState } from "@/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, hasCookie } = await serverLocaleState();
  return (
    <LocaleProvider initialLocale={locale} hasLocaleCookie={hasCookie}>
      <AppShell>{children}</AppShell>
    </LocaleProvider>
  );
}
