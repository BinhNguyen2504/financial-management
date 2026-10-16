import { NextResponse } from "next/server";
import { serverAuth } from "@/server/auth";
import { safeReturnPath } from "@/lib/auth-return";
import { publicOrigin } from "@/server/request-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const auth = await serverAuth();
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(new URL(returnTo, publicOrigin(request)), {
          headers: { "Cache-Control": "private, no-store" },
        });
    } catch {
      // Expired links, unavailable Auth and missing setup return to a usable login page.
    }
  }
  return NextResponse.redirect(
    new URL(
      `/login?error=confirmation&next=${encodeURIComponent(returnTo)}`,
      publicOrigin(request),
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
