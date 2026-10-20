"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationModules } from "@/features/catalog";
import { ModuleIcon } from "./module-icon";

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Điều hướng trên điện thoại" : "Điều hướng chính"}
      className="navigation"
    >
      {navigationModules.map((item) => (
        <Link
          key={item.slug}
          href={`/${item.slug}`}
          aria-label={`${item.title}${item.status === "planned" ? " · Đang phát triển" : ""}`}
          title={`${item.title}${item.status === "planned" ? " · Đang phát triển" : ""}`}
          aria-current={pathname === `/${item.slug}` ? "page" : undefined}
          onClick={(event) => {
            if (mobile)
              event.currentTarget.closest("details")?.removeAttribute("open");
          }}
        >
          <ModuleIcon name={item.icon} />
          <span className="navigation-name">{item.title}</span>
          {item.status === "planned" && (
            <span className="development-tag">Đang phát triển</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
