import { createHash } from "node:crypto";

// Preserve the original command ordering. Backup fingerprints use a different
// comparator and deliberately do not share this implementation.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function commandFingerprint(command: unknown): string {
  return createHash("sha256").update(canonical(command)).digest("hex");
}
