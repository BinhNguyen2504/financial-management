import { pageAccess } from "@/server/page-auth";
import { ExpenseOverview } from "@/features/expenses/overview";
import { authConfigured } from "@/server/auth";
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
