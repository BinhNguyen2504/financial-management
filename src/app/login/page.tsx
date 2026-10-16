import type { Metadata } from "next";
import { Login } from "@/features/auth/login";
import { safeReturnPath } from "@/lib/auth-return";
import { authConfigured } from "@/server/auth";
export const metadata: Metadata = { title: "Đăng nhập" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  return (
    <Login
      configured={authConfigured()}
      confirmationError={query.error === "confirmation"}
      returnTo={safeReturnPath(query.next)}
    />
  );
}
