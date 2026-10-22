import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EarthScene } from "../src/components/earth-scene";
import { preferenceScript } from "../src/components/ui-preferences";
import {
  displayMode,
  visualTheme,
  visualThemeKeys,
  visualThemes,
} from "../src/components/visual-theme";
import { EarthProgressScene } from "../src/features/funds/earth-progress-scene";
import { FireProgressScene } from "../src/features/funds/fire-progress-scene";
import { ProgressScene } from "../src/features/funds/progress-scene";
import { WaterProgressScene } from "../src/features/funds/water-progress-scene";

describe("visual theme compatibility and bootstrap", () => {
  it("keeps existing display preferences and defaults unknown values safely", () => {
    for (const value of [null, "red", "", "WATER"])
      expect(visualTheme(value)).toBe("forest");
    for (const key of visualThemeKeys) expect(visualTheme(key)).toBe(key);
    expect(displayMode("dark")).toBe("dark");
    expect(displayMode("light")).toBe("light");
    expect(displayMode("invalid")).toBe("system");
    expect(Object.keys(visualThemes)).toEqual(visualThemeKeys);
  });
  it("applies independent preferences before hydration and tolerates blocked storage", () => {
    for (const visual of [...visualThemeKeys, "invalid"])
      for (const mode of ["light", "dark", "system", "invalid"]) {
        const dataset: Record<string, string> = {};
        const values: Record<string, string> = {
          "fm-visual-theme": visual,
          "fm-theme": mode,
          "fm-sidebar": "collapsed",
        };
        vm.runInNewContext(preferenceScript, {
          document: { documentElement: { dataset } },
          localStorage: { getItem: (key: string) => values[key] },
        });
        expect(dataset.visualTheme).toBe(visualTheme(visual));
        expect(dataset.theme).toBe(
          mode === "dark" || mode === "light" ? mode : undefined,
        );
        expect(dataset.sidebar).toBe("collapsed");
      }
    expect(() =>
      vm.runInNewContext(preferenceScript, {
        document: { documentElement: { dataset: {} } },
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
        },
      }),
    ).not.toThrow();
  });
  it("keeps offline identity copy aligned with the application", () => {
    const offline = readFileSync("public/offline.html", "utf8").replace(
      /\s+/g,
      " ",
    );
    for (const theme of Object.values(visualThemes)) {
      expect(offline).toContain(theme.copy.offline);
      expect(offline).toContain(theme.browserColors.light);
      expect(offline).toContain(theme.browserColors.dark);
    }
  });
});

describe("water fund progress", () => {
  it("starts empty and advances each scene toward its visible goal without reversing", () => {
    const heights: number[] = [],
      roofWidths: number[] = [],
      boatPositions: number[] = [];
    for (const p of [0, 0.24, 0.25, 0.5, 0.75, 1]) {
      const reservoir = renderToStaticMarkup(
        createElement(WaterProgressScene, { fund: "emergency", progress: p }),
      );
      heights.push(
        Number(
          reservoir.match(/data-water-level=""[^>]*height="([^"]+)"/)?.[1],
        ),
      );
      const shelter = renderToStaticMarkup(
        createElement(WaterProgressScene, { fund: "rainy_day", progress: p }),
      );
      roofWidths.push(
        Number(shelter.match(/data-water-shelter=""[^>]*scale\(([^ ]+)/)?.[1]),
      );
      const boat = renderToStaticMarkup(
        createElement(WaterProgressScene, { fund: "sinking", progress: p }),
      );
      boatPositions.push(
        Number(boat.match(/data-water-boat=""[^>]*translate\(([^ ]+)/)?.[1]),
      );
    }
    for (const values of [heights, roofWidths, boatPositions]) {
      expect(values.every(Number.isFinite)).toBe(true);
      for (let index = 1; index < values.length; index++)
        expect(values[index]).toBeGreaterThan(values[index - 1]);
    }
    expect(heights[0]).toBe(0);
    expect(heights.at(-1)).toBeGreaterThan(100);
    expect(heights.at(-1)).toBeLessThan(230);
    expect(roofWidths[0]).toBeGreaterThan(0);
    expect(roofWidths.at(-1)).toBe(1);
    // At completion the boat reaches the pier on the right of the 360px scene.
    expect(boatPositions[0]).toBeLessThan(90);
    expect(boatPositions.at(-1)).toBeGreaterThan(260);
    expect(boatPositions.at(-1)).toBeLessThan(330);
  });
});

describe("gold fund progress", () => {
  it("keeps milestones, overflow bounds and distinct accumulating scenes", () => {
    for (const fund of ["emergency", "rainy_day", "sinking"] as const) {
      let previous = "";
      for (const [percent, stage] of [
        ["0", 0],
        ["24.99", 1],
        ["25", 2],
        ["50", 3],
        ["75", 4],
        ["100", 5],
      ] as const) {
        const markup = renderToStaticMarkup(
          createElement(ProgressScene, { fund, percent }),
        );
        expect(markup).toContain(`data-stage="${stage}"`);
        const gold = markup
          .split('<g data-visual-only="gold">')[1]
          .split('<g data-visual-only="fire">')[0];
        expect(gold).not.toBe(previous);
        expect(gold).not.toMatch(/NaN|Infinity/);
        if (percent === "0") {
          if (fund === "emergency") expect(gold).toContain("scale(1 0)");
          if (fund === "rainy_day") expect(gold).toContain("scale(0)");
          if (fund === "sinking")
            expect(gold).toMatch(/data-gold-chest-level=""[^>]*height="0"/);
        }
        previous = gold;
      }
      const complete = renderToStaticMarkup(
        createElement(ProgressScene, { fund, percent: "100" }),
      );
      for (const percent of ["125", "999999999999999999999999999999"]) {
        expect(
          renderToStaticMarkup(createElement(ProgressScene, { fund, percent })),
        ).toBe(complete);
      }
    }
  });
});

describe("fire fund progress", () => {
  it("starts with an unlit reserve and advances warmth and the ember toward their goals", () => {
    const warmth: number[] = [],
      light: number[] = [],
      positions: number[] = [];
    for (const progress of [0, 0.2499, 0.25, 0.5, 0.75, 1]) {
      const scene = (fund: "emergency" | "rainy_day" | "sinking") =>
        renderToStaticMarkup(
          createElement(FireProgressScene, { fund, progress }),
        );
      warmth.push(
        Number(
          scene("emergency").match(
            /data-fire-hearth-flame=""[^>]*scale\(([^)]+)/,
          )?.[1],
        ),
      );
      light.push(
        Number(
          scene("rainy_day").match(
            /data-fire-lantern-light=""[^>]*scale\(([^)]+)/,
          )?.[1],
        ),
      );
      positions.push(
        Number(
          scene("sinking").match(
            /data-fire-ember=""[^>]*translate\(([^ ]+)/,
          )?.[1],
        ),
      );
    }
    for (const values of [warmth, light, positions]) {
      expect(values.every(Number.isFinite)).toBe(true);
      for (let i = 1; i < values.length; i++)
        expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    expect(warmth[0]).toBe(0);
    expect(light[0]).toBe(0);
    expect(warmth.at(-1)).toBe(1);
    expect(light.at(-1)).toBeGreaterThan(0);
    expect(light.at(-1)).toBeLessThanOrEqual(1);
    expect(positions[0]).toBeLessThan(90);
    expect(positions.at(-1)).toBeGreaterThan(260);
    expect(positions.at(-1)).toBeLessThan(330);
  });
});

describe("earth illustrations and fund progress", () => {
  it("provides a distinct landscape for every existing illustration context", () => {
    const scenes = [
      "garden",
      "jar",
      "sprout",
      "harvest",
      "grove",
      "path",
      "shelter",
      "balance",
    ] as const;
    const drawings = scenes.map((variant) =>
      renderToStaticMarkup(createElement(EarthScene, { variant })),
    );
    expect(new Set(drawings).size).toBe(scenes.length);
    for (const drawing of drawings) expect(drawing).toContain("<path");
  });
  it("builds the foundation and shelter while moving the stones up toward the goal", () => {
    const heights: number[] = [],
      widths: number[] = [],
      x: number[] = [],
      y: number[] = [];
    for (const progress of [0, 0.2499, 0.25, 0.5, 0.75, 1]) {
      const scene = (fund: "emergency" | "rainy_day" | "sinking") =>
        renderToStaticMarkup(
          createElement(EarthProgressScene, { fund, progress }),
        );
      heights.push(
        Number(
          scene("emergency").match(
            /data-earth-foundation=""[^>]*scale\(1 ([^)]+)/,
          )?.[1],
        ),
      );
      widths.push(
        Number(
          scene("rainy_day").match(
            /data-earth-shelter=""[^>]*scale\(([^ ]+)/,
          )?.[1],
        ),
      );
      const position = scene("sinking").match(
        /data-earth-traveler=""[^>]*translate\(([^ ]+) ([^)]+)/,
      );
      x.push(Number(position?.[1]));
      y.push(Number(position?.[2]));
    }
    for (const values of [heights, widths, x]) {
      expect(values.every(Number.isFinite)).toBe(true);
      for (let i = 1; i < values.length; i++)
        expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    expect(y.every(Number.isFinite)).toBe(true);
    for (let i = 1; i < y.length; i++) expect(y[i]).toBeLessThan(y[i - 1]);
    expect(heights[0]).toBe(0);
    expect(heights.at(-1)).toBe(1);
    expect(widths[0]).toBeGreaterThan(0);
    expect(widths.at(-1)).toBe(1);
    expect(x[0]).toBeLessThan(90);
    expect(x.at(-1)).toBeGreaterThan(260);
    expect(x.at(-1)).toBeLessThan(330);
    expect(y.at(-1)).toBeGreaterThan(50);
  });
});
