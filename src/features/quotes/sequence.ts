import { CATALOG_VERSION, quotes, type Quote } from "./catalog";

export const QUOTE_STORAGE_KEY = "fm-quote-sequence";
type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
type Sequence = { version: string; remaining: string[]; lastId: string | null };
type Snapshot = { pathname: string; quote: Quote } | null;
const byId = new Map(quotes.map((quote) => [quote.id, quote]));

function restore(raw: string | null): Sequence {
  const empty: Sequence = {
    version: CATALOG_VERSION,
    remaining: [],
    lastId: null,
  };
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return empty;
    const saved = value as Partial<Sequence>;
    const lastId =
      typeof saved.lastId === "string" && byId.has(saved.lastId)
        ? saved.lastId
        : null;
    if (
      saved.version === CATALOG_VERSION &&
      lastId &&
      Array.isArray(saved.remaining) &&
      saved.remaining.length < quotes.length &&
      saved.remaining.every(
        (id) => typeof id === "string" && byId.has(id) && id !== lastId,
      ) &&
      new Set(saved.remaining).size === saved.remaining.length
    )
      return {
        version: CATALOG_VERSION,
        remaining: [...saved.remaining],
        lastId,
      };
    // A changed catalog starts a fresh round but can still avoid the previous quote.
    return { ...empty, lastId };
  } catch {
    return empty;
  }
}

/** One controller per mounted app shell; browser storage is accessed only on a visit. */
export function createQuoteSession({
  storage = () => window.sessionStorage,
  random = Math.random,
}: { storage?: () => Storage; random?: () => number } = {}) {
  let sequence: Sequence | undefined;
  let snapshot: Snapshot = null;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): Snapshot => null,
    visit(pathname: string, restoredDocument = false) {
      if (snapshot?.pathname === pathname && !restoredDocument) return;
      // Another document may have advanced the tab's deck while this one was cached.
      if (!sequence || restoredDocument) {
        try {
          sequence = restore(storage().getItem(QUOTE_STORAGE_KEY));
        } catch {
          // Keep the existing document's progress even when bfcache restores blocked storage.
          sequence ??= restore(null);
        }
      }
      if (!sequence.remaining.length) {
        const ids = quotes.map(({ id }) => id);
        for (let index = ids.length - 1; index > 0; index--) {
          const other = Math.floor(random() * (index + 1));
          [ids[index], ids[other]] = [ids[other], ids[index]];
        }
        // Consume from the end. Keep the boundary between rounds different, too.
        if (ids.at(-1) === sequence.lastId) {
          [ids[0], ids[ids.length - 1]] = [ids[ids.length - 1], ids[0]];
        }
        sequence.remaining = ids;
      }
      const id = sequence.remaining.pop()!;
      sequence.lastId = id;
      try {
        storage().setItem(QUOTE_STORAGE_KEY, JSON.stringify(sequence));
      } catch {
        /* Memory still advances. */
      }
      snapshot = { pathname, quote: byId.get(id)! };
      listeners.forEach((listener) => listener());
    },
  };
}
