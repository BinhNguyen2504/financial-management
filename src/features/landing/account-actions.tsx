"use client";
import { LanguagePicker } from "@/i18n/language-picker";
import { useI18n } from "@/i18n/provider";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useUser } from "@/features/profile/user-provider";
import { UserMenu } from "@/components/user-menu";

export function PublicAccount() {
  const { user } = useUser();
  const { t: tr } = useI18n("landing");
  return (
    <div className="public-account">
      <LanguagePicker compact />
      {user && (
        <Link
          href="/overview"
          className="landing-text-link public-enter"
          prefetch={false}
        >
          {tr("Vào ứng dụng")} <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      )}
      <UserMenu showSignInLabel />
    </div>
  );
}

export function StartLink({ final = false }: { final?: boolean }) {
  const { user } = useUser();
  const { t: tr } = useI18n("landing");
  // The application destination also works before hydration, through the server guard.
  return (
    <Link className="landing-button" href="/overview" prefetch={false}>
      {tr(
        user
          ? "Vào ứng dụng"
          : final
            ? "Bắt đầu hành trình của bạn"
            : "Bắt đầu sử dụng",
      )}
      <ArrowUpRight size={19} aria-hidden="true" />
    </Link>
  );
}
