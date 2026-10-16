"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { modules } from "@/features/catalog";
import { ModuleIcon } from "./module-icon";

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label={mobile ? "Điều hướng trên điện thoại" : "Điều hướng chính"} className="navigation">
    {modules.map((item) => <Link key={item.slug} href={`/${item.slug}`}
      aria-current={pathname === `/${item.slug}` ? "page" : undefined}
      onClick={(event) => { if (mobile) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
      <ModuleIcon name={item.icon} /><span>{item.title}</span>
    </Link>)}
  </nav>;
}
