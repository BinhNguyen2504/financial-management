import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="friendly-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {children && <div className="expense-actions">{children}</div>}
    </div>
  );
}
