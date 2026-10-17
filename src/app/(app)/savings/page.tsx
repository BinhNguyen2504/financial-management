import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import { authConfigured } from "@/server/auth";
import { savingsClock } from "@/domain/savings/engine";
import { SavingsWorkspace } from "@/features/savings/workspace";
import "@/features/savings/savings.css";
export const metadata: Metadata = { title: "Tiết kiệm" };
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
