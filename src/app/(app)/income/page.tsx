import { incomeClock } from "@/domain/income/engine";
import "@/features/expenses/expenses.css";
import "@/features/income/income.css";
import { IncomeWorkspace } from "@/features/income/workspace";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Thu nhập");
}
export const dynamic = "force-dynamic";
export default async function IncomePage() {
  const denied = await pageAccess("/income");
  if (denied) return denied;
  return (
    <IncomeWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
      initialToday={incomeClock().today}
    />
  );
}
