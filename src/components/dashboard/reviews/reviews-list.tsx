"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatShortDate, typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { ReviewStatusMark } from "../status";
import { dueLabel, useNow } from "../time";

type Row = FunctionReturnType<typeof api.reviews.listMine>[number];

export function ReviewsList() {
  const rows = useQuery(api.reviews.listMine);
  if (rows === undefined) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Review invitations"
        description="Your reports reach the authors without your name. The editors see who wrote them."
      />
      {rows.length === 0 ? (
        <div className="py-8">
          <EmptyState title="No invitations yet">
            When an editor invites you to review a manuscript, the invitation appears here.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-12 py-8">
          <AssignmentList title="Waiting for your answer" rows={rows.filter((r) => r.status === "invited")} />
          <AssignmentList title="Reports in progress" rows={rows.filter((r) => r.status === "accepted")} />
          <AssignmentList title="Submitted" rows={rows.filter((r) => r.status === "submitted")} />
          <AssignmentList
            title="Closed"
            rows={rows.filter((r) => r.status === "declined" || r.status === "cancelled")}
          />
        </div>
      )}
    </>
  );
}

function AssignmentList({ title, rows }: { title: string; rows: readonly Row[] }) {
  const now = useNow();
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="meta-label text-foreground">
        {title} <span className="text-muted-foreground">({rows.length})</span>
      </h2>
      <ul className="mt-3 divide-y border-y">
        {rows.map((row) => {
          const href = `/dashboard/reviews/${row._id}`;
          const open = row.status === "invited" || row.status === "accepted";
          const action = row.status === "invited" ? "Respond" : row.status === "accepted" ? "Write report" : "View";
          return (
            <li
              key={row._id}
              className="relative grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_12rem_9rem_7.5rem] md:items-center"
            >
              <div className="min-w-0">
                <p className="meta-label text-pretty text-muted-foreground">
                  <span className="normal-case">{row.manuscript?.code ?? "Manuscript"}</span>
                  {row.manuscript ? ` · ${typeLabel(row.manuscript.articleType)}` : ""}
                  {row.version > 1 ? ` · Version ${row.version}` : ""}
                </p>
                <Link
                  href={href}
                  className="mt-1 block font-serif text-lg leading-snug text-pretty underline-offset-4 after:absolute after:inset-0 hover:underline"
                >
                  {row.manuscript?.title || "Untitled manuscript"}
                </Link>
              </div>
              <ReviewStatusMark status={row.status} overdue={row.overdue} />
              <p className={cn("text-sm", row.overdue ? "text-warning" : "text-muted-foreground")}>
                {open
                  ? dueLabel(row.dueAt, now)
                  : row.submittedAt
                    ? `Sent ${formatShortDate(row.submittedAt)}`
                    : `Invited ${formatShortDate(row.invitedAt)}`}
              </p>
              <div className="relative z-10 md:flex md:justify-end">
                <Button asChild size="sm" variant={open ? "default" : "outline"}>
                  <Link href={href} tabIndex={-1}>
                    {action}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
