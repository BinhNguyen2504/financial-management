import { modules } from "@/features/catalog";

export type AppPath = `/${(typeof modules)[number]["slug"]}` | "/profile";
const destinations = new Set<string>([
  ...modules.map((item) => `/${item.slug}`),
  "/profile",
]);

// Exact paths only: no external URLs, nested redirects or callback/login loops.
export function safeReturnPath(value: string | null | undefined): AppPath {
  return value && destinations.has(value) ? (value as AppPath) : "/overview";
}
