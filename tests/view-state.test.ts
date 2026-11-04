import { describe, expect, it } from "vitest";
import { SessionViewStore, validViewValue } from "../src/lib/view-state";

describe("display context in a browser session", () => {
  it("keeps owners and workspaces separate and survives recreating the reader", () => {
    const values = new Map<string, string>();
    const storage = () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    });
    const first = new SessionViewStore(storage);
    first.write("owner-a:income:month", 10);
    const next = new SessionViewStore(storage);
    const valid = (value: unknown) =>
      typeof value === "number" && value >= 1 && value <= 12;
    expect(next.read("owner-a:income:month", 11, valid)).toBe(10);
    expect(next.read("owner-b:income:month", 11, valid)).toBe(11);
    expect(next.read("owner-a:savings:month", 11, valid)).toBe(11);
  });

  it("retains a display filter when reads or writes are blocked", () => {
    const store = new SessionViewStore(() => {
      throw new Error("Storage blocked");
    });
    store.write("view", { from: "2026-01-01", to: "2026-10-31" });
    const initial = { from: "2026-01-01", to: "2026-11-04" };
    expect(
      store.read("view", initial, (value) => validViewValue(value, initial)),
    ).toEqual({ from: "2026-01-01", to: "2026-10-31" });
  });

  it("falls back on corrupt or unsupported values without breaking the screen", () => {
    for (const raw of [
      "{",
      '"2026-02-30"',
      '"2026-13-01"',
      "null",
      "{}",
      "7",
      "x".repeat(5000),
    ]) {
      const store = new SessionViewStore(() => ({
        getItem: () => raw,
        setItem: () => {},
      }));
      expect(
        store.read("date", "2026-11-04", (value) =>
          validViewValue(value, "2026-11-04"),
        ),
      ).toBe("2026-11-04");
    }
  });

  it("returns a stable object until the stored value changes", () => {
    const store = new SessionViewStore(() => {
      throw new Error("Storage blocked");
    });
    store.write("filter", { from: "2026-01-01", to: "2026-10-01" });
    const initial = { from: "2026-01-01", to: "2026-11-04" };
    const valid = (v: unknown) => validViewValue(v, initial);
    const before = store.read("filter", initial, valid);
    expect(store.read("filter", initial, valid)).toBe(before);
    store.write("filter", { ...initial });
    expect(store.read("filter", initial, valid)).not.toBe(before);
  });
});
