import { TYPE_ART } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import type { ArticleTypeKey } from "@/config/journal";
import { typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** An article type in a metadata line, led by its glyph. */
export function TypeLabel({ type, className }: { type: ArticleTypeKey; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)}>
      <Glyph name={TYPE_ART[type].glyph} className="-my-1 size-4" />
      {typeLabel(type)}
    </span>
  );
}
