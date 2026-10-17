import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import { authConfigured } from "@/server/auth";
import { incomeClock } from "@/domain/income/engine";
import { IncomeWorkspace } from "@/features/income/workspace";
import "@/features/expenses/expenses.css";
import "@/features/income/income.css";
export const metadata: Metadata = { title: "Thu nhập" };
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
