import { subjectArt } from "@/components/art/catalog";
import { GRAIN_FILTER } from "@/components/art/art-defs";
import { cutPaperField, seedFrom } from "@/components/art/cut";
import { toneColor, type PlateTone } from "@/components/art/plate";
import { initials } from "@/convex/lib/profileFields";
import { cn } from "@/lib/utils";

const TONES: readonly PlateTone[] = ["artery", "vein", "nerve", "lymph", "eosin", "bone"];

/** A person's plate tone: their first specialty's, or one picked by their name. */
export function portraitTone(name: string, expertise: readonly string[] = []): PlateTone {
  for (const subject of expertise) {
    const art = subjectArt(subject);
    if (art) return art.tone;
  }
  return TONES[seedFrom(name) % TONES.length];
}

/**
 * A person's picture: their photo when they chose to show it, otherwise their
 * initials cut from paper on a plate, printed off-register like the glyphs.
 * Decorative; the name is always written beside it.
 */
export function Portrait({
  name,
  imageUrl,
  expertise,
  className,
}: {
  name: string;
  imageUrl?: string;
  expertise?: readonly string[];
  className?: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn("aspect-[5/6] overflow-hidden border bg-muted", className)}>
        {/* Clerk serves the photo; next/image would need its host allow-listed for no gain at this size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  const width = 200;
  const height = 240;
  const letters = initials(name);
  const field = cutPaperField(width, height, seedFrom(`portrait:${name}`), 0.05);
  const type = {
    x: width / 2,
    y: height / 2 + 2,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontFamily: "var(--font-serif)",
    fontSize: letters.length > 1 ? 92 : 110,
    fontWeight: 340,
    letterSpacing: "-0.02em",
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      className={cn("block h-auto w-full", className)}
    >
      <path d={field} style={{ fill: toneColor(portraitTone(name, expertise)) }} filter={GRAIN_FILTER} />
      <text {...type} transform="translate(-3 2.5)" style={{ fill: "var(--paper)" }}>
        {letters}
      </text>
      <text {...type} style={{ fill: "var(--ink)" }}>
        {letters}
      </text>
    </svg>
  );
}
