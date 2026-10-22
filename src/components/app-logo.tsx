import type { SVGProps } from "react";

/** One original mark for every visual theme; no account or theme data enters its geometry. */
export function AppLogo({
  size = 26,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="20.5" cy="7" r="4.5" />
      <path d="M20.5 5.5v3M8 12h16M10 12v3c-3 2-4 4.5-4 7.5C6 27 9 29 16 29s10-2 10-6.5c0-3-1-5.5-4-7.5v-3M12 20h8M12 24h5" />
    </svg>
  );
}
