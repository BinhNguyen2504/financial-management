import { describe, expect, it } from "vitest";
import { nameKey, nameTaken } from "../src/domain/shared/names";

describe("name comparison", () => {
  it("ignores case, outer and repeated spaces but keeps diacritics", () => {
    expect(nameKey("  LƯƠNG   công ty ")).toBe(nameKey("lương công ty"));
    expect(nameKey("Luong")).not.toBe(nameKey("Lương"));
  });
  it("treats composed and decomposed Vietnamese letters as the same name", () => {
    expect(nameKey("Lướng")).toBe(nameKey("Lướng"));
  });
  it("matches against a list and skips missing entries", () => {
    expect(nameTaken("Lương", [undefined, null, "lương"])).toBe(true);
    expect(nameTaken("Lương", [undefined, "Tiền nhà"])).toBe(false);
    expect(nameTaken("Lương", [])).toBe(false);
  });
});
