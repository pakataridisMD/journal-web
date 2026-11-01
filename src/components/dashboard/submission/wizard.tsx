"use client";

import { useMutation } from "convex/react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
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
import { submissionRules, type FileKindKey } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { revisionIssues, submissionIssues } from "@/convex/lib/submission";
import { errorMessage } from "@/lib/errors";
import { typeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileSlot } from "../file-upload";
import { PageHeader } from "../page-header";
import { DecisionCard } from "../record";
import type { AuthorDetail, FileView } from "../types";
import { SaveIndicatorText, useAutosave } from "../use-autosave";
import { AuthorsStep } from "./authors-step";
import { DeclarationsStep } from "./declarations-step";
import { DetailsStep } from "./details-step";
import { formFrom, issuesByStep, STEP_LABELS, type DraftForm, type StepKey, type UpdateForm } from "./form";
import { ReviewStep } from "./review-step";
import { WithdrawButton } from "./withdraw-button";

const DRAFT_STEPS: readonly StepKey[] = ["details", "authors", "files", "declarations", "review"];
const REVISION_STEPS: readonly StepKey[] = ["decision", "details", "authors", "files", "declarations", "review"];

function stepIntro(step: StepKey, version: number): string {
  switch (step) {
    case "decision":
      return "Read the editor’s letter and the reviewers’ comments first. Then revise the manuscript, replace the files that changed and upload a point-by-point response.";
    case "details":
    case "type":
      return "What the manuscript is about. Editors and reviewers read the title and abstract first.";
    case "authors":
      return "Everyone who meets the authorship criteria, in the order they should appear. Reviewers never see this list.";
    case "files":
      return version > 1
        ? `Your files from version ${version - 1} carried over. Replace the ones that changed, and add your response to the reviewers.`
        : "Reviewers see every file except the title page, so remove author names and affiliations from the manuscript, including from the document properties.";
    case "declarations":
      return "Statements published with the article, and notes only the editors see.";
    case "review":
      return "Check everything once more. After you submit, nothing can be changed unless the editors ask for a revision.";
  }
}

export function SubmissionWizard({
  detail,
  onSubmitted,
  onDelete,
}: {
  detail: AuthorDetail;
  onSubmitted: () => void;
  onDelete: () => void;
}) {
  const m = detail.manuscript;
  const isRevision = m.status === "revision_requested";
  const steps = isRevision ? REVISION_STEPS : DRAFT_STEPS;

  const [form, setForm] = useState<DraftForm>(() => formFrom(m));
  const update: UpdateForm = useCallback((patch) => setForm((current) => ({ ...current, ...patch })), []);
  const updateDraft = useMutation(api.manuscripts.updateDraft);
  const save = useCallback(
    (value: DraftForm) => updateDraft({ manuscriptId: m._id, ...value }),
    [updateDraft, m._id],
  );
  const autosave = useAutosave(form, save);

  const files = detail.files.filter((f) => f.version === m.version);
  const merged = { ...m, ...form };
  const issues = issuesByStep(isRevision ? revisionIssues(merged, files) : submissionIssues(merged, files));
  const totalIssues = [...issues.values()].reduce((n, list) => n + list.length, 0);

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [visited, setVisited] = useState<ReadonlySet<StepKey>>(() => new Set([steps[0]]));
  const topRef = useRef<HTMLDivElement>(null);
  const index = steps.indexOf(step);

  const go = (next: StepKey) => {
    void autosave.flush();
    setStep(next);
    setVisited((v) => new Set(v).add(next));
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const submitDraft = useMutation(api.manuscripts.submit);
  const submitRevision = useMutation(api.manuscripts.submitRevision);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (!(await autosave.flush())) {
        toast.error("Your latest changes weren’t saved. Check your connection and try again.");
        return;
      }
      await (isRevision ? submitRevision : submitDraft)({ manuscriptId: m._id });
      onSubmitted();
      window.scrollTo({ top: 0 });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={topRef} className="scroll-mt-4">
      <PageHeader
        eyebrow={
          isRevision ? `${m.code ?? "Manuscript"} · Revision for version ${m.version}` : "Draft submission"
        }
        title={form.title.trim() || "Untitled submission"}
        description={typeLabel(form.articleType)}
        actions={
          <>
            <span className="self-center text-sm" aria-live="polite">
              <SaveIndicatorText state={autosave.state} error={autosave.error} />
            </span>
            {isRevision ? <WithdrawButton manuscriptId={m._id} /> : <DeleteDraftButton onDelete={onDelete} />}
          </>
        }
      />

      <div className="grid gap-8 py-8 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-12">
        <aside className="hidden xl:block">
          <div className="sticky top-8">
            <Stepper
              steps={steps}
              current={step}
              issues={issues}
              totalIssues={totalIssues}
              visited={visited}
              onSelect={go}
            />
          </div>
        </aside>
        <CompactStepper steps={steps} current={step} issues={issues} onSelect={go} />

        <div className="min-w-0 max-w-3xl">
          <header className="mb-8">
            <p className="meta-label text-muted-foreground">
              Step {index + 1} of {steps.length}
            </p>
            <h2 className="mt-2 font-serif text-title">{STEP_LABELS[step]}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {stepIntro(step, m.version)}
            </p>
          </header>

          {step === "decision" ? <DecisionStep detail={detail} /> : null}
          {step === "details" ? <DetailsStep form={form} update={update} isRevision={isRevision} /> : null}
          {step === "authors" ? <AuthorsStep form={form} update={update} /> : null}
          {step === "files" ? <FilesStep manuscriptId={m._id} files={files} isRevision={isRevision} /> : null}
          {step === "declarations" ? <DeclarationsStep form={form} update={update} /> : null}
          {step === "review" ? (
            <ReviewStep form={form} files={files} issues={issues} steps={steps} onGo={go} />
          ) : null}

          <footer className="mt-12 flex flex-wrap items-start justify-between gap-4 border-t pt-6">
            <div>
              {index > 0 ? (
                <Button type="button" variant="outline" onClick={() => go(steps[index - 1])}>
                  <ArrowLeftIcon />
                  Back
                </Button>
              ) : null}
            </div>
            {step === "review" ? (
              <div className="flex flex-col items-end gap-2">
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  disabled={totalIssues > 0 || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : isRevision ? "Submit revision" : "Submit manuscript"}
                </Button>
                <p className="max-w-xs text-right text-xs text-muted-foreground">
                  By submitting you confirm that every author has approved this version.
                </p>
              </div>
            ) : (
              <Button type="button" onClick={() => go(steps[index + 1])}>
                Continue
                <ArrowRightIcon />
              </Button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}

function stepState(
  key: StepKey,
  issues: Map<StepKey, string[]>,
  totalIssues: number,
  visited: ReadonlySet<StepKey>,
): { done: boolean; text: string; warn: boolean } {
  if (key === "decision") return { done: visited.has(key), text: "Read first", warn: false };
  if (key === "review") {
    return totalIssues > 0
      ? { done: false, text: `${totalIssues} to fix`, warn: visited.has(key) }
      : { done: false, text: "Ready to submit", warn: false };
  }
  const count = issues.get(key)?.length ?? 0;
  if (count === 0) return { done: true, text: "Complete", warn: false };
  return visited.has(key)
    ? { done: false, text: count === 1 ? "1 to fix" : `${count} to fix`, warn: true }
    : { done: false, text: "To do", warn: false };
}

function Stepper({
  steps,
  current,
  issues,
  totalIssues,
  visited,
  onSelect,
}: {
  steps: readonly StepKey[];
  current: StepKey;
  issues: Map<StepKey, string[]>;
  totalIssues: number;
  visited: ReadonlySet<StepKey>;
  onSelect: (step: StepKey) => void;
}) {
  return (
    <nav aria-label="Submission steps">
      <ol>
        {steps.map((key, i) => {
          const state = stepState(key, issues, totalIssues, visited);
          const isCurrent = key === current;
          return (
            <li key={key} className="relative pb-6 last:pb-0">
              {i < steps.length - 1 ? (
                <span aria-hidden className="absolute top-8 bottom-1 left-[13.5px] w-px bg-border" />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(key)}
                aria-current={isCurrent ? "step" : undefined}
                className="group flex w-full items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center border text-xs font-medium tabular-nums",
                    isCurrent
                      ? "border-foreground bg-foreground text-background"
                      : state.done
                        ? "border-foreground bg-background"
                        : "border-input bg-background text-muted-foreground",
                  )}
                >
                  {state.done && !isCurrent ? <CheckIcon className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-sm leading-snug",
                      isCurrent ? "font-semibold" : "underline-offset-4 group-hover:underline",
                    )}
                  >
                    {STEP_LABELS[key]}
                  </span>
                  <span className={cn("mt-0.5 block text-xs", state.warn ? "text-warning" : "text-muted-foreground")}>
                    {state.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Below the wide layout: the same steps as a scrollable row. */
function CompactStepper({
  steps,
  current,
  issues,
  onSelect,
}: {
  steps: readonly StepKey[];
  current: StepKey;
  issues: Map<StepKey, string[]>;
  onSelect: (step: StepKey) => void;
}) {
  return (
    <nav aria-label="Submission steps" className="-mx-4 overflow-x-auto px-4 xl:hidden">
      <ol className="flex min-w-max gap-1.5">
        {steps.map((key, i) => {
          const isCurrent = key === current;
          const done = key !== "review" && key !== "decision" && !issues.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(key)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 border px-3 text-sm whitespace-nowrap",
                  isCurrent ? "border-foreground bg-foreground text-background" : "border-input hover:border-foreground",
                )}
              >
                {done && !isCurrent ? (
                  <CheckIcon className="size-3.5" strokeWidth={2.5} aria-label="Complete" />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
                {STEP_LABELS[key]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DecisionStep({ detail }: { detail: AuthorDetail }) {
  const latest = [...detail.decisions].sort((a, b) => b.decidedAt - a.decidedAt)[0];
  if (!latest) return <p className="text-sm text-muted-foreground">The decision letter isn’t available.</p>;
  const reports = detail.reviews.filter((r) => r.version === latest.version);
  return <DecisionCard decision={latest} reports={reports} />;
}

const DRAFT_FILES: readonly FileKindKey[] = ["manuscript", "title_page", "figure", "supplement"];
const REVISION_FILES: readonly FileKindKey[] = ["response_to_reviewers", ...DRAFT_FILES];
const REQUIRED: ReadonlySet<FileKindKey> = new Set(["manuscript", "title_page", "response_to_reviewers"]);

function FilesStep({
  manuscriptId,
  files,
  isRevision,
}: {
  manuscriptId: Id<"manuscripts">;
  files: readonly FileView[];
  isRevision: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-card border px-5 pt-5">
        {(isRevision ? REVISION_FILES : DRAFT_FILES).map((kind) => (
          <FileSlot
            key={kind}
            manuscriptId={manuscriptId}
            kind={kind}
            files={files.filter((f) => f.kind === kind)}
            required={REQUIRED.has(kind)}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Files can be up to {submissionRules.maxFileBytes / 1024 / 1024} MB each. Uploads are saved as soon as
        they finish.
      </p>
    </div>
  );
}

function DeleteDraftButton({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Delete draft</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
          <AlertDialogDescription>
            The draft and every file uploaded to it are removed for good. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep the draft</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
