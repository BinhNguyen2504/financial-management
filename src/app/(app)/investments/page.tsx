import type { Metadata } from "next";
import { pageAccess } from "@/server/page-auth";
import { authConfigured } from "@/server/auth";
import { investmentClock } from "@/domain/investments/engine";
import { InvestmentWorkspace } from "@/features/investments/workspace";
import "@/features/investments/investments.css";
export const metadata: Metadata = { title: "Đầu tư" };
export const dynamic = "force-dynamic";
export default async function InvestmentsPage() {
  const denied = await pageAccess("/investments");
  if (denied) return denied;
  return (
    <InvestmentWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
      initialToday={investmentClock().today}
    />
  );
}
