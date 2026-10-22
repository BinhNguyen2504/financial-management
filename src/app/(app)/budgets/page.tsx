import { ExpenseWorkspace } from "@/features/expenses/workspace";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Chi tiêu");
}
export const dynamic = "force-dynamic";
export default async function BudgetsPage() {
  const denied = await pageAccess("/budgets");
  if (denied) return denied;
  return (
    <ExpenseWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
    />
  );
}
