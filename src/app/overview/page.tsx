import { ExpenseOverview } from "@/features/expenses/overview";
import { authConfigured } from "@/server/auth";
export const dynamic = "force-dynamic";
export default function OverviewPage() {
  return (
    <ExpenseOverview
      configured={authConfigured() && Boolean(process.env.DATABASE_URL)}
    />
  );
}
