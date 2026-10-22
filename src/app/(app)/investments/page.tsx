import { investmentClock } from "@/domain/investments/engine";
import "@/features/investments/investments.css";
import { InvestmentWorkspace } from "@/features/investments/workspace";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata("Đầu tư");
}
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
