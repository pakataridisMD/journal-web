import type { Metadata } from "next";
import Link from "next/link";
import { Scene } from "@/components/art/scene";
import { ArticleList } from "@/components/site/article-row";
import { IssueCover } from "@/components/site/issue-cover";
import { SectionHeading } from "@/components/site/section-heading";
import { getOnlineFirst, getPublishedIssues } from "@/lib/data";
import { formatMonthYear, issueLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Issue archive",
  description: "Every published issue of the journal.",
};

export default async function IssuesPage() {
  const [issues, onlineFirst] = await Promise.all([getPublishedIssues(), getOnlineFirst(10)]);
  const volumes = Array.from(new Set(issues.map((i) => i.volume)));

  return (
    <div className="page-container pb-20">
      <header className="border-b py-10 md:py-14">
        <p className="meta-label text-muted-foreground">Archive</p>
        <h1 className="mt-3 font-serif text-headline md:text-display">Issues</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Articles are published online as soon as they are ready, then collected into issues.
          Every article is also listed under{" "}
          <Link href="/articles" className="text-foreground underline underline-offset-4">
            all articles
          </Link>
          .
        </p>
      </header>

      {onlineFirst.length > 0 ? (
        <section aria-labelledby="online-first" className="pt-10">
          <SectionHeading id="online-first">Online first</SectionHeading>
          <p className="mt-3 text-sm text-muted-foreground">
            Peer-reviewed and published, awaiting their place in an issue.
          </p>
          <ArticleList articles={onlineFirst} showSnippet={false} />
        </section>
      ) : null}

      {issues.length === 0 ? (
        <div className="py-14 text-center">
          <div className="mx-auto w-full max-w-xs">
            <Scene name="breath" />
          </div>
          <p className="mt-6 text-muted-foreground">The first issue is in preparation.</p>
        </div>
      ) : (
        volumes.map((volume) => (
          <section key={volume} aria-labelledby={`volume-${volume}`} className="pt-10">
            <h2 id={`volume-${volume}`} className="meta-label border-b border-foreground pb-2.5">
              Volume {volume}
            </h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-10 pt-8 sm:grid-cols-3 lg:grid-cols-5">
              {issues
                .filter((i) => i.volume === volume)
                .map((issue) => (
                  <li key={issue._id}>
                    <Link
                      href={`/issues/${issue.volume}/${issue.number}`}
                      className="group block"
                    >
                      <IssueCover issue={issue} size="sm" className="transition-opacity group-hover:opacity-90" />
                      <p className="mt-3 font-medium group-hover:underline group-hover:underline-offset-4">
                        {issueLabel(issue)}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {issue.publishedAt ? formatMonthYear(issue.publishedAt) : null}
                        {` · ${issue.articleCount} ${issue.articleCount === 1 ? "article" : "articles"}`}
                      </p>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
