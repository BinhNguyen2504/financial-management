import type { Metadata } from "next";
import { pageAccess } from "@/server/page-auth";
import { SettingsWorkspace } from "@/features/settings/workspace";
export const metadata: Metadata = { title: "Cài đặt" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const denied = await pageAccess("/settings");
  if (denied) return denied;
  return <SettingsWorkspace />;
}
