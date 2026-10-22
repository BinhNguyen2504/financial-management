"use client";
import { useI18n } from "@/i18n/provider";

import { navigationModules as navigationModulesSource } from "@/features/catalog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "./module-icon";

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { t: tr, config: localize } = useI18n();

  const pathname = usePathname();
  return (
    <nav
      aria-label={
        mobile ? tr("Điều hướng trên điện thoại") : tr("Điều hướng chính")
      }
      className="navigation"
    >
      {localize(navigationModulesSource).map((item) => (
        <Link
          key={item.slug}
          href={`/${item.slug}`}
          aria-label={`${item.title}${item.status === "planned" ? tr(" · Đang phát triển") : ""}`}
          title={`${item.title}${item.status === "planned" ? tr(" · Đang phát triển") : ""}`}
          aria-current={pathname === `/${item.slug}` ? "page" : undefined}
          onClick={(event) => {
            if (mobile)
              event.currentTarget.closest("details")?.removeAttribute("open");
          }}
        >
          <ModuleIcon name={item.icon} />
          <span className="navigation-name">{item.title}</span>
          {item.status === "planned" && (
            <span className="development-tag">{tr("Đang phát triển")}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
