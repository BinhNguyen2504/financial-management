import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import { ExpenseWorkspace } from "@/features/expenses/workspace";
import { authConfigured } from "@/server/auth";
export const metadata: Metadata = { title: "Chi tiêu" };
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
