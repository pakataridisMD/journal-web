import { issueArt } from "@/components/art/catalog";
import { seedFrom } from "@/components/art/cut";
import { Plate } from "@/components/art/plate";
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
 * An issue's cover, like a printed journal's: wordmark and date, a plate
 * that changes colour and subject from issue to issue, the volume and number
 * set large, and the lead titles as cover lines. With `draw`, the plate is
 * printed as the cover comes into view.
 */
export function IssueCover({
  issue,
  articles = [],
  size = "md",
  draw = false,
  delay,
  className,
}: {
  issue: CoverIssue;
  articles?: readonly Pick<ArticleCard, "title" | "articleType">[];
  size?: "sm" | "md";
  draw?: boolean;
  /** With `draw`, wait this many ms first, to stagger covers shown together. */
  delay?: number;
  className?: string;
}) {
  const lead = [...articles]
    .sort((a, b) => tocOrder.indexOf(a.articleType) - tocOrder.indexOf(b.articleType))
    .slice(0, size === "sm" ? 0 : 2);
  const art = issueArt(issue);
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-card bg-muted text-foreground",
        size === "sm" ? "p-3.5" : "p-5",
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
        {/* Small covers sit above their own caption, which carries the date. */}
        {issue.publishedAt && size !== "sm" ? (
          <span className="meta-label text-right text-[0.6875rem] text-muted-foreground">
            {formatMonthYear(issue.publishedAt)}
          </span>
        ) : null}
      </div>
      <div className={cn("relative min-h-0 flex-1", size === "sm" ? "-mx-1.5 my-1" : "-mx-2 my-2")}>
        <Plate
          glyph={art.glyph}
          tone={art.tone}
          width={240}
          height={180}
          scale={0.62}
          inset={0.04}
          seed={seedFrom(`issue:${issue.volume}.${issue.number}`)}
          draw={draw}
          delay={delay}
          className="absolute inset-0 h-full"
        />
      </div>
      <div>
        <p
          className={cn(
            "font-serif font-light leading-[0.85] tracking-[-0.04em]",
            size === "sm" ? "text-[2.75rem]" : "text-[4rem]",
          )}
        >
          {issue.volume}
          <span className="text-muted-foreground">.</span>
          {issue.number}
        </p>
        <p className="meta-label mt-2.5 text-[0.6875rem] text-muted-foreground">
          Volume {issue.volume} · Issue {issue.number}
        </p>
        {lead.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-foreground/80 pt-3">
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
