import { redirect } from "next/navigation";
import { pageSession } from "@/server/page-auth";
import { AuthUnavailable } from "@/features/auth/unavailable";
import type { Metadata } from "next";
import { Login } from "@/features/auth/login";
import { safeReturnPath } from "@/lib/auth-return";
import { authConfigured } from "@/server/auth";
import { LocaleProvider } from "@/i18n/provider";
import { serverLocaleState } from "@/i18n/server";
export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const session = await pageSession();
  if (session.state === "authenticated") redirect(safeReturnPath(query.next));
  if (session.state === "unavailable") return <AuthUnavailable />;
  const { locale, hasCookie } = await serverLocaleState();
  return (
    <LocaleProvider initialLocale={locale} hasLocaleCookie={hasCookie}>
      <Login
        configured={authConfigured()}
        confirmationError={query.error === "confirmation"}
        returnTo={safeReturnPath(query.next)}
      />
    </LocaleProvider>
  );
}
