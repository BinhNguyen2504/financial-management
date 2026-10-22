"use client";
import { useI18n } from "@/i18n/provider";

import { safeReturnPath } from "@/lib/auth-return";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function BackButton() {
  const { t: tr } = useI18n();

  const router = useRouter();
  const params = useSearchParams();
  const destination =
    params.get("from") === "/" ? "/" : safeReturnPath(params.get("from"));
  return (
    <button
      type="button"
      className="expense-secondary"
      onClick={() =>
        router.push(destination === "/profile" ? "/overview" : destination)
      }
    >
      <ArrowLeft size={18} aria-hidden="true" />
      {tr("Quay lại")}
    </button>
  );
}
