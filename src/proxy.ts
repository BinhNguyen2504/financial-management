import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Crawler resources are session-independent. The homepage stays public, but
  // refresh its cookies before server rendering the matching guest/member UI.
  if (
    ["/robots.txt", "/sitemap.xml"].includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/opengraph-image")
  )
    return response;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  // Financial handlers verify Auth and may refresh cookies themselves. Pages
  // still refresh here before server rendering their verified account UI.
  if (
    request.nextUrl.pathname.startsWith("/api/v1/") ||
    (request.nextUrl.pathname.startsWith("/api/") &&
      request.headers.get("authorization"))
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
