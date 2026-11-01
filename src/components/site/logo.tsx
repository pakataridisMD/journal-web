import Link from "next/link";
import { journal } from "@/config/journal";
import { cn } from "@/lib/utils";

/** Placeholder identity until the journal is named: serif wordmark + vermillion square. */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5 text-foreground", className)}
      aria-label={`${journal.name}, home`}
    >
      <span
        aria-hidden
        className={cn(
          "block shrink-0 bg-brand",
          size === "sm" && "size-2.5",
          size === "md" && "size-3",
          size === "lg" && "size-4",
        )}
      />
      <span
        className={cn(
          "font-serif font-medium leading-none tracking-[-0.02em]",
          size === "sm" && "text-xl",
          size === "md" && "text-[1.75rem]",
          size === "lg" && "text-[2.5rem]",
        )}
      >
        {journal.name}
      </span>
    </Link>
  );
}
