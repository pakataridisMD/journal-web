import { cn } from "@/lib/utils";
import { GLYPHS, type GlyphName } from "./glyph-paths";

/**
 * A line glyph from the journal's icon set, drawn in the current text colour.
 * Decorative by default; pass `label` when the glyph carries meaning alone.
 * The stroke stays 1.5px at any size (see `.glyph` in globals.css).
 */
export function Glyph({
  name,
  label,
  className,
}: {
  name: GlyphName;
  label?: string;
  className?: string;
}) {
  const glyph = GLYPHS[name];
  const rotate = "rotate" in glyph ? glyph.rotate : undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={cn("glyph size-5 shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <g transform={rotate ? `rotate(${rotate} 24 24)` : undefined}>
        {glyph.ink.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
