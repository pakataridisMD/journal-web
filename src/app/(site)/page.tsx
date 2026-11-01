import Link from "next/link";
import { ArticleList } from "@/components/site/article-row";
import { IssueCover } from "@/components/site/issue-cover";
import { IssueToc } from "@/components/site/issue-toc";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { journal } from "@/config/journal";
import {
  getCurrentIssue,
  getFeaturedArticles,
  getLatestArticles,
  type ArticleCard,
} from "@/lib/data";
import { authorList, formatMonthYear, formatShortDate, issueLabel, typeLabel } from "@/lib/format";

export default async function HomePage() {
  const [featured, latest, issue] = await Promise.all([
    getFeaturedArticles(3),
    getLatestArticles(8),
    getCurrentIssue(),
  ]);

  const leadPool = featured.length > 0 ? featured : latest.slice(0, 3);
  const [lead, ...secondary] = leadPool;
  const shownIds = new Set(leadPool.map((a) => a._id));
  const rest = latest.filter((a) => !shownIds.has(a._id)).slice(0, 6);

  return (
    <>
      <h1 className="sr-only">{journal.name}</h1>
      <div className="border-b">
        <div className="page-container flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
          <p className="meta-label text-muted-foreground">{journal.tagline}</p>
          {issue ? (
            <Link
              href={`/issues/${issue.volume}/${issue.number}`}
              className="meta-label text-foreground underline-offset-4 hover:underline"
            >
              {issueLabel(issue)}
              {issue.publishedAt ? ` · ${formatMonthYear(issue.publishedAt)}` : ""}
            </Link>
          ) : null}
        </div>
      </div>

      {lead ? (
        <section aria-label="Featured research" className="page-container">
          <div className="grid gap-y-10 border-b py-10 md:py-14 lg:grid-cols-12 lg:gap-x-12">
            <LeadArticle article={lead} />
            {secondary.length > 0 ? (
              <div className="divide-y border-t lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-12">
                {secondary.map((article) => (
                  <SecondaryArticle key={article._id} article={article} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <EmptyJournal />
      )}

      {rest.length > 0 || issue ? (
        <div className="page-container grid gap-x-12 gap-y-14 py-14 lg:grid-cols-12">
          {rest.length > 0 ? (
            <section aria-labelledby="latest-heading" className="lg:col-span-8">
              <SectionHeading id="latest-heading" href="/articles" linkLabel="All articles">
                Latest articles
              </SectionHeading>
              <ArticleList articles={rest} />
            </section>
          ) : null}
          {issue ? (
            <section
              aria-labelledby="issue-heading"
              className={rest.length > 0 ? "lg:col-span-4" : "lg:col-span-12"}
            >
              <SectionHeading id="issue-heading" href="/issues" linkLabel="Archive">
                Current issue
              </SectionHeading>
              <Link
                href={`/issues/${issue.volume}/${issue.number}`}
                className="mt-6 block max-w-[18rem] transition-opacity hover:opacity-90"
              >
                <IssueCover issue={issue} articles={issue.sections.flatMap((s) => s.articles)} />
                <span className="sr-only">{issueLabel(issue)}</span>
              </Link>
              <div className="mt-8">
                <IssueToc sections={issue.sections} compact />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}


      <ForAuthorsBand />
    </>
  );
}

function LeadArticle({ article }: { article: ArticleCard }) {
  return (
    <article className="group relative lg:col-span-7">
      <p className="meta-label flex flex-wrap gap-x-3 text-muted-foreground">
        <span className="text-foreground">{typeLabel(article.articleType)}</span>
        <time dateTime={new Date(article.publishedAt).toISOString()}>
          {formatShortDate(article.publishedAt)}
        </time>
      </p>
      <h2 className="mt-4 font-serif text-[2rem] leading-[1.08] tracking-[-0.025em] md:text-display lg:text-[2.75rem]">
        <Link
          href={`/articles/${article.slug}`}
          className="decoration-2 underline-offset-[6px] after:absolute after:inset-0 group-hover:underline"
        >
          {article.title}
        </Link>
      </h2>
      <p className="mt-4 text-sm text-muted-foreground">{authorList(article.authors, 4)}</p>
      <p className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-relaxed text-pretty">
        {article.snippet}
      </p>
      <p className="mt-6 text-sm font-medium">
        Read the article <span aria-hidden>→</span>
      </p>
    </article>
  );
}

function SecondaryArticle({ article }: { article: ArticleCard }) {
  return (
    <article className="group relative py-6 first:pt-6 lg:first:pt-0 lg:last:pb-0">
      <p className="meta-label text-muted-foreground">
        <span className="text-foreground">{typeLabel(article.articleType)}</span>
      </p>
      <h2 className="mt-2.5 font-serif text-title leading-snug">
        <Link
          href={`/articles/${article.slug}`}
          className="decoration-1 underline-offset-[5px] after:absolute after:inset-0 group-hover:underline"
        >
          {article.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{authorList(article.authors)}</p>
      <p className="mt-3 line-clamp-3 font-serif text-[1.0625rem] leading-relaxed text-foreground/85">
        {article.snippet}
      </p>
    </article>
  );
}


function EmptyJournal() {
  return (
    <section className="page-container border-b py-20">
      <p className="meta-label text-muted-foreground">Now accepting submissions</p>
      <h2 className="mt-4 max-w-3xl font-serif text-display">
        The first articles are in review.
      </h2>
      <p className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-relaxed">
        {journal.description}
      </p>
    </section>
  );
}

const PROMISES = [
  { label: "Review", text: "Double-blind, by clinicians who practice in your field." },
  { label: "Speed", text: "A first decision within 30 days of submission." },
  { label: "Access", text: "Free to read and free to publish, under CC BY 4.0." },
] as const;

function ForAuthorsBand() {
  return (
    <section aria-labelledby="authors-heading" className="border-t bg-background">
      <div className="page-container grid gap-10 py-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="meta-label text-muted-foreground">For authors</p>
          <h2 id="authors-heading" className="mt-4 font-serif text-headline md:text-display">
            Send us the study that changed how you practice.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/dashboard/submissions/new">Submit a manuscript</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/for-authors">Guide for authors</Link>
            </Button>
          </div>
        </div>
        <dl className="grid content-start gap-0 divide-y border-y lg:col-span-6 lg:col-start-7">
          {PROMISES.map((p) => (
            <div key={p.label} className="grid gap-1 py-5 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <dt className="meta-label pt-1 text-muted-foreground">{p.label}</dt>
              <dd className="font-serif text-xl leading-snug">{p.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
