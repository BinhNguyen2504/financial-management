import type { Metadata } from "next";
import { pageAccess } from "@/server/page-auth";
import { FundsWorkspace } from "@/features/funds/workspace";
import "@/features/expenses/expenses.css";
import "@/features/funds/funds.css";
export const metadata: Metadata = { title: "Quỹ an toàn" };
export const dynamic = "force-dynamic";
export default async function FundsPage() {
  const denied = await pageAccess("/funds");
  if (denied) return denied;
  return <FundsWorkspace />;
}
