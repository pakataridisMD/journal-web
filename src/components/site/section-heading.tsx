import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A ruled section head: label on the left, an optional link on the right. */
export function SectionHeading({
  id,
  children,
  href,
  linkLabel,
  className,
}: {
  id?: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 border-b border-foreground pb-2.5", className)}>
      <h2 id={id} className="meta-label text-foreground">
        {children}
      </h2>
      {href ? (
        <Link href={href} className="text-sm font-medium underline-offset-4 hover:underline">
          {linkLabel ?? "View all"} <span aria-hidden>→</span>
        </Link>
      ) : null}
    </div>
  );
}
