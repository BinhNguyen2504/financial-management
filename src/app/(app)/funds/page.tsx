import "@/features/expenses/expenses.css";
import "@/features/funds/funds.css";
import { FundsWorkspace } from "@/features/funds/workspace";
import { localizedMetadata } from "@/i18n/server";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Quỹ an toàn");
}
export const dynamic = "force-dynamic";
export default async function FundsPage() {
  const denied = await pageAccess("/funds");
  if (denied) return denied;
  return <FundsWorkspace />;
}
