import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import { ProfileWorkspace } from "@/features/profile/workspace";

export const metadata: Metadata = { title: "Thông tin cá nhân" };
export default async function ProfilePage() {
  const denied = await pageAccess("/profile");
  if (denied) return denied;
  return <ProfileWorkspace />;
}
