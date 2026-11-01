"use client";

import { useMutation, useQuery } from "convex/react";
import { UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RECOMMENDATION_LABELS } from "@/convex/lib/labels";
import { normalizeEmail } from "@/convex/lib/text";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatShortDate, typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { AbstractList, DecisionCard, FilesByVersion, Prose, RecordSection, ScoreMeter, TermList, Timeline } from "../record";
import { CRITERIA } from "../reviews/report-form";
import { ManuscriptStatusMark, ReviewStatusMark } from "../status";
import { daysAgo, dueIn, dueLabel, useNow } from "../time";
import type { EditorDetail } from "../types";
import { useViewer } from "../viewer-context";
import { DecisionPanel } from "./decision-panel";
import { InviteReviewerDialog } from "./invite-dialog";

const ASSIGNABLE = new Set(["submitted", "with_editor", "under_review", "revision_requested", "accepted"]);
const REVIEWABLE = new Set(["with_editor", "under_review"]);

export function EditorWorkspace() {
  const { id } = useParams<{ id: string }>();
  const manuscriptId = id as Id<"manuscripts">;
  const router = useRouter();
  const viewer = useViewer();
  const detail = useQuery(api.manuscripts.get, { manuscriptId });
  const now = useNow();

  const isAuthorView = detail?.view === "author";
  useEffect(() => {
    if (isAuthorView) router.replace(`/dashboard/submissions/${manuscriptId}`);
  }, [isAuthorView, manuscriptId, router]);
  if (detail === undefined || detail.view === "author") return <PageSkeleton />;

  const m = detail.manuscript;
  const { canManage } = detail.permissions;
  const canInvite = canManage && REVIEWABLE.has(m.status);
  const current = detail.reviews.filter((r) => r.version === m.version && r.status !== "cancelled");

  return (
    <>
      <PageHeader
        eyebrow={[m.code, typeLabel(m.articleType), `Version ${m.version}`].join(" · ")}
        title={m.title}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ManuscriptStatusMark status={m.status} className="text-foreground" />
            {m.submittedAt ? (
              <span>
                {m.version > 1 ? "Revision received" : "Submitted"} {formatShortDate(m.submittedAt)} ·{" "}
                {daysAgo(m.submittedAt, now)}
              </span>
            ) : null}
          </span>
        }
      />

      <div className="grid gap-x-10 gap-y-10 py-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs defaultValue="manuscript" className="min-w-0 gap-0">
          <TabsList variant="line" className="w-full justify-start gap-6 overflow-x-auto border-b">
            <TabsTrigger value="manuscript" className="flex-none px-0">
              Manuscript
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-none px-0">
              Reviews <Count n={detail.reviews.filter((r) => r.status !== "cancelled").length} />
            </TabsTrigger>
            <TabsTrigger value="decisions" className="flex-none px-0">
              Decisions <Count n={detail.decisions.length} />
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-none px-0">
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manuscript" className="space-y-10 pt-8">
            <ManuscriptTab detail={detail} canInvite={canInvite} />
          </TabsContent>
          <TabsContent value="reviews" className="pt-8">
            <ReviewsTab detail={detail} canManage={canManage} />
          </TabsContent>
          <TabsContent value="decisions" className="space-y-6 pt-8">
            {detail.decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions yet.</p>
            ) : (
              [...detail.decisions]
                .sort((a, b) => b.decidedAt - a.decidedAt)
                .map((d) => <DecisionCard key={d._id} decision={d} />)
            )}
          </TabsContent>
          <TabsContent value="history" className="pt-8">
            <Timeline events={detail.events} />
          </TabsContent>
        </Tabs>

        <aside className="space-y-6 max-xl:order-first xl:sticky xl:top-8 xl:self-start">
          <EditorPanel detail={detail} />
          {canInvite || current.length > 0 ? (
            <section className="rounded-card border">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
                <h2 className="text-sm font-semibold">Reviewers · version {m.version}</h2>
              </div>
              <div className="space-y-4 p-5">
                {current.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No one has been invited yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {current.map((r) => (
                      <li key={r._id} className="text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 truncate font-medium">{r.reviewer?.name ?? "Former user"}</span>
                          <ReviewStatusMark status={r.status} overdue={r.overdue} className="pt-0.5" />
                        </div>
                        <p className={cn("text-xs", r.overdue ? "text-warning" : "text-muted-foreground")}>
                          {r.status === "submitted"
                            ? [
                                r.recommendation ? RECOMMENDATION_LABELS[r.recommendation] : "Report in",
                                r.submittedAt ? formatShortDate(r.submittedAt) : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : r.status === "declined"
                              ? "Declined"
                              : dueLabel(r.dueAt, now)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {canInvite ? (
                  <InviteReviewerDialog
                    detail={detail}
                    trigger={
                      <Button variant="outline" className="w-full">
                        <UserPlusIcon />
                        Invite reviewer
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </section>
          ) : null}
          {canManage ? <DecisionPanel detail={detail} editorName={viewer.name} /> : null}
          <ProductionLinks detail={detail} />
        </aside>
      </div>
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="font-mono text-xs text-muted-foreground tabular-nums">{n}</span>;
}

function EditorPanel({ detail }: { detail: EditorDetail }) {
  const m = detail.manuscript;
  const { canTake, isAdmin, viewerId, canManage } = detail.permissions;
  const assign = useMutation(api.editorial.assignEditor);
  const editors = useQuery(api.users.editors, isAdmin ? {} : "skip");
  const [pending, setPending] = useState(false);
  const assignable = ASSIGNABLE.has(m.status);
  const authorEmails = new Set(m.authors.map((a) => normalizeEmail(a.email)));

  async function assignTo(editorId: Id<"users">) {
    setPending(true);
    try {
      await assign({ manuscriptId: m._id, editorId });
      toast.success(editorId === viewerId ? "Assigned to you" : "Handling editor changed");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card border">
      <div className="border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">Handling editor</h2>
      </div>
      <div className="space-y-4 p-5">
        {detail.handlingEditor ? (
          <div className="text-sm">
            <p className="font-medium">
              {detail.handlingEditor.name}
              {detail.handlingEditor._id === viewerId ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
            </p>
            <p className="truncate text-muted-foreground">{detail.handlingEditor.email}</p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-2 bg-warning" />
            Unassigned
          </p>
        )}
        {assignable && canTake && !isAdmin ? (
          <Button className="w-full" disabled={pending} onClick={() => assignTo(viewerId)}>
            Assign to me
          </Button>
        ) : null}
        {assignable && isAdmin ? (
          <div className="space-y-2">
            <Select
              value={m.handlingEditorId ?? ""}
              onValueChange={(value) => assignTo(value as Id<"users">)}
              disabled={pending || editors === undefined}
            >
              <SelectTrigger className="w-full" aria-label="Choose the handling editor">
                <SelectValue placeholder={m.handlingEditorId ? undefined : "Choose an editor"} />
              </SelectTrigger>
              <SelectContent>
                {(editors ?? []).map((e) => {
                  const conflicted = authorEmails.has(normalizeEmail(e.email)) || e._id === m.submitterId;
                  return (
                    <SelectItem key={e._id} value={e._id} disabled={conflicted}>
                      {e.name}
                      {e._id === viewerId ? " (you)" : ""}
                      {conflicted ? " · author" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {!m.handlingEditorId ? (
              <Button variant="outline" className="w-full" disabled={pending} onClick={() => assignTo(viewerId)}>
                Assign to me
              </Button>
            ) : null}
          </div>
        ) : null}
        {!canManage && detail.handlingEditor ? (
          <p className="text-sm text-muted-foreground">
            Only the handling editor or the editor-in-chief can invite reviewers and make decisions.
          </p>
        ) : null}
        {detail.submitter ? (
          <div className="border-t pt-4 text-sm">
            <p className="text-muted-foreground">Submitted by</p>
            <p className="mt-0.5 font-medium">{detail.submitter.name}</p>
            <p className="truncate text-muted-foreground">{detail.submitter.email}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProductionLinks({ detail }: { detail: EditorDetail }) {
  const m = detail.manuscript;
  if (m.status === "accepted" && detail.permissions.canManage) {
    return (
      <section className="rounded-card border p-5">
        <h2 className="text-sm font-semibold">Production</h2>
        <p className="mt-1 text-sm text-muted-foreground">Accepted {m.acceptedAt ? formatDate(m.acceptedAt) : ""}. Prepare the article for publication.</p>
        <Button asChild variant="brand" className="mt-4 w-full">
          <Link href={`/dashboard/production/${m._id}`}>Prepare the article</Link>
        </Button>
      </section>
    );
  }
  if (m.status === "published" && m.articleId) {
    return (
      <section className="rounded-card border p-5">
        <h2 className="text-sm font-semibold">Published</h2>
        <div className="mt-3 flex flex-col gap-2">
          {detail.articleSlug ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/articles/${detail.articleSlug}`}>View on the site</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/dashboard/production/articles/${m.articleId}`}>Edit the article</Link>
          </Button>
        </div>
      </section>
    );
  }
  return null;
}

function ManuscriptTab({ detail, canInvite }: { detail: EditorDetail; canInvite: boolean }) {
  const m = detail.manuscript;
  const d = m.declarations;
  return (
    <>
      <RecordSection title="Abstract">
        <AbstractList sections={m.abstractSections} />
      </RecordSection>
      <RecordSection title="Keywords and subjects">
        <TermList
          items={[
            ["Keywords", m.keywords.join(", ")],
            ["Subject areas", m.subjects.join(", ")],
          ]}
        />
      </RecordSection>
      <RecordSection title="Authors" description="Hidden from reviewers.">
        <ol className="divide-y border-y">
          {m.authors.map((a, i) => (
            <li key={`${a.email}-${i}`} className="grid gap-1 py-3 text-sm sm:grid-cols-[13rem_1fr] sm:gap-5">
              <p className="font-medium">
                {i + 1}. {a.name}
                {a.isCorresponding ? <span className="ml-2 meta-label text-muted-foreground">Corresp.</span> : null}
              </p>
              <p className="text-muted-foreground">
                {a.affiliation} · {a.email}
                {a.orcid ? ` · ORCID ${a.orcid}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </RecordSection>
      <RecordSection title="Files">
        <FilesByVersion files={detail.files} currentVersion={m.version} />
      </RecordSection>
      <RecordSection title="Declarations">
        <TermList
          items={[
            ["Ethics approval", d.ethics],
            ["Patient consent", d.consent],
            ["Competing interests", d.conflicts],
            ["Funding", d.funding],
            ["Data availability", d.dataAvailability],
            ["Use of AI tools", d.aiUse],
            ["Originality", d.originality ? "Confirmed by the authors" : ""],
          ]}
        />
      </RecordSection>
      <RecordSection title="Cover letter">
        {m.coverLetter ? <Prose>{m.coverLetter}</Prose> : <p className="text-sm text-muted-foreground">None.</p>}
      </RecordSection>
      <RecordSection title="Suggested reviewers">
        {m.suggestedReviewers.length === 0 ? (
          <p className="text-sm text-muted-foreground">None suggested.</p>
        ) : (
          <ul className="divide-y border-y">
            {m.suggestedReviewers.map((r, i) => (
              <li key={`${r.email}-${i}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground">{[r.affiliation, r.email].filter(Boolean).join(" · ")}</p>
                  {r.reason ? <p className="mt-1">{r.reason}</p> : null}
                </div>
                {canInvite ? (
                  <InviteReviewerDialog
                    detail={detail}
                    prefill={{ name: r.name, email: r.email, affiliation: r.affiliation }}
                    trigger={
                      <Button variant="outline" size="sm">
                        Invite
                      </Button>
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </RecordSection>
    </>
  );
}

function ReviewsTab({ detail, canManage }: { detail: EditorDetail; canManage: boolean }) {
  const m = detail.manuscript;
  const now = useNow();
  const versions = [...new Set(detail.reviews.map((r) => r.version))].sort((a, b) => b - a);
  if (versions.length === 0) return <p className="text-sm text-muted-foreground">No reviewers have been invited.</p>;
  return (
    <div className="space-y-10">
      {versions.map((version) => (
        <section key={version} className="space-y-4">
          <h3 className="meta-label text-foreground">
            Version {version}
            {version === m.version ? <span className="text-muted-foreground"> · current</span> : null}
          </h3>
          {detail.reviews
            .filter((r) => r.version === version)
            .sort((a, b) => a.invitedAt - b.invitedAt)
            .map((r) => (
              <article key={r._id} className="rounded-card border">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium">{r.reviewer?.name ?? "Former user"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[r.reviewer?.affiliation, r.reviewer?.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ReviewStatusMark status={r.status} overdue={r.overdue} className="pt-1" />
                </header>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-4">
                  <Dated label="Invited" at={r.invitedAt} />
                  <Dated label="Responded" at={r.respondedAt} />
                  <div>
                    <dt className="text-muted-foreground">Due</dt>
                    <dd>
                      {formatShortDate(r.dueAt)}
                      {r.status === "invited" || r.status === "accepted" ? (
                        <span className={cn("block text-xs", r.overdue ? "text-warning" : "text-muted-foreground")}>
                          {dueIn(r.dueAt, now)}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <Dated label="Report" at={r.submittedAt} />
                </dl>
                {r.status === "submitted" ? (
                  <div className="space-y-5 border-t px-5 py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-4">
                      <p className="text-sm">
                        Recommends{" "}
                        <strong className="font-semibold">
                          {r.recommendation ? RECOMMENDATION_LABELS[r.recommendation].toLowerCase() : "nothing"}
                        </strong>
                      </p>
                    </div>
                    {r.scores ? (
                      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                        {CRITERIA.map((c) => (
                          <div key={c.key} className="flex items-center justify-between gap-4 text-sm">
                            <dt className="text-muted-foreground">{c.label}</dt>
                            <dd>
                              <ScoreMeter value={r.scores![c.key]} label={c.label} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <div>
                      <h4 className="meta-label text-muted-foreground">Comments to the authors</h4>
                      <Prose className="mt-2">{r.commentsToAuthor}</Prose>
                    </div>
                    {r.confidentialComments ? (
                      <div className="bg-muted px-4 py-3.5">
                        <h4 className="meta-label text-muted-foreground">For the editors only</h4>
                        <Prose className="mt-2">{r.confidentialComments}</Prose>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {r.status === "declined" && r.declineReason ? (
                  <div className="border-t px-5 py-4 text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    {r.declineReason}
                  </div>
                ) : null}
                {canManage && (r.status === "invited" || r.status === "accepted") ? (
                  <footer className="flex justify-end border-t px-5 py-3">
                    <CancelInvitation assignmentId={r._id} name={r.reviewer?.name ?? "this reviewer"} />
                  </footer>
                ) : null}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}

function Dated({ label, at }: { label: string; at?: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{at ? formatShortDate(at) : "—"}</dd>
    </div>
  );
}

function CancelInvitation({ assignmentId, name }: { assignmentId: Id<"reviewAssignments">; name: string }) {
  const cancel = useMutation(api.reviews.cancel);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Cancel invitation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel the invitation to {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They lose access to the manuscript files, and any report they started is not sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              try {
                await cancel({ assignmentId });
                toast.success("Invitation cancelled");
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
          >
            Cancel invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
