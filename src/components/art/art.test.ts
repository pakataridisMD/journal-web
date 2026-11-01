import { describe, expect, test } from "vitest";
import { articleTypes, subjects, type ArticleTypeKey } from "../../config/journal";
import { articleArt, issueArt, SUBJECT_ART, subjectArt, TYPE_ART } from "./catalog";
import { cutPaperField, rng, seedFrom } from "./cut";
import { GLYPHS, type GlyphName } from "./glyph-paths";
import { SCENES, type Layer } from "./scene-paths";

const PATH = /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/;

function scenePaths(layers: readonly Layer[]): string[] {
  return layers.flatMap((layer) => {
    switch (layer.kind) {
      case "field":
        return [layer.d];
      case "paper":
      case "ink":
        return typeof layer.d === "string" ? [layer.d] : [...layer.d];
      case "glyph":
        return [];
      case "group":
        return [...(layer.clip ? [layer.clip] : []), ...scenePaths(layer.layers)];
    }
  });
}

describe("glyphs", () => {
  test.each(Object.keys(GLYPHS) as GlyphName[])("%s is valid path data", (name) => {
    const glyph = GLYPHS[name];
    expect(glyph.ink.length).toBeGreaterThan(0);
    for (const d of glyph.ink) expect(d).toMatch(PATH);
    for (const d of "paper" in glyph ? glyph.paper : []) {
      expect(d).toMatch(PATH);
      expect(d.trim()).toMatch(/[Zz]$/);
    }
  });
});

describe("scenes", () => {
  test.each(Object.keys(SCENES) as (keyof typeof SCENES)[])("%s is valid path data", (name) => {
    const paths = scenePaths(SCENES[name].layers);
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) expect(d).toMatch(PATH);
  });
});

describe("catalog", () => {
  test("every subject and article type has art", () => {
    for (const subject of subjects) expect(GLYPHS[SUBJECT_ART[subject].glyph]).toBeDefined();
    for (const type of Object.keys(articleTypes) as ArticleTypeKey[]) {
      expect(GLYPHS[TYPE_ART[type].glyph]).toBeDefined();
    }
  });

  test("subjects match regardless of case and spacing", () => {
    expect(subjectArt("  respiratory MEDICINE ")).toEqual(SUBJECT_ART["Respiratory medicine"]);
    expect(subjectArt("Astrology")).toBeUndefined();
  });

  test("an article uses its first known subject, else its type", () => {
    expect(articleArt({ subjects: ["Astrology", "Neurology"], articleType: "review" })).toEqual(
      SUBJECT_ART.Neurology,
    );
    expect(articleArt({ subjects: [], articleType: "letter" })).toEqual(TYPE_ART.letter);
  });

  test("consecutive issues get different covers", () => {
    const covers = Array.from({ length: 12 }, (_, i) => issueArt({ volume: 1, number: i + 1 }).glyph);
    expect(new Set(covers).size).toBe(12);
    expect(issueArt({ volume: 2, number: 1 })).toEqual(issueArt({ volume: 1, number: 1 }));
    expect(issueArt({ volume: 0, number: -3 }).glyph).toBeDefined();
  });
});

describe("cut paper", () => {
  test("the same seed cuts the same field", () => {
    expect(cutPaperField(240, 180, 42)).toBe(cutPaperField(240, 180, 42));
    expect(cutPaperField(240, 180, 42)).not.toBe(cutPaperField(240, 180, 43));
  });

  test("fields stay inside their box", () => {
    for (let seed = 0; seed < 200; seed++) {
      const numbers = cutPaperField(160, 120, seed).match(/-?\d+(\.\d+)?/g)!.map(Number);
      numbers.forEach((n, i) => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(i % 2 === 0 ? 160 : 120);
      });
    }
  });

  test("seeds are stable and spread", () => {
    expect(seedFrom("cardiology:artery")).toBe(seedFrom("cardiology:artery"));
    const random = rng(1);
    const values = Array.from({ length: 1000 }, random);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });
});
