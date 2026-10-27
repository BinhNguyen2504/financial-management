import { isDeepStrictEqual } from "node:util";

// Compare against the snapshot read inside the same locked transaction. Keep
// all domain history in memory, but avoid sending unchanged records to Postgres.
export function changedRecords<T>(
  before: readonly T[] | undefined,
  after: readonly T[],
  key: (record: T) => string | number,
): T[] {
  const existing = new Map(before?.map((record) => [key(record), record]));
  return after.filter(
    (record) => !isDeepStrictEqual(existing.get(key(record)), record),
  );
}
