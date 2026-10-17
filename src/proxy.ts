import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Public HTML contains no account data. Verify the avatar in the browser so an
  // Auth outage cannot hold the landing document behind a network request.
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/opengraph-image"))
    return response;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  // Native bearer clients are verified by the API handler, not by a cookie refresh.
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    request.headers.get("authorization")
  )
    return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  try {
    await supabase.auth.getUser();
  } catch {
    // Pages and API handlers distinguish temporary Auth failures from missing sessions.
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw\\.js|offline\\.html|manifest\\.webmanifest|favicon\\.ico).*)",
  ],
};
