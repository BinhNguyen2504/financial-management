"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/auth-return";

export function BackButton() {
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
      Quay lại
    </button>
  );
}
