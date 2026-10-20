import { applyAction } from "./engine";
import type { FundBook, LivingSource } from "./types";
import { fundIds } from "./schema";
import { vietnamClock } from "../expenses/engine";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function normalized(book: FundBook) {
  return {
    ...book,
    funds: [...book.funds].sort(),
    audit: book.audit.map((a) => ({ ...a, at: new Date(a.at).toISOString() })),
    configurations: book.configurations.map((c) => ({
      ...c,
      at: new Date(c.at).toISOString(),
    })),
    locations: [...book.locations].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
/** Rebuild every immutable action so a forged balance/configuration cannot be restored. */
export function validateFundBook(book: FundBook) {
  if (
    book.funds.length !== 3 ||
    new Set(book.funds).size !== 3 ||
    fundIds.some((id) => !book.funds.includes(id))
  )
    throw new Error("Missing funds");
  let replayed: FundBook | null = null;
  for (const audit of book.audit) {
    if (audit.version !== (replayed?.version ?? 0) + 1)
      throw new Error("Invalid history version");
    const configuration = book.configurations.find(
      (c) => c.sequence === audit.version,
    );
    const living =
      configuration?.living ?? replayed?.configurations.at(-1)?.living;
    const source: LivingSource = {
      expenseVersion: living?.expenseVersion ?? 0,
      month: living?.month ?? "2000-01",
      items: living?.items ?? [],
    };
    replayed = applyAction(
      replayed,
      audit.action,
      source,
      vietnamClock(new Date(audit.at)),
    );
  }
  if (
    !replayed ||
    canonical(normalized(replayed)) !== canonical(normalized(book))
  ) {
    function path(a: unknown, b: unknown, p = "book"): string {
      if (canonical(a) === canonical(b)) return "";
      if (a && b && typeof a === "object" && typeof b === "object") {
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
          const found = path(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
            p + "." + key,
          );
          if (found) return found;
        }
      }
      return p;
    }
    throw new Error(
      "Fund history mismatch at " +
        (replayed ? path(normalized(replayed), normalized(book)) : "book"),
    );
  }
}
