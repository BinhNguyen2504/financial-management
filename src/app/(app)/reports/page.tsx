import { ReportsWorkspace } from "@/features/reports/workspace";
import { localizedMetadata } from "@/i18n/server";
import { authConfigured } from "@/server/auth";
import { pageAccess } from "@/server/page-auth";
import "@/features/expenses/expenses.css";
import "@/features/savings/savings.css";

export async function generateMetadata() {
  return localizedMetadata("Báo cáo");
}
export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  const denied = await pageAccess("/reports");
  if (denied) return denied;
  return (
    <ReportsWorkspace
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
    />
  );
}
