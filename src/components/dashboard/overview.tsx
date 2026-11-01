"use client";

import { useQuery } from "convex/react";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";
import { PageSkeleton } from "./page-skeleton";
import { roleNames } from "./profile-form";
import { ManuscriptList } from "./submission/submissions-list";
import { dueLabel, timeAgo, useNow } from "./time";
import { useViewer } from "./viewer-context";

type Task = { key: string; href: string; label: string; detail: string; urgent?: boolean };

export function Overview() {
  const viewer = useViewer();
  const now = useNow();
  const mine = useQuery(api.manuscripts.listMine);
  const reviews = useQuery(api.reviews.listMine);
  const counts = useQuery(api.manuscripts.queueCounts, viewer.isEditor ? {} : "skip");

  if (mine === undefined || reviews === undefined || (viewer.isEditor && counts === undefined)) {
    return <PageSkeleton />;
  }

  const tasks: Task[] = [];
  for (const m of mine) {
    if (m.status === "revision_requested") {
      tasks.push({
        key: m._id,
        href: `/dashboard/submissions/${m._id}`,
        label: "Revise and resubmit",
        detail: m.title,
        urgent: true,
      });
    } else if (m.status === "draft") {
      tasks.push({
        key: m._id,
        href: `/dashboard/submissions/${m._id}`,
        label: "Finish your draft",
        detail: `${m.title.trim() || "Untitled submission"} · edited ${timeAgo(m.updatedAt, now)}`,
      });
    }
  }
  for (const r of reviews) {
    if (r.status !== "invited" && r.status !== "accepted") continue;
    tasks.push({
      key: r._id,
      href: `/dashboard/reviews/${r._id}`,
      label: r.status === "invited" ? "Answer a review invitation" : "Write your report",
      detail: `${r.manuscript?.title ?? "Manuscript"} · ${dueLabel(r.dueAt, now).toLowerCase()}`,
      urgent: r.overdue,
    });
  }
  if (counts && counts.new > 0) {
    tasks.push({
      key: "queue-new",
      href: "/dashboard/editorial?tab=new",
      label: counts.new === 1 ? "A new submission needs an editor" : `${counts.new} new submissions need an editor`,
      detail: "Take one, or assign it if you are the editor-in-chief",
    });
  }
  if (counts && counts.accepted > 0) {
    tasks.push({
      key: "queue-accepted",
      href: "/dashboard/production",
      label: counts.accepted === 1 ? "An accepted manuscript is ready for production" : `${counts.accepted} accepted manuscripts are ready for production`,
      detail: "Prepare the article and publish it",
    });
  }

  const recent = mine.slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={roleNames(viewer).join(" · ")}
        title={viewer.name}
        actions={
          <Button asChild variant="brand">
            <Link href="/dashboard/submissions/new">
              <PlusIcon />
              New submission
            </Link>
          </Button>
        }
      />
      <div className="space-y-14 py-8">
        <section aria-labelledby="todo-heading">
          <h2 id="todo-heading" className="meta-label text-foreground">
            To do
          </h2>
          {tasks.length === 0 ? (
            <p className="mt-3 border-y py-6 text-sm text-muted-foreground">Nothing needs you right now.</p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {tasks.map((task) => (
                <li key={task.key} className="group relative flex items-center gap-4 py-4">
                  <span aria-hidden className={cn("size-2 shrink-0", task.urgent ? "bg-warning" : "bg-foreground")} />
                  <div className="min-w-0 flex-1">
                    <Link href={task.href} className="font-medium after:absolute after:inset-0">
                      {task.label}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{task.detail}</p>
                  </div>
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {counts ? (
          <section aria-labelledby="queue-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="queue-heading" className="meta-label text-foreground">
                Editorial queue
              </h2>
              <Link href="/dashboard/editorial" className="text-sm underline-offset-4 hover:underline">
                Open the queue
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-2 border-t border-l sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["new", "New"],
                  ["mine", "Assigned to me"],
                  ["active", "In progress"],
                  ["revision", "Awaiting revision"],
                  ["accepted", "Accepted"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="relative border-r border-b px-4 py-4 hover:bg-accent/60">
                  <dt className="meta-label text-muted-foreground">
                    <Link href={`/dashboard/editorial?tab=${key}`} className="after:absolute after:inset-0">
                      {label}
                    </Link>
                  </dt>
                  <dd className="mt-2 font-serif text-display tabular-nums">{counts[key]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {recent.length > 0 ? (
          <div className="space-y-3">
            <ManuscriptList title="Your recent submissions" rows={recent} />
            {mine.length > recent.length ? (
              <Link href="/dashboard/submissions" className="inline-block text-sm underline-offset-4 hover:underline">
                All {mine.length} submissions
              </Link>
            ) : null}
          </div>
        ) : viewer.isEditor ? null : (
          <section className="rounded-card border p-6">
            <h2 className="font-serif text-title">Submit your first manuscript</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Five short steps: details, authors, files, declarations, and a final check. Your draft saves as you go.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/submissions/new">Start a submission</Link>
            </Button>
          </section>
        )}
      </div>
    </>
  );
}
