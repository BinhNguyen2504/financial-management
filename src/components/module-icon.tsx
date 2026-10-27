import {
  ArrowLeftRight,
  Banknote,
  ChartNoAxesCombined,
  CircleHelp,
  Gauge,
  Landmark,
  ListChecks,
  PiggyBank,
  Settings2,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import type { ModuleIcon as IconName } from "@/features/catalog";

const icons = {
  overview: Gauge,
  income: Banknote,
  transactions: ArrowLeftRight,
  Banknote,
  budgets: ListChecks,
  accounts: Wallet,
  savings: PiggyBank,
  investments: ChartNoAxesCombined,
  funds: ShieldCheck,
  goals: Target,
  reports: Landmark,
  settings: Settings2,
};

export function ModuleIcon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const Icon = icons[name] ?? CircleHelp;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
