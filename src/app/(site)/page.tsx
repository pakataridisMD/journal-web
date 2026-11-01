import Link from "next/link";
import { articleArt, SUBJECT_ART, type Subject } from "@/components/art/catalog";
import { Plate } from "@/components/art/plate";
import { Scene } from "@/components/art/scene";
import { ArticleList } from "@/components/site/article-row";
import { IssueCover } from "@/components/site/issue-cover";
import { IssueToc } from "@/components/site/issue-toc";
import { SectionHeading } from "@/components/site/section-heading";
import { TypeLabel } from "@/components/site/type-label";
import { Button } from "@/components/ui/button";
import { journal, subjects } from "@/config/journal";
import {
  getCurrentIssue,
  getFeaturedArticles,
  getLatestArticles,
  type ArticleCard,
} from "@/lib/data";
import { authorList, formatMonthYear, formatShortDate, issueLabel } from "@/lib/format";

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
          <div className="border-b py-10 md:py-14">
            <LeadArticle article={lead} />
            {secondary.length > 0 ? (
              <div className="mt-10 grid divide-y border-t md:mt-14 md:grid-cols-2 md:divide-x md:divide-y-0">
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
        <div className="page-container grid gap-x-12 gap-y-14 pt-14 lg:grid-cols-12">
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

      <SpecialtiesBand />
      <ForAuthorsBand />
    </>
  );
}

/** The cover story: text on the left, its subject's plate on the right. */
function LeadArticle({ article }: { article: ArticleCard }) {
  const art = articleArt(article);
  return (
    <article className="group relative grid gap-y-8 lg:grid-cols-12 lg:gap-x-12">
      <div className="lg:col-span-7">
        <p className="meta-label flex flex-wrap items-center gap-x-3 text-muted-foreground">
          <TypeLabel type={article.articleType} />
          <time dateTime={new Date(article.publishedAt).toISOString()}>
            {formatShortDate(article.publishedAt)}
          </time>
        </p>
        <h2 className="mt-4 font-serif text-[2rem] leading-[1.08] font-[320] tracking-[-0.025em] md:text-display lg:text-[2.75rem]">
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
      </div>
      <div className="-order-1 lg:order-none lg:col-span-5">
        <Plate
          glyph={art.glyph}
          tone={art.tone}
          width={480}
          height={360}
          scale={0.62}
          className="transition-transform duration-500 ease-out group-hover:-rotate-1 motion-reduce:transition-none"
        />
      </div>
    </article>
  );
}

function SecondaryArticle({ article }: { article: ArticleCard }) {
  return (
    <article className="group relative py-6 md:pt-8 md:pb-0 md:odd:pr-12 md:even:pl-12">
      <p className="meta-label text-muted-foreground">
        <TypeLabel type={article.articleType} />
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
    <section className="border-b">
      <div className="page-container grid items-center gap-y-10 py-12 md:py-16 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-6">
          <p className="meta-label text-muted-foreground">Now accepting submissions</p>
          <h2 className="mt-4 max-w-3xl font-serif text-headline md:text-display lg:text-[3.25rem] lg:leading-[1.04]">
            The first articles are in review.
          </h2>
          <p className="mt-5 max-w-xl font-serif text-[1.1875rem] leading-relaxed text-pretty">
            {journal.description}
          </p>
        </div>
        <div className="mx-auto w-full max-w-[34rem] lg:col-span-6">
          <Scene name="closeReading" />
        </div>
      </div>
    </section>
  );
}

/**
 * The journal's scope as an atlas index: every specialty we publish, each
 * with its plate. Informational, not navigation.
 */
function SpecialtiesBand() {
  return (
    <section aria-labelledby="specialties-heading" className="page-container py-14">
      <SectionHeading id="specialties-heading" href="/about#aims" linkLabel="Aims and scope">
        Specialties
      </SectionHeading>
      <ul className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-7">
        {subjects.map((subject) => (
          <Specialty key={subject} subject={subject} />
        ))}
      </ul>
    </section>
  );
}

function Specialty({ subject }: { subject: Subject }) {
  const art = SUBJECT_ART[subject];
  return (
    <li>
      <Plate glyph={art.glyph} tone={art.tone} width={160} height={120} scale={0.6} stroke={2.6} />
      <p className="mt-2 text-[0.8125rem] leading-snug sm:mt-2.5 sm:text-sm">{subject}</p>
    </li>
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
      <div className="page-container grid items-center gap-10 py-16 lg:grid-cols-12 lg:gap-12">
        <div className="mx-auto w-full max-w-[32rem] lg:col-span-5">
          <Scene name="manuscript" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="meta-label text-muted-foreground">For authors</p>
          <h2 id="authors-heading" className="mt-4 font-serif text-headline md:text-display">
            Send us the study that changed how you practice.
          </h2>
          <dl className="mt-8 divide-y border-y">
            {PROMISES.map((p) => (
              <div key={p.label} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-6">
                <dt className="meta-label pt-1 text-muted-foreground">{p.label}</dt>
                <dd className="font-serif text-lg leading-snug">{p.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/dashboard/submissions/new">Submit a manuscript</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/for-authors">Guide for authors</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
