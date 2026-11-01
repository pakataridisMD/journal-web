"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { formatShortDate, typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { ManuscriptStatusMark } from "../status";
import { dayCount } from "../time";
import type { QueueRow } from "../types";
import { useViewer } from "../viewer-context";

export const QUEUE_TABS = [
  { key: "new", label: "New", empty: "No new submissions are waiting for an editor." },
  { key: "mine", label: "Assigned to me", empty: "Nothing is assigned to you at the moment." },
  { key: "active", label: "In progress", empty: "No manuscripts are with editors or out for review." },
  { key: "revision", label: "Awaiting revision", empty: "No manuscripts are back with their authors." },
  { key: "accepted", label: "Accepted", empty: "No accepted manuscripts are waiting for production." },
  { key: "closed", label: "Closed", empty: "Nothing has been published, rejected or withdrawn yet." },
] as const;

export type QueueBucket = (typeof QUEUE_TABS)[number]["key"];

export function EditorialQueue() {
  const viewer = useViewer();
  const params = useSearchParams();
  const fallback: QueueBucket = viewer.isAdmin ? "new" : "mine";
  const tab = QUEUE_TABS.find((t) => t.key === params.get("tab")) ?? QUEUE_TABS.find((t) => t.key === fallback)!;
  const counts = useQuery(api.manuscripts.queueCounts);
  const rows = useQuery(api.manuscripts.queue, { bucket: tab.key });

  return (
    <>
      <PageHeader
        title="Editorial queue"
        description="Every manuscript with the journal, except those you wrote or co-wrote."
      />
      <nav aria-label="Queue" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-7 border-b">
          {QUEUE_TABS.map((t) => {
            const active = t.key === tab.key;
            const count = t.key === "closed" ? null : counts?.[t.key];
            return (
              <li key={t.key}>
                <Link
                  href={`/dashboard/editorial?tab=${t.key}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 items-center gap-2 text-sm whitespace-nowrap",
                    active
                      ? "font-medium after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {count !== null && count !== undefined ? (
                    <span
                      className={cn(
                        "min-w-5 px-1 text-center font-mono text-xs tabular-nums",
                        count > 0 && (t.key === "new" || t.key === "mine") ? "bg-foreground text-background" : "bg-muted",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows === undefined ? (
        <PageSkeleton />
      ) : rows.length === 0 ? (
        <div className="py-8">
          <EmptyState title="Nothing here">{tab.empty}</EmptyState>
        </div>
      ) : (
        <QueueTable rows={rows} closed={tab.key === "closed"} />
      )}
    </>
  );
}

function QueueTable({ rows, closed }: { rows: readonly QueueRow[]; closed: boolean }) {
  return (
    <div className="py-6">
      <div
        aria-hidden
        className="hidden border-b pb-2 text-xs text-muted-foreground lg:grid lg:grid-cols-[8.5rem_minmax(0,1fr)_10.5rem_9rem_5.5rem] lg:gap-x-5"
      >
        <span>ID</span>
        <span>Manuscript</span>
        <span>Status</span>
        <span>Reviews</span>
        <span className="text-right">{closed ? "Updated" : "Waiting"}</span>
      </div>
      <ul className="divide-y border-b max-lg:border-t">
        {rows.map((row) => (
          <li
            key={row._id}
            className="relative grid gap-x-5 gap-y-1.5 py-3.5 hover:bg-accent/50 lg:grid-cols-[8.5rem_minmax(0,1fr)_10.5rem_9rem_5.5rem] lg:items-center"
          >
            <span className="font-mono text-sm">{row.code}</span>
            <div className="min-w-0">
              <Link
                href={`/dashboard/editorial/${row._id}`}
                className="block font-serif text-[1.0625rem] leading-snug underline-offset-4 after:absolute after:inset-0 hover:underline"
              >
                {row.title}
              </Link>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {typeLabel(row.articleType)}
                {row.version > 1 ? ` · Version ${row.version}` : ""} ·{" "}
                {row.handlingEditorName ? (
                  row.isMine ? (
                    <span className="text-foreground">You</span>
                  ) : (
                    row.handlingEditorName
                  )
                ) : (
                  <span className="text-warning">Unassigned</span>
                )}
              </p>
            </div>
            <ManuscriptStatusMark status={row.status} />
            <ReviewSummary reviews={row.reviews} />
            <span className="text-sm text-muted-foreground tabular-nums lg:text-right">
              {closed ? (
                formatShortDate(row.updatedAt)
              ) : (
                <>
                  <span className="lg:hidden">Waiting </span>
                  {dayCount(row.daysWaiting)}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewSummary({ reviews }: { reviews: QueueRow["reviews"] }) {
  const total = reviews.invited + reviews.accepted + reviews.submitted;
  if (total === 0) return <span className="text-sm text-muted-foreground">No reviewers</span>;
  return (
    <span className="text-sm">
      {reviews.submitted} of {total} {total === 1 ? "report" : "reports"}
      {reviews.overdue > 0 ? <span className="text-warning"> · {reviews.overdue} late</span> : null}
    </span>
  );
}
