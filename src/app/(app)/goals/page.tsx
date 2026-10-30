import "@/features/expenses/expenses.css";
import "@/features/goals/goals.css";
import { GoalsWorkspace } from "@/features/goals/workspace";
import { localizedMetadata } from "@/i18n/server";
import { pageAccess } from "@/server/page-auth";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return localizedMetadata("Mục tiêu");
}
export default async function GoalsPage() {
  const denied = await pageAccess("/goals");
  if (denied) return denied;
  return <GoalsWorkspace />;
}
