"use client";
import { Clock3 } from "lucide-react";
import { useI18n } from "@/i18n/provider";

import { navigationModules as navigationModulesSource } from "@/features/catalog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "./module-icon";

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { t: tr, config: localize } = useI18n();

  const pathname = usePathname();
  const items = localize(navigationModulesSource);
  const link = (item: (typeof items)[number]) => (
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
          event.currentTarget.closest(".mobile-menu")?.removeAttribute("open");
      }}
    >
      <ModuleIcon name={item.icon} />
      <span className="navigation-name">{item.title}</span>
    </Link>
  );
  const group = (slugs: string[], label?: string) => (
    <div className="navigation-group">
      {label && <span className="navigation-group-label">{tr(label)}</span>}
      {slugs
        .map((slug) => items.find((item) => item.slug === slug))
        .map((item) => (item ? link(item) : null))}
    </div>
  );
  return (
    <nav
      className="navigation"
      aria-label={
        mobile ? tr("Điều hướng trên điện thoại") : tr("Điều hướng chính")
      }
    >
      {group(["overview"])}
      {group(["budgets", "income"], "Thu nhập & Chi tiêu")}
      {group(["savings", "investments", "funds", "goals"], "Tích lũy")}
      {group(["reports", "settings"])}
      <details
        className="navigation-planned"
        open={items.some(
          (item) => item.status === "planned" && pathname === `/${item.slug}`,
        )}
      >
        <summary
          aria-label={tr("Đang phát triển")}
          title={tr("Đang phát triển")}
        >
          <Clock3 size={18} aria-hidden="true" />
          <span>{tr("Đang phát triển")}</span>
        </summary>
        {items.filter((item) => item.status === "planned").map(link)}
      </details>
    </nav>
  );
}
