import type { Metadata } from "next";
import { ExpenseWorkspace } from "@/features/expenses/workspace";
import { authConfigured } from "@/server/auth";
export const metadata: Metadata = { title: "Chi tiêu" };
export const dynamic = "force-dynamic";
export default function BudgetsPage() {
  return (
    <ExpenseWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
    />
  );
}
