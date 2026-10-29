"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/features/profile/user-provider";
import { safeReturnPath } from "@/lib/auth-return";
import { subscribeFinancialReset } from "@/lib/financial-reset-events";

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading, error, configured, signingOut } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { t: tr } = useI18n("settings");
  const [resetOwner, setResetOwner] = useState("");
  useEffect(() => {
    const owner = user?.id;
    return subscribeFinancialReset(owner, () => {
      if (owner) setResetOwner(owner);
    });
  }, [user?.id]);
  useEffect(() => {
    // Explicit logout owns its final navigation; expiry/cross-tab logout needs login.
    if (configured && !loading && !error && !user && !signingOut)
      router.replace(
        `/login?next=${encodeURIComponent(safeReturnPath(pathname))}`,
      );
  }, [configured, loading, error, user, pathname, router, signingOut]);
  if (configured && !loading && !error && !user) return null;
  return (
    <>
      {resetOwner && resetOwner === user?.id && (
        <div className="notice" role="status">
          <p>
            {tr(
              "Dữ liệu tài chính đã được làm trống ở tab khác. Hãy tải lại trang trước khi tiếp tục; bản nháp chưa được gửi lại.",
            )}
          </p>
          <button
            className="expense-secondary"
            onClick={() => window.location.reload()}
          >
            {tr("Tải lại trang")}
          </button>
        </div>
      )}
      {children}
    </>
  );
}
