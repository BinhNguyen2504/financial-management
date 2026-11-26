import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  HandCoins,
  History,
  PackagePlus,
  Scale,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { StatusTone } from "@/components/status-badge";
import type { InvestmentTransaction } from "@/domain/investments/schema";

/**
 * Journal identity per type. The icon and the type name carry the meaning;
 * colour only groups. Red stays reserved for destructive and error states.
 */
export const activityStyles: Record<
  InvestmentTransaction["kind"],
  { Icon: LucideIcon; tone: StatusTone }
> = {
  openingCash: { Icon: History, tone: "neutral" },
  openingInvestment: { Icon: PackagePlus, tone: "neutral" },
  deposit: { Icon: ArrowDownToLine, tone: "success" },
  withdraw: { Icon: ArrowUpFromLine, tone: "warning" },
  transfer: { Icon: ArrowLeftRight, tone: "neutral" },
  buy: { Icon: ShoppingCart, tone: "info" },
  // The chip uses the theme accent (investments.css); the badge stays neutral.
  sell: { Icon: HandCoins, tone: "neutral" },
  valuation: { Icon: Scale, tone: "neutral" },
};
