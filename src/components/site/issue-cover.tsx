import { journal, tocOrder } from "@/config/journal";
import type { ArticleCard } from "@/lib/data";
import { formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

type CoverIssue = {
  volume: number;
  number: number;
  publishedAt?: number;
  title?: string;
};

/**
 * Issue covers are typeset, not illustrated: wordmark, volume and number set
 * large, and the lead titles listed like a printed journal's front cover.
 */
export function IssueCover({
  issue,
  articles = [],
  size = "md",
  className,
}: {
  issue: CoverIssue;
  articles?: readonly Pick<ArticleCard, "title" | "articleType">[];
  size?: "sm" | "md";
  className?: string;
}) {
  const lead = [...articles]
    .sort((a, b) => tocOrder.indexOf(a.articleType) - tocOrder.indexOf(b.articleType))
    .slice(0, size === "sm" ? 0 : 3);
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-card bg-muted text-foreground",
        size === "sm" ? "p-4" : "p-6",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("block bg-brand", size === "sm" ? "size-2" : "size-2.5")} />
          <span className={cn("font-serif leading-none tracking-[-0.02em]", size === "sm" ? "text-base" : "text-xl")}>
            {journal.name}
          </span>
        </div>
        {issue.publishedAt ? (
          <span className="meta-label text-right text-[0.6875rem] text-muted-foreground">
            {formatMonthYear(issue.publishedAt)}
          </span>
        ) : null}
      </div>
      <div className={cn("mt-auto min-h-0", size === "sm" ? "pt-6" : "pt-6")}>
        <p
          className={cn(
            "font-serif font-light leading-[0.85] tracking-[-0.04em]",
            size === "sm" ? "text-[3.5rem]" : "text-[5.5rem]",
          )}
        >
          {issue.volume}
          <span className="text-muted-foreground">.</span>
          {issue.number}
        </p>
        <p className="meta-label mt-3 text-[0.6875rem] text-muted-foreground">
          Volume {issue.volume} · Issue {issue.number}
        </p>
        {lead.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-foreground/80 pt-3.5">
            {lead.map((a) => (
              <li key={a.title} className="line-clamp-2 font-serif text-[0.8125rem] leading-snug">
                {a.title}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
