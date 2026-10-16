import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ExpenseError } from "@/domain/expenses/engine";

export function authConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function serverAuth() {
  if (!authConfigured())
    throw new ExpenseError(
      "Đăng nhập chưa được cấu hình.",
      503,
      "NOT_CONFIGURED",
    );
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components use proxy refresh. */
          }
        },
      },
    },
  );
}
export async function authenticatedOwner(request?: Request): Promise<string> {
  if (!authConfigured())
    throw new ExpenseError(
      "Chưa kết nối dịch vụ đăng nhập và lưu trữ. Xem hướng dẫn cấu hình cloud.",
      503,
      "NOT_CONFIGURED",
    );
  const authorization = request?.headers.get("authorization");
  const client = authorization
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      )
    : await serverAuth();
  // getUser verifies the token with Auth rather than trusting a client supplied cookie/sub.
  const { data, error } = authorization
    ? await client.auth.getUser(authorization.replace(/^Bearer /i, ""))
    : await client.auth.getUser();
  if (
    error &&
    (error.name === "AuthRetryableFetchError" ||
      error.status === 429 ||
      (error.status !== undefined && error.status >= 500))
  )
    throw new ExpenseError(
      "Dịch vụ đăng nhập đang tạm gián đoạn. Nội dung đang nhập được giữ lại; hãy thử lại sau.",
      503,
      "AUTH_UNAVAILABLE",
    );
  if (error || !data.user)
    throw new ExpenseError(
      "Vui lòng đăng nhập để mở dữ liệu tài chính.",
      401,
      "UNAUTHENTICATED",
    );
  return data.user.id;
}
