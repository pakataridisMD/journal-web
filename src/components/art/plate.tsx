import { inkPath, motion } from "@/components/motion/motion";
import { cn } from "@/lib/utils";
import { GRAIN_FILTER, ROUGH_FILTER } from "./art-defs";
import { cutPaperField, seedFrom } from "./cut";
import { GLYPHS, type GlyphName } from "./glyph-paths";
import type { Tone } from "./scene-paths";

export type PlateTone = Exclude<Tone, "paper">;

/** The CSS colour of an illustration tone. */
export function toneColor(tone: Tone): string {
  return tone === "paper" ? "var(--paper)" : `var(--plate-${tone})`;
}

/**
 * A glyph set large on a cut-paper plate: a grainy coloured field, the
 * glyph's paper silhouette printed slightly off-register, and the ink line
 * drawing on top. `width` × `height` is the design size in px; the plate
 * scales to fill its box, so pick a design size near the rendered size to
 * keep the line weight (`stroke`, default 3) close to its design. With
 * `draw`, the plate is printed as it comes into view: it is laid down, then
 * its ink lines draw themselves one after another (see motion.ts).
 */
export function Plate({
  glyph,
  tone,
  width = 240,
  height = 180,
  scale = 0.58,
  inset = 0.06,
  stroke = 3,
  seed,
  label,
  draw = false,
  delay,
  className,
}: {
  glyph: GlyphName;
  tone: PlateTone;
  width?: number;
  height?: number;
  /** Glyph size as a share of the plate's shorter side. */
  scale?: number;
  /** Margin of paper left around the field, as a share of each side. */
  inset?: number;
  stroke?: number;
  /** Changes how the field is cut; defaults to one derived from the glyph and tone. */
  seed?: number;
  label?: string;
  /** Draw the plate in as it arrives, for the public site. */
  draw?: boolean;
  /** With `draw`, wait this many ms first, to stagger plates shown together. */
  delay?: number;
  className?: string;
}) {
  const spec = GLYPHS[glyph];
  const rotate = "rotate" in spec ? spec.rotate : undefined;
  const size = Math.min(width, height) * scale;
  const unit = size / 48;
  const x = (width - size) / 2;
  const y = (height - size) / 2;
  const turn = rotate ? ` rotate(${rotate} 24 24)` : "";
  const field = cutPaperField(width, height, seed ?? seedFrom(`${glyph}:${tone}`), inset);
  const paper = "paper" in spec ? spec.paper : [];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      focusable="false"
      className={cn("block h-auto w-full", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...(draw ? motion("draw", delay) : {})}
    >
      <path d={field} style={{ fill: toneColor(tone) }} filter={GRAIN_FILTER} />
      {paper.length > 0 ? (
        <g transform={`translate(${x} ${y}) scale(${unit}) translate(-1.1 0.9)${turn}`} style={{ fill: "var(--paper)" }}>
          {paper.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ) : null}
      <g filter={ROUGH_FILTER}>
        <g
          data-art="ink"
          transform={`translate(${x} ${y}) scale(${unit})${turn}`}
          fill="none"
          strokeWidth={stroke / unit}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: "var(--ink)" }}
        >
          {spec.ink.map((d, i) => (
            <path key={i} d={d} {...(draw ? inkPath(i, spec.ink.length) : {})} />
          ))}
        </g>
      </g>
    </svg>
  );
}
