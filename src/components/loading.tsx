import type { ReactNode } from "react";

/** Decorative: the adjacent text supplies the accessible loading message. */
export function LoadingSpinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
}

export function LoadingStatus({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`loading-status ${className}`}
      role="status"
      aria-atomic="true"
    >
      <LoadingSpinner />
      <span>{children}</span>
    </p>
  );
}
