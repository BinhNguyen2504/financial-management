import { savingsClock } from "@/domain/savings/engine";
import "@/features/savings/savings.css";
import { SavingsWorkspace } from "@/features/savings/workspace";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Tiết kiệm");
}
export const dynamic = "force-dynamic";
export default async function SavingsPage() {
  const denied = await pageAccess("/savings");
  if (denied) return denied;
  return (
    <SavingsWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
      initialToday={savingsClock().today}
    />
  );
}
