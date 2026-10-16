// Explicit destinations prevent user-provided redirect URLs from leaving the app.
export function safeReturnPath(
  value: string | null | undefined,
): "/income" | "/budgets" {
  return value === "/income" ? "/income" : "/budgets";
}
