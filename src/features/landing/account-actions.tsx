"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useUser } from "@/features/profile/user-provider";
import { UserMenu } from "@/components/user-menu";

export function PublicAccount() {
  const { user } = useUser();
  return (
    <div className="public-account">
      {user && (
        <Link
          href="/overview"
          className="landing-text-link public-enter"
          prefetch={false}
        >
          Vào ứng dụng <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      )}
      <UserMenu showSignInLabel />
    </div>
  );
}

export function StartLink({ final = false }: { final?: boolean }) {
  const { user } = useUser();
  // The application destination also works before hydration, through the server guard.
  return (
    <Link className="landing-button" href="/overview" prefetch={false}>
      {user
        ? "Vào ứng dụng"
        : final
          ? "Bắt đầu hành trình của bạn"
          : "Bắt đầu sử dụng"}
      <ArrowUpRight size={19} aria-hidden="true" />
    </Link>
  );
}
