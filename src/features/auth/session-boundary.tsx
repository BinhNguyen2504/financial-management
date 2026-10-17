"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/features/profile/user-provider";
import { safeReturnPath } from "@/lib/auth-return";

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading, error, configured, signingOut } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // Explicit logout owns its final navigation; expiry/cross-tab logout needs login.
    if (configured && !loading && !error && !user && !signingOut)
      router.replace(
        `/login?next=${encodeURIComponent(safeReturnPath(pathname))}`,
      );
  }, [configured, loading, error, user, pathname, router, signingOut]);
  if (configured && !loading && !error && !user) return null;
  return <>{children}</>;
}
