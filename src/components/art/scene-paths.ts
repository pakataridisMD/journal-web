import type { GlyphName } from "./glyph-paths";

/**
 * Larger illustrations, built like cut-paper collage: grainy colored
 * `field`s, flat `paper` cut-outs printed slightly off-register, and loose
 * `ink` line drawing on top. Pure data, rendered by <Scene>.
 */

export type Tone = "artery" | "vein" | "nerve" | "lymph" | "eosin" | "bone" | "paper";

export type Layer =
  /** A colored sheet with a printed grain. */
  | { kind: "field"; tone: Tone; d: string }
  /** A flat cut-out (paper colored unless a tone is given). */
  | { kind: "paper"; d: string | readonly string[]; tone?: Tone; offset?: readonly [number, number] }
  /** Ink line drawing; `w` overrides the scene's stroke width, `tone` the ink. */
  | { kind: "ink"; d: string | readonly string[]; w?: number; tone?: Tone }
  /** One of the glyphs, set large with its paper cut-out under the ink. */
  | { kind: "glyph"; name: GlyphName; x: number; y: number; size: number; w?: number }
  /** Moves, turns or scales its layers; `clip` is in the group's own units. */
  | {
      kind: "group";
      x?: number;
      y?: number;
      rotate?: number;
      scale?: number;
      clip?: string;
      layers: readonly Layer[];
    };

export type SceneSpec = {
  width: number;
  height: number;
  /** Default ink stroke width, in scene units. */
  stroke: number;
  layers: readonly Layer[];
};

/** A hand closed around a horizontal handle that leads off to the left. */
function fist(handleFrom: number): Layer[] {
  return [
    {
      kind: "paper",
      offset: [-2, 2],
      d: [
        `M${handleFrom} -7H82C88 -7 88 7 82 7H${handleFrom}Z`,
        "M-8 6C-14 26 -14 50 -8 84H52C57 58 59 40 56 22L54 -2H-6Z",
        "M-6 -6C-6 -18 12 -18 12 -6V30H-6Z",
        "M12 -5C12 -16 29 -16 29 -5V32H12Z",
        "M29 -3C29 -13 44 -13 44 -3V32H29Z",
        "M44 0C44 -9 56 -9 56 0V26H44Z",
        "M-4 -9C-18 -14 -34 -16 -47 -13C-56 -11 -56 0 -47 2C-34 4 -18 8 -6 16Z",
      ],
    },
    {
      kind: "ink",
      d: [
        `M${handleFrom} -7H-48M${handleFrom} 7H-40`,
        "M56 -6H82C88 -6 88 7 82 7H56",
        "M-6 26V-6C-6 -18 12 -18 12 -6",
        "M12 -5C12 -16 29 -16 29 -5V30",
        "M29 -3C29 -13 44 -13 44 -3V30",
        "M44 0C44 -9 56 -9 56 0V22",
        "M-1 22.5C2 23.5 6 23.5 8.5 22.5M16 24.5C19 25.5 23 25.5 25.5 24.5M32.5 24.5C35 25.5 38 25.5 40.5 24.5",
        "M-7 14C-13 32 -13 52 -8 84",
        "M56 22C59 40 57 58 52 84",
        "M-4 -9C-18 -14 -34 -16 -47 -13C-56 -11 -56 0 -47 2C-34 4 -18 8 -7 15",
        "M-45 -10C-41 -11 -39 -7 -40 -3",
      ],
    },
  ];
}

/** The same hand closed around a fountain pen whose nib points off to the left. */
function fistWithPen(): Layer[] {
  const [paper, ink] = fist(-48) as [Extract<Layer, { kind: "paper" }>, Extract<Layer, { kind: "ink" }>];
  return [
    {
      ...paper,
      d: [...(paper.d as readonly string[]), "M-96 -7H-40V7H-96Z", "M-96 -7L-124 0L-96 7Z"],
    },
    {
      ...ink,
      d: [
        ...(ink.d as readonly string[]).slice(1),
        "M-96 -7H-48M-96 7H-40",
        "M-96 -7V7",
        "M-96 -7L-124 0L-96 7",
        "M-124 0H-106",
        "M-108 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0",
      ],
    },
  ];
}

/** y = mid + amp·sin(2π(x − x0)/period + phase), from x0 to x1, as smooth curves. */
function wave(x0: number, x1: number, mid: number, amp: number, period: number, phase: number): string {
  const steps = Math.ceil(((x1 - x0) / period) * 8);
  const dx = (x1 - x0) / steps;
  const k = (2 * Math.PI) / period;
  const y = (x: number) => mid + amp * Math.sin(k * (x - x0) + phase);
  const dy = (x: number) => amp * k * Math.cos(k * (x - x0) + phase);
  let d = `M${x0} ${y(x0).toFixed(1)}`;
  for (let i = 0; i < steps; i++) {
    const a = x0 + i * dx;
    const b = a + dx;
    d += `C${(a + dx / 3).toFixed(1)} ${(y(a) + (dy(a) * dx) / 3).toFixed(1)} ${(b - dx / 3).toFixed(1)} ${(y(b) - (dy(b) * dx) / 3).toFixed(1)} ${b.toFixed(1)} ${y(b).toFixed(1)}`;
  }
  return d;
}

/** Home page: a lens held over a paper heart, the coronary tree magnified. */
const closeReading: SceneSpec = {
  width: 560,
  height: 480,
  stroke: 3.4,
  layers: [
    {
      kind: "field",
      tone: "artery",
      d: "M50 48L290 40L506 32L516 230L526 412L300 424L40 432L46 236Z",
    },
    { kind: "glyph", name: "cardiology", x: 58, y: 52, size: 320 },
    // the lens: a pale disc, off-register, with what it magnifies clipped inside
    { kind: "paper", tone: "bone", offset: [-3, 3], d: "M250 240a80 80 0 1 0 160 0a80 80 0 1 0 -160 0Z" },
    {
      kind: "group",
      clip: "M250 240a80 80 0 1 0 160 0a80 80 0 1 0 -160 0Z",
      layers: [
        {
          kind: "ink",
          w: 6,
          d: "M282 168C298 196 306 226 300 258S304 304 322 322",
        },
        { kind: "ink", w: 4.8, d: "M300 248C320 252 340 268 350 288C356 300 368 310 384 314" },
        { kind: "ink", w: 3.6, d: "M302 218C320 212 342 216 360 206" },
        { kind: "ink", w: 3.2, d: "M350 288C362 280 380 280 394 268" },
        { kind: "ink", w: 2.6, d: "M318 212C324 200 334 194 346 192" },
        { kind: "ink", w: 3.2, d: "M304 276C292 284 286 296 274 302" },
        { kind: "ink", w: 2.6, d: "M282 214C270 224 266 238 256 246" },
        { kind: "ink", w: 2.4, d: "M364 300C370 314 368 326 374 338" },
      ],
    },
    {
      kind: "ink",
      d: ["M250 240a80 80 0 1 0 160 0a80 80 0 1 0 -160 0Z", "M241 240a89 89 0 1 0 178 0a89 89 0 1 0 -178 0Z"],
    },
    { kind: "group", x: 454.4, y: 364.4, rotate: 45, scale: 1.25, layers: fist(-70) },
  ],
};

/** Sign-in: paper lungs and their airways, with a stethoscope listening in. */
const breath: SceneSpec = {
  width: 480,
  height: 560,
  stroke: 3.4,
  layers: [
    { kind: "field", tone: "lymph", d: "M44 40L250 30L446 44L436 300L452 520L240 532L36 522L48 280Z" },
    { kind: "glyph", name: "respiratory-medicine", x: 40, y: 92, size: 400 },
    {
      kind: "ink",
      w: 2.8,
      d: [
        "M194 289C182 314 164 336 142 356",
        "M178 316C162 316 147 311 129 302",
        "M163 336C158 356 157 379 150 396",
        "M142 356C131 365 120 379 113 396",
        "M129 302C120 296 113 288 109 276",
        "M157 379C169 388 173 401 176 416",
        "M286 289C298 314 316 336 338 356",
        "M302 316C318 316 333 311 351 302",
        "M317 336C322 356 323 379 330 396",
        "M338 356C349 365 360 379 367 396",
        "M351 302C360 296 367 288 371 276",
      ],
    },
    // stethoscope chest piece, its tubing trailing off the sheet
    { kind: "ink", w: 4.4, d: "M400 446C420 424 430 392 426 352C422 312 430 268 450 242C458 232 466 226 472 223" },
    { kind: "paper", tone: "bone", offset: [-3, 3], d: "M346 468a34 34 0 1 0 68 0a34 34 0 1 0 -68 0Z" },
    {
      kind: "ink",
      d: [
        "M346 468a34 34 0 1 0 68 0a34 34 0 1 0 -68 0Z",
        "M366 468a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z",
        "M396 442L402 434",
      ],
    },
  ],
};

/** For authors: a hand with a pen over a manuscript and its survival curves. */
const manuscript: SceneSpec = {
  width: 560,
  height: 440,
  stroke: 3.2,
  layers: [
    { kind: "field", tone: "nerve", d: "M40 52L290 40L492 50L500 250L488 404L280 414L34 406L46 228Z" },
    {
      kind: "group",
      x: 112,
      y: 64,
      rotate: -6,
      layers: [
        { kind: "paper", offset: [-4, 4], d: "M0 0H230V300H0Z" },
        { kind: "ink", d: "M0 0H230V300H0Z" },
        { kind: "ink", w: 5, d: "M18 30H200M18 44H156" },
        { kind: "ink", w: 2.2, d: "M18 62H120M18 84H58M18 98H212M18 110H212M18 122H188" },
        { kind: "ink", w: 2.4, d: "M24 158V250H212M24 204H19M24 158H19" },
        { kind: "ink", w: 2.8, d: "M24 166H60V178H92V192H126V200H168V206H210" },
        { kind: "ink", w: 2.8, d: "M24 166H46V188H74V210H104V226H146V236H210" },
        { kind: "ink", w: 2.2, d: "M18 268H150M18 280H118" },
      ],
    },
    { kind: "group", x: 447.5, y: 193.5, rotate: -35, scale: 1.2, layers: fistWithPen() },
  ],
};

const strandA = wave(70, 490, 190, 70, 220, 0);
const strandB = wave(70, 490, 190, 70, 220, Math.PI);
/** The first strand again around every other crossing, so the strands weave. */
const strandAOver = [150, 370]
  .map((x) => wave(x, x + 60, 190, 70, 220, ((2 * Math.PI) / 220) * (x - 70)))
  .join("");

/** Base pairs: rungs between the two strands wherever they are far enough apart. */
function rungs(): string {
  const parts: string[] = [];
  for (let x = 84; x < 490; x += 24) {
    const a = 190 + 70 * Math.sin(((2 * Math.PI) / 220) * (x - 70));
    const b = 190 - 70 * Math.sin(((2 * Math.PI) / 220) * (x - 70));
    if (Math.abs(a - b) < 34) continue;
    const top = Math.min(a, b) + 10;
    const bottom = Math.max(a, b) - 10;
    parts.push(`M${x} ${top.toFixed(1)}V${bottom.toFixed(1)}`);
  }
  return parts.join("");
}

/** A benzene ring, for the molecules drifting around the helix. */
function hexagon(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}

/** About: a double helix as two paper ribbons, base pairs inked between. */
const helix: SceneSpec = {
  width: 560,
  height: 380,
  stroke: 3.2,
  layers: [
    { kind: "field", tone: "eosin", d: "M40 44L290 34L520 46L512 200L524 340L280 350L36 342L46 190Z" },
    { kind: "ink", w: 2.6, d: rungs() },
    { kind: "ink", w: 22, d: strandA },
    { kind: "ink", w: 15.6, tone: "paper", d: strandA },
    { kind: "ink", w: 22, d: strandB },
    { kind: "ink", w: 15.6, tone: "paper", d: strandB },
    { kind: "ink", w: 22, d: strandAOver },
    { kind: "ink", w: 15.6, tone: "paper", d: strandAOver },
    { kind: "paper", offset: [-3, 3], d: [hexagon(470, 96, 18), hexagon(112, 300, 14)] },
    {
      kind: "ink",
      w: 2.6,
      d: [
        hexagon(470, 96, 18),
        "M470 96m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
        "M486 87L500 79",
        hexagon(112, 300, 14),
        "M100 293L88 286",
      ],
    },
  ],
};

/** Not found: a microscope over an empty slide. */
const emptySlide: SceneSpec = {
  width: 520,
  height: 400,
  stroke: 3.4,
  layers: [
    { kind: "field", tone: "vein", d: "M44 46L270 36L480 44L472 210L486 360L260 368L40 360L50 200Z" },
    { kind: "glyph", name: "original-research", x: 40, y: 34, size: 320 },
    {
      kind: "group",
      x: 318,
      y: 262,
      rotate: -8,
      layers: [
        { kind: "paper", tone: "bone", offset: [-3, 3], d: "M0 0H148V56H0Z" },
        { kind: "ink", d: ["M0 0H148V56H0Z", "M48 6H100V50H48Z"] },
        {
          kind: "ink",
          w: 2.4,
          d: "M60 28a14 14 0 0 1 4-10M70 14a14 14 0 0 1 10 2M86 22a14 14 0 0 1 2 10M84 39a14 14 0 0 1-10 3M64 38a14 14 0 0 1-4-6",
        },
      ],
    },
  ],
};

export const SCENES = {
  closeReading,
  breath,
  manuscript,
  helix,
  emptySlide,
} as const satisfies Record<string, SceneSpec>;

export type SceneName = keyof typeof SCENES;
