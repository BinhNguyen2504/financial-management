import { modules } from "@/features/catalog";
import { PlannedWorkspace } from "@/features/planned-workspace";
import { localizedMetadata } from "@/i18n/server";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return modules
    .filter(
      (m) =>
        ![
          "overview",
          "budgets",
          "income",
          "savings",
          "investments",
          "funds",
          "goals",
          "settings",
        ].includes(m.slug),
    )
    .map((m) => ({ module: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module: slug } = await params;
  return localizedMetadata(
    modules.find((m) => m.slug === slug)?.title ?? "Không tìm thấy",
  );
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const item = modules.find((m) => m.slug === slug);
  if (!item || item.slug === "overview") notFound();
  const denied = await pageAccess(`/${item.slug}`);
  if (denied) return denied;
  return <PlannedWorkspace item={item} />;
}
