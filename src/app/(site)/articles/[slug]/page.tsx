import { MailIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { articleArt, subjectArt } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import { Plate } from "@/components/art/plate";
import { CopyButton } from "@/components/site/cite-button";
import { Markdown } from "@/components/site/markdown";
import { ReviewTrail } from "@/components/site/review-trail";
import { StructuredAbstract } from "@/components/site/structured-abstract";
import { TypeLabel } from "@/components/site/type-label";
import { PdfLink, ViewTracker } from "@/components/site/view-tracker";
import { Skeleton } from "@/components/ui/skeleton";
import { journal } from "@/config/journal";
import { getArticle, getRecentSlugs, type PublicArticle } from "@/lib/data";
import { citation, formatDate, isoDate, issueLabel } from "@/lib/format";
import { siteUrl } from "@/lib/site";

const PLACEHOLDER = "__placeholder__";

export async function generateStaticParams() {
  const slugs = await getRecentSlugs(200);
  // Cache Components needs at least one param; the placeholder 404s.
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = slug === PLACEHOLDER ? null : await getArticle(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };

  const url = `${siteUrl}/articles/${article.slug}`;
  const description = article.abstractSections.map((s) => s.text).join(" ").slice(0, 300);
  const published = new Date(article.publishedAt);
  const scholarDate = `${published.getUTCFullYear()}/${String(published.getUTCMonth() + 1).padStart(2, "0")}/${String(published.getUTCDate()).padStart(2, "0")}`;

  // Highwire Press tags: how Google Scholar and reference managers index articles.
  const citationTags: Record<string, string | string[]> = {
    citation_title: article.title,
    citation_author: article.authors.map((a) => a.name),
    citation_publication_date: scholarDate,
    citation_online_date: scholarDate,
    citation_journal_title: journal.name,
    citation_journal_abbrev: journal.abbreviation,
    citation_publisher: journal.publisher,
    citation_firstpage: article.articleNumber,
    citation_abstract_html_url: url,
    citation_fulltext_html_url: url,
    citation_language: "en",
    citation_keywords: article.keywords.join("; "),
  };
  if (article.issue) {
    citationTags.citation_volume = String(article.issue.volume);
    citationTags.citation_issue = String(article.issue.number);
  }
  if (article.doi) citationTags.citation_doi = article.doi;
  if (article.pdfUrl) citationTags.citation_pdf_url = article.pdfUrl;

  return {
    title: article.title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url,
      publishedTime: published.toISOString(),
      authors: article.authors.map((a) => a.name),
    },
    other: citationTags,
  };
}

export default function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: { params: PageProps<"/articles/[slug]">["params"] }) {
  const { slug } = await params;
  const article = slug === PLACEHOLDER ? null : await getArticle(slug);
  if (!article) notFound();

  const affiliations = Array.from(new Set(article.authors.map((a) => a.affiliation)));
  const corresponding = article.authors.find((a) => a.isCorresponding && a.email);
  const cite = citation(article);
  const art = articleArt(article);

  return (
    <article className="page-container pb-20">
      <ViewTracker slug={article.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(article) }}
      />

      <header className="grid gap-y-6 border-b py-10 md:py-14 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-9">
          <p className="meta-label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <TypeLabel type={article.articleType} />
            {article.issue ? (
              <Link
                href={`/issues/${article.issue.volume}/${article.issue.number}`}
                className="underline-offset-4 hover:underline"
              >
                {issueLabel(article.issue)}
              </Link>
            ) : (
              <span>Online first</span>
            )}
            <span className="normal-case">{article.articleNumber}</span>
          </p>
          <h1 className="mt-5 font-serif text-[2rem] leading-[1.08] font-[320] tracking-[-0.025em] md:text-display lg:text-[2.875rem]">
            {article.title}
          </h1>
          <AuthorLine authors={article.authors} affiliations={affiliations} />
          <ol className="mt-4 space-y-1 text-sm text-muted-foreground">
            {affiliations.map((affiliation, i) => (
              <li key={affiliation} className="flex gap-2">
                <sup className="pt-2 font-mono text-[0.6875rem]">{i + 1}</sup>
                <span>{affiliation}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="hidden lg:col-span-3 lg:block">
          <Plate glyph={art.glyph} tone={art.tone} width={240} height={200} scale={0.6} />
        </div>
      </header>

      <div className="grid gap-y-12 pt-10 lg:grid-cols-12 lg:gap-x-12">
        <div className="min-w-0 lg:col-span-8">
          <StructuredAbstract sections={article.abstractSections} />
          {article.keywords.length > 0 ? (
            <p className="mt-5 text-sm">
              <span className="meta-label mr-3 text-muted-foreground">Keywords</span>
              {article.keywords.join(" · ")}
            </p>
          ) : null}

          <div className="mt-12 max-w-[42rem]">
            <Markdown>{article.body}</Markdown>
          </div>

          <Declarations article={article} corresponding={corresponding} />

          {article.references.length > 0 ? (
            <section aria-labelledby="references-heading" className="mt-14 max-w-[42rem]">
              <h2
                id="references-heading"
                className="meta-label border-b border-foreground pb-2.5 text-foreground"
              >
                References
              </h2>
              <ol className="mt-5 list-decimal space-y-2.5 pl-6 font-serif text-[0.9375rem] leading-relaxed marker:font-mono marker:text-xs marker:text-muted-foreground">
                {article.references.map((reference, i) => (
                  <li key={i} id={`ref-${i + 1}`} className="pl-1">
                    {reference}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-4" aria-label="Article information">
          <div className="space-y-8 lg:sticky lg:top-6">
            {article.pdfUrl ? <PdfLink slug={article.slug} href={article.pdfUrl} /> : null}

            <section aria-labelledby="cite-heading">
              <h2 id="cite-heading" className="meta-label border-b border-foreground pb-2 text-foreground">
                Cite this article
              </h2>
              <p className="mt-3 font-serif text-[0.9375rem] leading-relaxed break-words">{cite}</p>
              <div className="mt-3">
                <CopyButton text={cite} label="Copy citation" />
              </div>
            </section>

            <section aria-labelledby="history-heading">
              <h2 id="history-heading" className="meta-label border-b border-foreground pb-2 text-foreground">
                Peer review history
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">{journal.reviewModel}.</p>
              <div className="mt-4">
                <ReviewTrail article={article} />
              </div>
            </section>

            <section aria-labelledby="rights-heading">
              <h2 id="rights-heading" className="meta-label border-b border-foreground pb-2 text-foreground">
                Rights
              </h2>
              <p className="mt-3 text-sm leading-relaxed">
                Open access under{" "}
                <a
                  href={journal.license.url}
                  rel="license"
                  className="underline underline-offset-2"
                >
                  {article.license}
                </a>
                . You may share and adapt it with credit to the authors.
              </p>
            </section>

            {article.subjects.length > 0 ? (
              <section aria-labelledby="subjects-heading">
                <h2 id="subjects-heading" className="meta-label border-b border-foreground pb-2 text-foreground">
                  Subjects
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {article.subjects.map((subject) => {
                    const subjectGlyph = subjectArt(subject)?.glyph;
                    return (
                      <li key={subject} className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-sm">
                        {subjectGlyph ? <Glyph name={subjectGlyph} className="-ml-0.5 size-4" /> : null}
                        {subject}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </article>
  );
}

function AuthorLine({
  authors,
  affiliations,
}: {
  authors: PublicArticle["authors"];
  affiliations: string[];
}) {
  return (
    <p className="mt-6 text-[1.0625rem] leading-relaxed">
      {authors.map((author, i) => (
        <span key={`${author.name}-${i}`}>
          <span className="font-medium">{author.name}</span>
          <sup className="ml-0.5 font-mono text-[0.6875rem] text-muted-foreground">
            {affiliations.indexOf(author.affiliation) + 1}
          </sup>
          {author.isCorresponding ? (
            <MailIcon
              aria-label="Corresponding author"
              className="ml-1 inline size-3.5 -translate-y-px text-muted-foreground"
            />
          ) : null}
          {author.orcid ? (
            <a
              href={`https://orcid.org/${author.orcid}`}
              className="ml-1 inline-flex size-4 -translate-y-px items-center justify-center rounded-full bg-[#A6CE39] align-middle font-mono text-[0.5rem] font-medium text-white"
              aria-label={`ORCID iD for ${author.name}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              iD
            </a>
          ) : null}
          {i < authors.length - 1 ? <span className="text-muted-foreground">, </span> : null}
        </span>
      ))}
    </p>
  );
}

function Declarations({
  article,
  corresponding,
}: {
  article: PublicArticle;
  corresponding: PublicArticle["authors"][number] | undefined;
}) {
  type Row = { label: string; value: React.ReactNode };
  const candidates: (Row | null)[] = [
    corresponding?.email
      ? {
          label: "Correspondence",
          value: (
            <>
              {corresponding.name},{" "}
              <a href={`mailto:${corresponding.email}`} className="underline underline-offset-2">
                {corresponding.email}
              </a>
            </>
          ),
        }
      : null,
    article.funding ? { label: "Funding", value: article.funding } : null,
    article.conflicts ? { label: "Competing interests", value: article.conflicts } : null,
    article.dataAvailability ? { label: "Data availability", value: article.dataAvailability } : null,
    { label: "Published", value: formatDate(article.publishedAt) },
  ];
  const rows = candidates.filter((row): row is Row => row !== null);

  return (
    <section aria-labelledby="declarations-heading" className="mt-14 max-w-[42rem]">
      <h2
        id="declarations-heading"
        className="meta-label border-b border-foreground pb-2.5 text-foreground"
      >
        Article information
      </h2>
      <dl className="divide-y">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6">
            <dt className="meta-label pt-0.5 text-muted-foreground">{row.label}</dt>
            <dd className="text-[0.9375rem] leading-relaxed">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function jsonLd(article: PublicArticle): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: article.title,
    name: article.title,
    abstract: article.abstractSections.map((s) => s.text).join(" "),
    datePublished: isoDate(article.publishedAt),
    author: article.authors.map((a) => ({
      "@type": "Person",
      name: a.name,
      affiliation: { "@type": "Organization", name: a.affiliation },
      ...(a.orcid ? { sameAs: `https://orcid.org/${a.orcid}` } : {}),
    })),
    keywords: article.keywords.join(", "),
    license: journal.license.url,
    isAccessibleForFree: true,
    url: `${siteUrl}/articles/${article.slug}`,
    ...(article.doi ? { identifier: `https://doi.org/${article.doi}` } : {}),
    isPartOf: article.issue
      ? {
          "@type": "PublicationIssue",
          issueNumber: article.issue.number,
          isPartOf: {
            "@type": "PublicationVolume",
            volumeNumber: article.issue.volume,
            isPartOf: { "@type": "Periodical", name: journal.name },
          },
        }
      : { "@type": "Periodical", name: journal.name },
    publisher: { "@type": "Organization", name: journal.publisher },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function ArticleSkeleton() {
  return (
    <div className="page-container pb-20" aria-busy="true" aria-label="Loading article">
      <div className="border-b py-10 md:py-14">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-6 h-12 w-full max-w-3xl" />
        <Skeleton className="mt-3 h-12 w-2/3 max-w-2xl" />
        <Skeleton className="mt-8 h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-12 pt-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <div className="space-y-4 lg:col-span-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}
