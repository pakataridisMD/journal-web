import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COVERS, type CoverName } from "./cover-images";

/**
 * One of the journal's cover images, cropped to fill its box, so give the box
 * a size. Children are laid over the image, such as a <CoverCredit>.
 */
export function CoverImage({
  name,
  sizes,
  preload = false,
  className,
  children,
}: {
  name: CoverName;
  /** How wide the box is at each breakpoint, as for next/image. */
  sizes: string;
  /** For the largest image at the top of a page. */
  preload?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const cover = COVERS[name];
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={cover.src}
        alt={cover.alt}
        fill
        sizes={sizes}
        preload={preload}
        placeholder="blur"
        className="object-cover"
        style={{ objectPosition: cover.focus }}
      />
      {children}
    </div>
  );
}

/** A cover image's credit line, linked to the museum's record of the work. */
export function CoverCredit({ name, className }: { name: CoverName; className?: string }) {
  const cover = COVERS[name];
  return (
    <p className={cn("text-xs leading-snug", className)}>
      <a href={cover.url} className="underline-offset-2 hover:underline">
        {cover.maker}, <cite>{cover.title}</cite>, {cover.date}
      </a>
      . The Met, public domain.
    </p>
  );
}

/** Credit laid on the image's bottom-right corner, on a paper label. */
export const CREDIT_LABEL =
  "absolute right-3 bottom-3 max-w-[calc(100%-1.5rem)] bg-background px-2 py-1 text-muted-foreground";
