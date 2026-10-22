import { SettingsWorkspace } from "@/features/settings/workspace";
import { localizedMetadata } from "@/i18n/server";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Cài đặt");
}
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const denied = await pageAccess("/settings");
  if (denied) return denied;
  return <SettingsWorkspace />;
}
