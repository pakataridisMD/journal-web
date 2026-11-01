import Link from "next/link";
import type { ArticleCard } from "@/lib/data";
import { authorList, formatShortDate, shortIssueLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TypeLabel } from "./type-label";

/** One article in a list: metadata line, serif title, authors, snippet. */
export function ArticleRow({
  article,
  showSnippet = true,
  headingLevel = "h3",
  className,
}: {
  article: ArticleCard;
  showSnippet?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <article className={cn("group relative py-6", className)}>
      <p className="meta-label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <TypeLabel type={article.articleType} />
        <time dateTime={new Date(article.publishedAt).toISOString()}>
          {formatShortDate(article.publishedAt)}
        </time>
        <span>{article.issue ? shortIssueLabel(article.issue) : "Online first"}</span>
      </p>
      <Heading className="mt-2.5 font-serif text-[1.375rem] leading-snug tracking-[-0.01em] md:text-title">
        <Link
          href={`/articles/${article.slug}`}
          className="decoration-1 underline-offset-[5px] after:absolute after:inset-0 group-hover:underline"
        >
          {article.title}
        </Link>
      </Heading>
      <p className="mt-2 text-sm text-muted-foreground">{authorList(article.authors)}</p>
      {showSnippet && article.snippet ? (
        <p className="mt-3 line-clamp-2 max-w-3xl font-serif text-[1.0625rem] leading-relaxed text-foreground/85">
          {article.snippet}
        </p>
      ) : null}
    </article>
  );
}

export function ArticleList({
  articles,
  showSnippet,
  headingLevel,
}: {
  articles: readonly ArticleCard[];
  showSnippet?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className="divide-y border-y">
      {articles.map((article) => (
        <ArticleRow
          key={article._id}
          article={article}
          showSnippet={showSnippet}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
