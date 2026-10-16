import type { Metadata } from "next";
import { authConfigured } from "@/server/auth";
import { incomeClock } from "@/domain/income/engine";
import { IncomeWorkspace } from "@/features/income/workspace";
import "@/features/expenses/expenses.css";
import "@/features/income/income.css";
export const metadata: Metadata = { title: "Thu nhập" };
export const dynamic = "force-dynamic";
export default function IncomePage() {
  return (
    <IncomeWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
      initialToday={incomeClock().today}
    />
  );
}
