"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ManuscriptStatus } from "@/convex/lib/validators";
import { formatShortDate, typeLabel } from "@/lib/format";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { ManuscriptStatusMark } from "../status";
import { timeAgo, useNow } from "../time";

type Row = FunctionReturnType<typeof api.manuscripts.listMine>[number];

const WITH_JOURNAL: readonly ManuscriptStatus[] = ["submitted", "with_editor", "under_review", "accepted"];
const CLOSED: readonly ManuscriptStatus[] = ["published", "rejected", "withdrawn"];

export function SubmissionsList() {
  const rows = useQuery(api.manuscripts.listMine);
  if (rows === undefined) return <PageSkeleton />;

  const attention = rows.filter((r) => r.status === "revision_requested" || r.status === "draft");
  const withJournal = rows.filter((r) => WITH_JOURNAL.includes(r.status));
  const closed = rows.filter((r) => CLOSED.includes(r.status));

  return (
    <>
      <PageHeader
        title="My submissions"
        description="Drafts, manuscripts with the journal, and decisions."
        actions={
          <Button asChild variant="brand">
            <Link href="/dashboard/submissions/new">
              <PlusIcon />
              New submission
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title="Nothing submitted yet"
            art={{ glyph: "original-research", tone: "vein" }}
            action={
              <Button asChild>
                <Link href="/dashboard/submissions/new">Start a submission</Link>
              </Button>
            }
          >
            Drafts save as you type, so you can start now and finish later.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-12 py-8">
          <ManuscriptList title="Needs your attention" rows={attention} />
          <ManuscriptList title="With the journal" rows={withJournal} />
          <ManuscriptList title="Closed" rows={closed} />
        </div>
      )}
    </>
  );
}

export function ManuscriptList({ title, rows }: { title: string; rows: readonly Row[] }) {
  const now = useNow();
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="meta-label text-foreground">
        {title} <span className="text-muted-foreground">({rows.length})</span>
      </h2>
      <div
        aria-hidden
        className="mt-3 hidden border-b pb-2 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_11rem_9rem_6.5rem] md:gap-x-6"
      >
        <span>Manuscript</span>
        <span>Status</span>
        <span>Updated</span>
        <span />
      </div>
      <ul className="divide-y border-b max-md:mt-3 max-md:border-t">
        {rows.map((row) => {
          const href = `/dashboard/submissions/${row._id}`;
          const action =
            row.status === "draft" ? "Continue" : row.status === "revision_requested" ? "Revise" : "View";
          return (
            <li
              key={row._id}
              className="relative grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_11rem_9rem_6.5rem] md:items-center"
            >
              <div className="min-w-0">
                <p className="meta-label text-pretty text-muted-foreground">
                  {row.code ? <span className="normal-case">{row.code}</span> : "Draft"} · {typeLabel(row.articleType)}
                  {row.version > 1 ? ` · Version ${row.version}` : ""}
                </p>
                <Link
                  href={href}
                  className="mt-1 block font-serif text-lg leading-snug text-pretty underline-offset-4 after:absolute after:inset-0 hover:underline"
                >
                  {row.title.trim() || "Untitled submission"}
                </Link>
              </div>
              <ManuscriptStatusMark status={row.status} />
              <p className="text-sm text-muted-foreground">
                {row.status === "draft" || !row.submittedAt
                  ? `Edited ${timeAgo(row.updatedAt, now)}`
                  : `Submitted ${formatShortDate(row.submittedAt)}`}
              </p>
              <div className="relative z-10 flex gap-2 md:justify-end">
                {row.articleSlug ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/articles/${row.articleSlug}`}>Article</Link>
                  </Button>
                ) : (
                  <Button asChild variant={action === "View" ? "outline" : "default"} size="sm">
                    <Link href={href} tabIndex={-1}>
                      {action}
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
