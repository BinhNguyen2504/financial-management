import { describe, expect, it } from "vitest";
import {
  initials,
  profileFields,
  profileSchema,
} from "../src/features/profile/fields";

describe("profile data", () => {
  it("accepts optional fields and trims names without copying identity claims", () => {
    expect(
      profileSchema.parse({
        full_name: "  Nguyễn Bình  ",
        birth_date: "",
        gender: "",
        role: "admin",
      }),
    ).toEqual({ full_name: "Nguyễn Bình", birth_date: "", gender: "" });
  });
  it("rejects invalid and future dates and empty names", () => {
    for (const birth_date of [
      "2025-02-29",
      "2000-02-30",
      "2099-01-01",
      "1899-12-31",
      "not-a-date",
    ])
      expect(
        profileSchema.safeParse({
          full_name: "Bình",
          birth_date,
          gender: "male",
        }).success,
      ).toBe(false);
    expect(
      profileSchema.safeParse({
        full_name: " ",
        birth_date: "2000-02-29",
        gender: "",
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        full_name: "Bình",
        birth_date: "2000-02-29",
        gender: "prefer_not_to_say",
      }).success,
    ).toBe(true);
  });
  it("handles absent and third party metadata and Vietnamese initials", () => {
    expect(
      profileFields({
        name: "Nguyễn Văn Bình",
        birth_date: 42,
        gender: "unexpected",
      }),
    ).toEqual({ full_name: "Nguyễn Văn Bình", birth_date: "", gender: "" });
    expect(initials("Nguyễn Văn Bình")).toBe("VB");
    expect(initials("")).toBe("B");
  });
});
