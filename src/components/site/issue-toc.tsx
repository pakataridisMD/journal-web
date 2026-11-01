import Link from "next/link";
import { articleTypes } from "@/config/journal";
import type { IssueWithContents } from "@/lib/data";
import { authorList } from "@/lib/format";

/** A printed-style table of contents: sections, titles, leader dots, e-numbers. */
export function IssueToc({
  sections,
  compact = false,
}: {
  sections: IssueWithContents["sections"];
  compact?: boolean;
}) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.articleType} aria-labelledby={`toc-${section.articleType}`}>
          <h3
            id={`toc-${section.articleType}`}
            className="meta-label border-b border-foreground pb-2 text-foreground"
          >
            {articleTypes[section.articleType].plural}
          </h3>
          <ol className="divide-y">
            {section.articles.map((article) => (
              <li key={article._id} className="py-4">
                <Link href={`/articles/${article.slug}`} className="group block">
                  <span className="flex items-baseline gap-3">
                    <span className="font-serif text-lg leading-snug group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 md:text-[1.1875rem]">
                      {article.title}
                    </span>
                    <span
                      aria-hidden
                      className="hidden min-w-8 flex-1 translate-y-[-0.3em] border-b border-dotted border-foreground/50 sm:block"
                    />
                    <span className="meta-label shrink-0 normal-case text-muted-foreground">
                      {article.articleNumber}
                    </span>
                  </span>
                  {!compact ? (
                    <span className="mt-1.5 block text-sm text-muted-foreground">
                      {authorList(article.authors, 4)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
