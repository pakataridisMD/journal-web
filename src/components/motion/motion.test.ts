import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Plate } from "../art/plate";
import { Scene } from "../art/scene";
import { GLYPHS } from "../art/glyph-paths";
import { inkPath, motion } from "./motion";

/** The --ink-delay of each drawn ink path, in ms, in document order. */
function inkDelays(svg: string): number[] {
  return [...svg.matchAll(/<path[^>]*pathLength="1"[^>]*style="--ink-delay:(\d+)ms"/g)].map((m) => Number(m[1]));
}

describe("motion", () => {
  test("an entrance carries its delay as a custom property", () => {
    expect(motion("rise")).toEqual({ "data-motion": "rise" });
    expect(motion("draw", 140)).toEqual({ "data-motion": "draw", style: { "--motion-delay": "140ms" } });
  });

  test("ink lines draw in turn, and a long drawing still starts every line within 0.84s", () => {
    expect([0, 1, 2].map((i) => inkPath(i, 3).style)).toEqual([
      { "--ink-delay": "0ms" },
      { "--ink-delay": "70ms" },
      { "--ink-delay": "140ms" },
    ]);
    expect(inkPath(59, 60).style).toEqual({ "--ink-delay": "826ms" });
  });

  test("a plate only animates when asked to", () => {
    const still = renderToStaticMarkup(createElement(Plate, { glyph: "cardiology", tone: "artery" }));
    expect(still).not.toContain("data-motion");
    expect(still).not.toContain("pathLength");

    const drawn = renderToStaticMarkup(createElement(Plate, { glyph: "cardiology", tone: "artery", draw: true, delay: 70 }));
    expect(drawn).toMatch(/^<svg[^>]*data-motion="draw"[^>]*style="--motion-delay:70ms"/);
    expect(drawn).toContain('data-art="ink"');
    expect(inkDelays(drawn)).toEqual(GLYPHS.cardiology.ink.map((_, i) => i * 70));
  });

  test("a scene draws every ink line, glyphs included, in paint order", () => {
    const drawn = renderToStaticMarkup(createElement(Scene, { name: "manuscript", draw: true }));
    const delays = inkDelays(drawn);
    expect(delays.length).toBe((drawn.match(/pathLength="1"/g) ?? []).length);
    expect(delays.length).toBeGreaterThan(3);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays.at(-1)).toBeLessThanOrEqual(840);
  });
});
