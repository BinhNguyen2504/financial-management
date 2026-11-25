/**
 * Key for "the same name": ignores case and extra spaces, keeps diacritics
 * ("Lương" and "Luong" are different names). New duplicate checks use this;
 * older per-module label checks keep their own comparison on purpose.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

/** True when `name` matches one of the existing names; undefined entries are skipped. */
export function nameTaken(
  name: string,
  existing: Iterable<string | null | undefined>,
): boolean {
  const key = nameKey(name);
  for (const other of existing)
    if (other != null && nameKey(other) === key) return true;
  return false;
}
