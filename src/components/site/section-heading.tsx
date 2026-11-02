import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "@/components/motion/motion";
import { cn } from "@/lib/utils";

/**
 * A ruled section head: label on the left, an optional link on the right.
 * The rule draws itself in as the section comes into view.
 */
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
    <div
      className={cn(
        "relative flex items-baseline justify-between gap-4 pb-2.5 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-foreground",
        className,
      )}
      {...motion("rule")}
    >
      <h2 id={id} className="meta-label text-foreground">
        {children}
      </h2>
      {href ? (
        <Link href={href} className="text-sm font-medium">
          <span className="ink-link">{linkLabel ?? "View all"}</span>{" "}
          <span aria-hidden className="ink-arrow">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
