import { ExpenseOverview } from "@/features/expenses/overview";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
export async function generateMetadata() {
  return localizedMetadata("Tổng quan");
}
export const dynamic = "force-dynamic";
export default async function OverviewPage() {
  const denied = await pageAccess("/overview");
  if (denied) return denied;
  return (
    <ExpenseOverview
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
    />
  );
}
