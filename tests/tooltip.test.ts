import { describe, expect, it } from "vitest";
import { placeTooltip } from "../src/components/tooltip-position";

const viewport = { width: 400, height: 300 },
  size = { width: 100, height: 30 };
const anchor = (left: number, top: number) => ({
  left,
  top,
  width: 44,
  height: 44,
});

describe("tooltip placement", () => {
  it("centres above the control by default", () => {
    expect(placeTooltip(anchor(150, 100), size, viewport, "top")).toEqual({
      left: 122,
      top: 62,
    });
  });
  it("flips when the preferred side has no room", () => {
    expect(placeTooltip(anchor(150, 10), size, viewport, "top").top).toBe(62);
    expect(placeTooltip(anchor(150, 250), size, viewport, "bottom").top).toBe(
      212,
    );
  });
  it("stays inside both horizontal edges", () => {
    expect(placeTooltip(anchor(0, 100), size, viewport, "top").left).toBe(8);
    expect(placeTooltip(anchor(356, 100), size, viewport, "top").left).toBe(
      292,
    );
  });
  it("sits beside the control, or above when the side is full", () => {
    expect(placeTooltip(anchor(20, 100), size, viewport, "right")).toEqual({
      left: 72,
      top: 107,
    });
    expect(placeTooltip(anchor(340, 100), size, viewport, "right")).toEqual({
      left: 292,
      top: 62,
    });
  });
});
