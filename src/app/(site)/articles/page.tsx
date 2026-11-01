import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleList } from "@/components/site/article-row";
import { Button } from "@/components/ui/button";
import { articleTypes, type ArticleTypeKey } from "@/config/journal";
import { getArticlePage, searchArticles } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  description: "Every article published in the journal, newest first.",
};

const TYPE_KEYS = Object.keys(articleTypes) as ArticleTypeKey[];

type Search = { q?: string; type?: ArticleTypeKey; cursor?: string };

function parse(params: Record<string, string | string[] | undefined>): Search {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = one(params.type);
  return {
    q: one(params.q)?.trim().slice(0, 200) || undefined,
    type: TYPE_KEYS.includes(type as ArticleTypeKey) ? (type as ArticleTypeKey) : undefined,
    cursor: one(params.cursor) || undefined,
  };
}

function hrefFor(search: Search) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.type) params.set("type", search.type);
  if (search.cursor) params.set("cursor", search.cursor);
  const qs = params.toString();
  return qs ? `/articles?${qs}` : "/articles";
}

export default function ArticlesPage({ searchParams }: PageProps<"/articles">) {
  return (
    <div className="page-container pb-20">
      <header className="border-b py-10 md:py-14">
        <p className="meta-label text-muted-foreground">Browse</p>
        <h1 className="mt-3 font-serif text-headline md:text-display">Articles</h1>
      </header>
      <Suspense fallback={<Controls search={{}} />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Controls({ search }: { search: Search }) {
  return (
    <div className="space-y-5 border-b py-6">
      <Form action="/articles" id="search" role="search" className="flex w-full max-w-xl gap-2">
        {search.type ? <input type="hidden" name="type" value={search.type} /> : null}
        <label htmlFor="article-search" className="sr-only">
          Search articles
        </label>
        <input
          id="article-search"
          name="q"
          type="search"
          defaultValue={search.q}
          placeholder="Search titles, authors, keywords"
          className="h-10 w-full border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit">Search</Button>
      </Form>
      <nav aria-label="Article types">
        <ul className="flex flex-wrap gap-1">
          {[undefined, ...TYPE_KEYS].map((type) => {
            const active = search.type === type;
            return (
              <li key={type ?? "all"}>
                <Link
                  href={hrefFor({ q: search.q, type })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center border px-3 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent hover:border-border",
                  )}
                >
                  {type ? articleTypes[type].plural : "All types"}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/articles">["searchParams"] }) {
  const search = parse(await searchParams);
  if (search.q) {
    const results = await searchArticles(search.q, search.type);
    return (
      <>
        <Controls search={search} />
        <p className="py-5 text-sm text-muted-foreground" aria-live="polite">
          {results.length === 0
            ? `No articles match “${search.q}”.`
            : `${results.length} ${results.length === 1 ? "article matches" : "articles match"} “${search.q}”.`}{" "}
          <Link href={hrefFor({ type: search.type })} className="text-foreground underline underline-offset-4">
            Clear search
          </Link>
        </p>
        {results.length > 0 ? <ArticleList articles={results} headingLevel="h2" /> : null}
      </>
    );
  }

  const page = await getArticlePage(search.type, search.cursor);
  return (
    <>
      <Controls search={search} />
      {page.articles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {search.type
            ? `No ${articleTypes[search.type].plural.toLowerCase()} have been published yet.`
            : "No articles have been published yet."}
        </p>
      ) : (
        <ArticleList articles={page.articles} headingLevel="h2" />
      )}
      <div className="flex justify-between gap-4 pt-8">
        {search.cursor ? (
          <Button asChild variant="outline">
            <Link href={hrefFor({ type: search.type })}>
              <span aria-hidden>←</span> Newest
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {page.continueCursor ? (
          <Button asChild variant="outline">
            <Link href={hrefFor({ type: search.type, cursor: page.continueCursor })}>
              Older articles <span aria-hidden>→</span>
            </Link>
          </Button>
        ) : null}
      </div>
    </>
  );
}
