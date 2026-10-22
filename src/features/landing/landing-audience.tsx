"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/features/profile/user-provider";

// Public content only: workspace access remains enforced by the server pages.
// Render marketing in the initial HTML so / stays readable without Auth or JS.
export function LandingAudience({
  marketing,
  children,
}: {
  marketing: ReactNode;
  children: ReactNode;
}) {
  const { user } = useUser();
  return user ? children : marketing;
}

export function PublicShell({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const marketing = pathname === "/" && !user;
  return (
    <div
      className={`public-shell${marketing ? " marketing-shell" : ""}`}
      data-landing-audience={
        pathname === "/" ? (user ? "member" : "guest") : undefined
      }
    >
      {children}
    </div>
  );
}
