import { describe, expect, it } from "vitest";
import { commandFingerprint } from "../src/application/shared/command-fingerprint";

describe("persisted command fingerprint compatibility", () => {
  // Golden hashes were generated from the pre-refactor implementation at d795ad7.
  it("retains existing fingerprints for financial strings and reordered object keys", () => {
    const action = {
      type: "setMonthly",
      categoryId: "00000000-0000-4000-8000-000000000002",
      month: "2026-10",
      amount: "999999999999999999999999",
      note: "Tết",
    };
    const expected =
      "83d716cf3fb496c0d1493d406c143e3cf3d7859e4e3a6487f6bf4486e710cf46";
    const id = "00000000-0000-4000-8000-000000000001";
    expect(commandFingerprint({ id, expectedVersion: 3, action })).toBe(
      expected,
    );
    expect(
      commandFingerprint({
        action: Object.fromEntries(Object.entries(action).reverse()),
        expectedVersion: 3,
        id,
      }),
    ).toBe(expected);
    expect(commandFingerprint({ id, expectedVersion: 4, action })).not.toBe(
      expected,
    );
  });

  it("preserves array order, nulls and the original locale-based key comparison", () => {
    expect(
      commandFingerprint({ z: [null, 0, "0"], á: "value", a: { b: 2, a: 1 } }),
    ).toBe("723b1e2e19b42effa709f7bb28e51586cec69230e624c6840b140bc35c26e6d6");
    expect(commandFingerprint([1, 2])).not.toBe(commandFingerprint([2, 1]));
  });
});
