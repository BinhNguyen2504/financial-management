import { ProfileWorkspace } from "@/features/profile/workspace";
import { localizedMetadata } from "@/i18n/server";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Thông tin cá nhân");
}
export default async function ProfilePage() {
  const denied = await pageAccess("/profile");
  if (denied) return denied;
  return <ProfileWorkspace />;
}
