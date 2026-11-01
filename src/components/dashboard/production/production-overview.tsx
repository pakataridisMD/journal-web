"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatShortDate, shortIssueLabel, typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { useViewer } from "../viewer-context";

export function ProductionOverview() {
  const viewer = useViewer();
  const accepted = useQuery(api.manuscripts.queue, { bucket: "accepted" });
  const issues = useQuery(api.issues.listAll);
  const articles = usePaginatedQuery(api.articles.listAll, {}, { initialNumItems: 25 });
  const issueById = new Map((issues ?? []).map((i) => [i._id, i]));

  return (
    <>
      <PageHeader
        title="Production"
        description="Turn accepted manuscripts into articles, and keep published articles up to date."
      />
      <div className="space-y-14 py-8">
        <section>
          <h2 className="meta-label text-foreground">
            Ready to publish {accepted ? <span className="text-muted-foreground">({accepted.length})</span> : null}
          </h2>
          {accepted === undefined ? (
            <PageSkeleton />
          ) : accepted.length === 0 ? (
            <p className="mt-3 border-y py-6 text-sm text-muted-foreground">
              No accepted manuscripts are waiting. They appear here as soon as an editor accepts one.
            </p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {accepted.map((row) => {
                const canPublish = row.isMine || viewer.isAdmin;
                return (
                  <li key={row._id} className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[8.5rem_minmax(0,1fr)_auto] md:items-center">
                    <span className="font-mono text-sm">{row.code}</span>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/editorial/${row._id}`}
                        className="font-serif text-[1.0625rem] leading-snug underline-offset-4 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {typeLabel(row.articleType)} · {row.isMine ? "You" : (row.handlingEditorName ?? "Unassigned")}
                      </p>
                    </div>
                    {canPublish ? (
                      <Button asChild size="sm">
                        <Link href={`/dashboard/production/${row._id}`}>Prepare the article</Link>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">With {row.handlingEditorName ?? "its editor"}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="meta-label text-foreground">Articles</h2>
          {articles.status === "LoadingFirstPage" ? (
            <PageSkeleton />
          ) : articles.results.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No articles yet">Published articles will be listed here.</EmptyState>
            </div>
          ) : (
            <>
              <div
                aria-hidden
                className="mt-3 hidden border-b pb-2 text-xs text-muted-foreground lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)_8rem_6rem_5rem_6.5rem] lg:gap-x-5"
              >
                <span>Number</span>
                <span>Article</span>
                <span>Issue</span>
                <span>On site</span>
                <span className="text-right">Views</span>
                <span className="text-right">Downloads</span>
              </div>
              <ul className="divide-y border-b max-lg:mt-3 max-lg:border-t">
                {articles.results.map((a) => {
                  const issue = a.issueId ? issueById.get(a.issueId) : undefined;
                  return (
                    <li
                      key={a._id}
                      className="relative grid gap-x-5 gap-y-1 py-3.5 hover:bg-accent/50 lg:grid-cols-[6.5rem_minmax(0,1fr)_8rem_6rem_5rem_6.5rem] lg:items-center"
                    >
                      <span className="font-mono text-sm">{a.articleNumber}</span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/production/articles/${a._id}`}
                          className="block font-serif text-[1.0625rem] leading-snug underline-offset-4 after:absolute after:inset-0 hover:underline"
                        >
                          {a.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {typeLabel(a.articleType)} · {formatShortDate(a.publishedAt)}
                          {a.featured ? " · Featured" : ""}
                          {a.hasPdf ? "" : " · No PDF"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {issue ? `${shortIssueLabel(issue)}${issue.status === "draft" ? " (draft)" : ""}` : "Online first"}
                      </span>
                      <span className={cn("text-sm", a.status === "hidden" && "text-warning")}>
                        {a.status === "published" ? "Published" : "Hidden"}
                      </span>
                      <span className="text-sm tabular-nums lg:text-right">{a.views.toLocaleString("en-US")}</span>
                      <span className="text-sm tabular-nums lg:text-right">{a.downloads.toLocaleString("en-US")}</span>
                    </li>
                  );
                })}
              </ul>
              {articles.status === "CanLoadMore" || articles.status === "LoadingMore" ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    disabled={articles.status === "LoadingMore"}
                    onClick={() => articles.loadMore(25)}
                  >
                    {articles.status === "LoadingMore" ? "Loading…" : "Show more"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  );
}
