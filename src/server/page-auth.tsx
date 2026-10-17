import "server-only";
import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { authConfigured, serverAuth } from "@/server/auth";
import { AuthUnavailable } from "@/features/auth/unavailable";
import type { AppPath } from "@/lib/auth-return";

// Request-scoped verification; no user or failure is cached between requests.
export const pageSession = cache(async () => {
  if (!authConfigured()) return { state: "unconfigured" as const };
  try {
    const client = await serverAuth();
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        (error.name !== "AuthRetryableFetchError" &&
          (error.status === 400 ||
            error.status === 401 ||
            error.status === 403))
      )
        return { state: "anonymous" as const };
      return { state: "unavailable" as const };
    }
    return data.user
      ? { state: "authenticated" as const, user: data.user }
      : { state: "anonymous" as const };
  } catch (error) {
    unstable_rethrow(error);
    return { state: "unavailable" as const };
  }
});

// Each page awaits this before creating a workspace, including on RSC navigation.
export async function pageAccess(path: AppPath) {
  const session = await pageSession();
  if (session.state === "unavailable") return <AuthUnavailable />;
  if (session.state !== "authenticated")
    redirect(`/login?next=${encodeURIComponent(path)}`);
  return null;
}
