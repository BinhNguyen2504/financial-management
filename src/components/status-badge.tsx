import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  Info,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const icons: Record<StatusTone, LucideIcon> = {
  neutral: CircleMinus,
  info: Info,
  success: CircleCheck,
  warning: CircleAlert,
  danger: OctagonAlert,
};

/** A static label; announcements belong to the surrounding status message. */
export function StatusBadge({
  children,
  tone = "neutral",
  size = "default",
  icon,
  className = "",
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  children: ReactNode;
  tone?: StatusTone;
  size?: "default" | "compact";
  icon?: LucideIcon | false;
}) {
  const Icon = icon === false ? null : (icon ?? icons[tone]);
  return (
    <span
      {...props}
      className={`status-badge ${className}`.trim()}
      data-tone={tone}
      data-size={size}
    >
      {Icon && <Icon size={14} aria-hidden="true" />}
      <span className="status-badge-label">{children}</span>
    </span>
  );
}
