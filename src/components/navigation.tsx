"use client";
import { StatusBadge } from "@/components/status-badge";
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
          tabIndex={0}
          onFocus={(event) => {
            const link = event.currentTarget;
            // Firefox can reveal only the first line of a wrapped navigation
            // item. After native focus scrolling, keep its status tag visible too.
            requestAnimationFrame(() => {
              if (document.activeElement === link)
                link.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                  behavior: "instant",
                });
            });
          }}
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
            <StatusBadge tone="info" size="compact" className="development-tag">
              {tr("Đang phát triển")}
            </StatusBadge>
          )}
        </Link>
      ))}
    </nav>
  );
}
