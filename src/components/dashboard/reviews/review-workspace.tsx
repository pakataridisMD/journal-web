"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RECOMMENDATION_LABELS } from "@/convex/lib/labels";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatShortDate, typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { AbstractList, FileRow, Prose, RecordSection, ScoreMeter, TermList } from "../record";
import { ReviewStatusMark } from "../status";
import { dueIn, useNow } from "../time";
import type { AssignmentDetail } from "../types";
import { CRITERIA, ReportForm } from "./report-form";

export function ReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = id as Id<"reviewAssignments">;
  const data = useQuery(api.reviews.getAssignment, { assignmentId });
  const now = useNow();
  if (data === undefined) return <PageSkeleton />;

  const { assignment: a, manuscript: m } = data;
  const open = a.status === "invited" || a.status === "accepted";
  const overdue = open && a.dueAt < now;

  return (
    <>
      <PageHeader
        eyebrow={[m.code, typeLabel(m.articleType), `Version ${a.version}`].filter(Boolean).join(" · ")}
        title={m.title}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ReviewStatusMark status={a.status} overdue={overdue} className="text-foreground" />
            {open ? (
              <span className={cn(overdue && "text-warning")}>
                Report due {formatDate(a.dueAt)} · {dueIn(a.dueAt, now)}
              </span>
            ) : null}
          </span>
        }
      />

      {a.status === "invited" ? <Invitation data={data} /> : null}
      {a.status === "declined" ? (
        <Notice title="You declined this invitation">
          {a.declineReason ? `Your note to the editor: “${a.declineReason}”` : "Thank you for letting the editor know."}
        </Notice>
      ) : null}
      {a.status === "cancelled" ? (
        <Notice title="The editor closed this invitation">
          The review round ended or the editor found another reviewer. No report is needed.
        </Notice>
      ) : null}
      {a.status === "submitted" ? (
        <Notice title="Report submitted" tone="good">
          Sent {a.submittedAt ? formatDate(a.submittedAt) : ""}. Thank you for your time; the editor will be in
          touch if there is a revised version to read.
        </Notice>
      ) : null}

      <div
        className={cn(
          "grid gap-x-12 gap-y-12 py-8",
          a.status === "accepted" && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        )}
      >
        <div className="min-w-0 space-y-10">
          <ManuscriptRecord data={data} />
        </div>
        {a.status === "accepted" ? (
          <section aria-labelledby="report-heading" className="min-w-0">
            <div className="border-t pt-5">
              <h2 id="report-heading" className="font-serif text-title">
                Your report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Invited by {a.invitedByName} on {formatShortDate(a.invitedAt)}.
              </p>
            </div>
            <div className="mt-8">
              <ReportForm
                assignmentId={a._id}
                initial={{
                  recommendation: a.recommendation,
                  scores: a.scores,
                  commentsToAuthor: a.commentsToAuthor,
                  confidentialComments: a.confidentialComments,
                }}
              />
            </div>
          </section>
        ) : null}
        {a.status === "submitted" ? <SubmittedReport data={data} /> : null}
      </div>
    </>
  );
}

function ManuscriptRecord({ data }: { data: AssignmentDetail }) {
  const { assignment: a, manuscript: m, files, earlierReports } = data;
  const canOpenFiles = a.status === "accepted" || a.status === "submitted";
  return (
    <>
      <RecordSection title="Abstract">
        <AbstractList sections={m.abstractSections} />
      </RecordSection>
      <RecordSection title={`Files for version ${a.version}`}>
        {canOpenFiles ? (
          files.length > 0 ? (
            <ul className="divide-y border-y">
              {files.map((file) => (
                <FileRow key={file._id} file={file} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files are attached to this version.</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            The manuscript files open here once you accept the invitation.
          </p>
        )}
      </RecordSection>
      <RecordSection title="Details">
        <TermList
          items={[
            ["Keywords", m.keywords.join(", ")],
            ["Subject areas", m.subjects.join(", ")],
            ["Ethics approval", m.statements.ethics],
            ["Patient consent", m.statements.consent],
            ["Data availability", m.statements.dataAvailability],
            ["Use of AI tools", m.statements.aiUse],
          ]}
        />
      </RecordSection>
      {earlierReports.length > 0 ? (
        <RecordSection title="Your earlier reports">
          <div className="space-y-4">
            {earlierReports.map((r) => (
              <details key={r.version} className="group rounded-card border">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 px-5 py-3.5">
                  <span className="text-sm font-medium">Version {r.version}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.recommendation ? RECOMMENDATION_LABELS[r.recommendation] : ""}
                    {r.submittedAt ? ` · ${formatShortDate(r.submittedAt)}` : ""}
                  </span>
                </summary>
                <Prose className="border-t px-5 py-4">{r.commentsToAuthor}</Prose>
              </details>
            ))}
          </div>
        </RecordSection>
      ) : null}
    </>
  );
}

function SubmittedReport({ data }: { data: AssignmentDetail }) {
  const a = data.assignment;
  return (
    <section className="min-w-0 space-y-10">
      <RecordSection title="Your report">
        <TermList
          items={[
            ["Recommendation", a.recommendation ? RECOMMENDATION_LABELS[a.recommendation] : ""],
            ...CRITERIA.map(
              (c) =>
                [c.label, a.scores ? <ScoreMeter key={c.key} value={a.scores[c.key]} label={c.label} /> : ""] as const,
            ),
          ]}
        />
      </RecordSection>
      <RecordSection title="Comments to the authors">
        <Prose>{a.commentsToAuthor}</Prose>
      </RecordSection>
      {a.confidentialComments ? (
        <RecordSection title="Confidential comments to the editor">
          <Prose>{a.confidentialComments}</Prose>
        </RecordSection>
      ) : null}
    </section>
  );
}

function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "good";
}) {
  return (
    <section className="mt-8 flex items-start gap-3 rounded-card border px-5 py-4">
      <span
        aria-hidden
        className={cn("mt-1.5 size-2 shrink-0", tone === "good" ? "bg-success" : "bg-muted-foreground/50")}
      />
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </section>
  );
}

function Invitation({ data }: { data: AssignmentDetail }) {
  const a = data.assignment;
  const respond = useMutation(api.reviews.respond);
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    try {
      await respond({ assignmentId: a._id, accept: true });
      toast.success("Thank you. The manuscript files are now open.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 rounded-card border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">Invitation from {a.invitedByName}</h2>
        <p className="text-sm text-muted-foreground">Sent {formatShortDate(a.invitedAt)}</p>
      </div>
      <div className="space-y-5 p-5">
        {a.message ? <Prose>{a.message}</Prose> : null}
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Read the abstract below. If you accept, the manuscript opens here and your report is due by{" "}
          {formatDate(a.dueAt)}. Please decline if you have a conflict of interest, or can’t report in time.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="brand" onClick={accept} disabled={pending}>
            Accept and review
          </Button>
          <DeclineDialog assignmentId={a._id} />
        </div>
      </div>
    </section>
  );
}

function DeclineDialog({ assignmentId }: { assignmentId: Id<"reviewAssignments"> }) {
  const respond = useMutation(api.reviews.respond);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Decline</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this invitation?</DialogTitle>
          <DialogDescription>The editor will invite someone else.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await respond({ assignmentId, accept: false, declineReason: reason });
              toast.success("Invitation declined");
              setOpen(false);
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="decline-reason">
              Note to the editor <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. A conflict of interest, or a colleague who could review instead."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              Decline invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
