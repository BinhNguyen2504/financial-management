import { describe, expect, it, vi } from "vitest";
import { CATALOG_VERSION, quotes } from "../src/features/quotes/catalog";
import {
  createQuoteSession,
  QUOTE_STORAGE_KEY,
} from "../src/features/quotes/sequence";

function memoryStorage(raw: string | null = null) {
  return {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
  };
}
function next(session: ReturnType<typeof createQuoteSession>, path: string) {
  session.visit(path);
  return session.getSnapshot()!.quote.id;
}

describe("original bilingual quote catalog", () => {
  it("contains 200 unique quotes in eight balanced topics with complete copy under 35 words", () => {
    expect(quotes).toHaveLength(200);
    expect(new Set(quotes.map((quote) => quote.id)).size).toBe(200);
    const topics = new Map<string, number>();
    for (const quote of quotes)
      topics.set(quote.topic, (topics.get(quote.topic) ?? 0) + 1);
    expect(topics.size).toBe(8);
    expect([...topics.values()]).toEqual(Array(8).fill(25));
    for (const locale of ["vi", "en"] as const) {
      expect(
        new Set(quotes.map((quote) => quote[locale].toLocaleLowerCase(locale)))
          .size,
      ).toBe(200);
      for (const quote of quotes) {
        expect(quote[locale].trim(), quote.id).not.toBe("");
        expect(
          quote[locale].trim().split(/\s+/u).length,
          `${quote.id}/${locale}`,
        ).toBeLessThanOrEqual(35);
        expect(quote[locale], quote.id).not.toMatch(
          /\p{Extended_Pictographic}/u,
        );
        expect(quote[locale], quote.id).not.toMatch(/<[^>]*>/u);
      }
    }
  });
});

describe("quote sequence", () => {
  it("renders an empty stable server snapshot and does not access browser state before a visit", () => {
    const storage = vi.fn(() => {
      throw new Error("server");
    });
    const random = vi.fn(() => 0.5);
    const session = createQuoteSession({ storage, random });
    expect(session.getServerSnapshot()).toBeNull();
    expect(session.getSnapshot()).toBeNull();
    expect(storage).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });
  it("uses each quote once per round and avoids repeats at every round boundary", () => {
    const storage = memoryStorage();
    const session = createQuoteSession({
      storage: () => storage,
      random: () => 0,
    });
    let previous = "";
    for (let round = 0; round < 4; round++) {
      const seen = new Set<string>();
      for (let index = 0; index < 200; index++) {
        const id = next(session, `/${round}/${index}`);
        expect(id).not.toBe(previous);
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        previous = id;
      }
      expect(seen.size).toBe(200);
    }
  });
  it("continues the round across full document reloads even when the pathname stays the same", () => {
    const storage = memoryStorage();
    const seen = new Set<string>();
    for (let index = 0; index < 200; index++) {
      const session = createQuoteSession({ storage: () => storage });
      const id = next(session, "/income");
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(JSON.parse(storage.getItem()!).remaining).toEqual([]);
  });
  it("is idempotent for repeat effects and emits exactly once for each route change", () => {
    const storage = memoryStorage();
    const session = createQuoteSession({ storage: () => storage });
    const notify = vi.fn();
    const unsubscribe = session.subscribe(notify);
    const first = next(session, "/income");
    const snapshot = session.getSnapshot();
    for (let i = 0; i < 5; i++) expect(next(session, "/income")).toBe(first);
    expect(session.getSnapshot()).toBe(snapshot);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(next(session, "/budgets")).not.toBe(first);
    expect(next(session, "/income")).not.toBe(first);
    expect(notify).toHaveBeenCalledTimes(3);
    unsubscribe();
    next(session, "/savings");
    expect(notify).toHaveBeenCalledTimes(3);
  });
  it("resumes from the latest tab storage when an older document returns from bfcache", () => {
    const storage = memoryStorage();
    const options = { storage: () => storage, random: () => 0 };
    const firstDocument = createQuoteSession(options);
    const a = next(firstDocument, "/income");
    const otherDocument = createQuoteSession(options);
    const b = next(otherDocument, "/budgets");
    firstDocument.visit("/income", true);
    const c = firstDocument.getSnapshot()!.quote.id;
    expect(new Set([a, b, c]).size).toBe(3);
    expect(JSON.parse(storage.getItem()!).remaining).toHaveLength(197);
  });
  it.each([
    "{",
    "null",
    "[]",
    '{"remaining":"wrong"}',
    JSON.stringify({
      version: CATALOG_VERSION,
      lastId: "calm-01",
      remaining: ["missing"],
    }),
    JSON.stringify({
      version: CATALOG_VERSION,
      lastId: "calm-01",
      remaining: ["joy-01", "joy-01"],
    }),
    JSON.stringify({
      version: CATALOG_VERSION,
      lastId: "calm-01",
      remaining: ["calm-01"],
    }),
    JSON.stringify({
      version: "old",
      lastId: "calm-01",
      remaining: ["joy-01"],
    }),
  ])(
    "recovers a valid sequence from malformed or obsolete storage: %s",
    (raw) => {
      const storage = memoryStorage(raw);
      const session = createQuoteSession({ storage: () => storage });
      const id = next(session, "/income");
      expect(quotes.some((quote) => quote.id === id)).toBe(true);
      const saved = JSON.parse(storage.getItem()!);
      expect(saved.version).toBe(CATALOG_VERSION);
      expect(saved.remaining).toHaveLength(199);
      expect(storage.setItem).toHaveBeenCalledWith(
        QUOTE_STORAGE_KEY,
        expect.any(String),
      );
    },
  );
  it("keeps a complete round in memory when browser storage throws on reads and writes", () => {
    const session = createQuoteSession({
      storage: () => {
        throw new Error("blocked");
      },
    });
    const seen = new Set<string>();
    for (let index = 0; index < 200; index++) {
      if (index % 2) {
        session.visit(`/${index - 1}`, true);
        seen.add(session.getSnapshot()!.quote.id);
      } else seen.add(next(session, `/${index}`));
    }
    expect(seen.size).toBe(200);
  });
});
