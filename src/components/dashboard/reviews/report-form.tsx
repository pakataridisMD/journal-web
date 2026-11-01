"use client";

import { useMutation } from "convex/react";
import { useCallback, useId, useState } from "react";
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
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RECOMMENDATION_LABELS } from "@/convex/lib/labels";
import type { Recommendation, ReviewScores } from "@/convex/lib/validators";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { FormField } from "../form-field";
import { SaveIndicatorText, useAutosave } from "../use-autosave";

export const CRITERIA: readonly { key: keyof ReviewScores; label: string; question: string }[] = [
  { key: "originality", label: "Originality", question: "Does it add something new?" },
  { key: "methodology", label: "Methods", question: "Are the design, analysis and reporting sound?" },
  { key: "clarity", label: "Clarity", question: "Is it clearly written and well organized?" },
  { key: "significance", label: "Significance", question: "Will it change what clinicians or patients do?" },
];

const RECOMMENDATIONS: readonly Recommendation[] = ["accept", "minor_revision", "major_revision", "reject"];
const MIN_COMMENTS = 20;

type Scores = Record<keyof ReviewScores, number>;
type Report = {
  recommendation?: Recommendation;
  scores: Scores;
  commentsToAuthor: string;
  confidentialComments: string;
};

const complete = (scores: Scores) => Object.values(scores).every((v) => v >= 1 && v <= 5);

export function ReportForm({
  assignmentId,
  initial,
}: {
  assignmentId: Id<"reviewAssignments">;
  initial: {
    recommendation?: Recommendation;
    scores?: ReviewScores;
    commentsToAuthor?: string;
    confidentialComments?: string;
  };
}) {
  const id = useId();
  const [report, setReport] = useState<Report>(() => ({
    recommendation: initial.recommendation,
    scores: initial.scores ?? { originality: 0, methodology: 0, clarity: 0, significance: 0 },
    commentsToAuthor: initial.commentsToAuthor ?? "",
    confidentialComments: initial.confidentialComments ?? "",
  }));
  const set = (patch: Partial<Report>) => setReport((r) => ({ ...r, ...patch }));

  const saveDraft = useMutation(api.reviews.saveDraft);
  const save = useCallback(
    (r: Report) =>
      saveDraft({
        assignmentId,
        recommendation: r.recommendation,
        // Scores are stored as a set of four; partial scoring stays in the browser.
        scores: complete(r.scores) ? r.scores : undefined,
        commentsToAuthor: r.commentsToAuthor,
        confidentialComments: r.confidentialComments,
      }),
    [saveDraft, assignmentId],
  );
  const autosave = useAutosave(report, save);
  const submitReport = useMutation(api.reviews.submit);
  const [submitting, setSubmitting] = useState(false);

  const missing = [
    !report.recommendation && "a recommendation",
    !complete(report.scores) && "all four scores",
    report.commentsToAuthor.trim().length < MIN_COMMENTS && "your comments to the authors",
  ].filter((x): x is string => Boolean(x));

  async function handleSubmit() {
    if (!report.recommendation || !complete(report.scores)) return;
    setSubmitting(true);
    try {
      await autosave.flush();
      await submitReport({
        assignmentId,
        recommendation: report.recommendation,
        scores: report.scores,
        commentsToAuthor: report.commentsToAuthor,
        confidentialComments: report.confidentialComments,
      });
      toast.success("Report submitted. Thank you.");
      window.scrollTo({ top: 0 });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <fieldset>
        <legend className="text-sm font-medium">Recommendation</legend>
        <p className="mt-1 text-sm text-muted-foreground">The editor makes the decision; this is your advice.</p>
        <RadioGroup
          value={report.recommendation ?? ""}
          onValueChange={(value) => set({ recommendation: value as Recommendation })}
          className="mt-3 grid grid-cols-2 gap-0 border-t border-l sm:grid-cols-4"
        >
          {RECOMMENDATIONS.map((rec) => (
            <label
              key={rec}
              htmlFor={`${id}-${rec}`}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 border-r border-b px-3 py-3 text-sm hover:bg-accent",
                report.recommendation === rec && "bg-accent font-medium",
              )}
            >
              <RadioGroupItem id={`${id}-${rec}`} value={rec} />
              {RECOMMENDATION_LABELS[rec]}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Scores</legend>
        <p className="mt-1 text-sm text-muted-foreground">1 is poor, 5 is excellent. Only the editors see them.</p>
        <div className="mt-3 divide-y border-y">
          {CRITERIA.map((c) => (
            <div key={c.key} className="grid gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
              <div>
                <p className="text-sm font-medium" id={`${id}-${c.key}-label`}>
                  {c.label}
                </p>
                <p className="text-sm text-muted-foreground">{c.question}</p>
              </div>
              <RadioGroup
                aria-labelledby={`${id}-${c.key}-label`}
                orientation="horizontal"
                value={report.scores[c.key] ? String(report.scores[c.key]) : ""}
                onValueChange={(value) => set({ scores: { ...report.scores, [c.key]: Number(value) } })}
                className="flex gap-0"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <RadioGroupPrimitive.Item
                    key={n}
                    value={String(n)}
                    aria-label={`${n} of 5`}
                    className="-ml-px flex size-10 items-center justify-center border border-input text-sm tabular-nums outline-none first:ml-0 hover:bg-accent focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:z-10 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                  >
                    {n}
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      </fieldset>

      <FormField
        label="Comments to the authors"
        htmlFor={`${id}-comments`}
        hint="Summarize the work in a few lines, then list major and minor points. Don’t include anything that identifies you."
        hintId={`${id}-comments-hint`}
      >
        <Textarea
          id={`${id}-comments`}
          aria-describedby={`${id}-comments-hint`}
          value={report.commentsToAuthor}
          onChange={(e) => set({ commentsToAuthor: e.target.value })}
          rows={14}
          className="min-h-72 leading-relaxed"
        />
      </FormField>

      <FormField
        label="Confidential comments to the editor"
        htmlFor={`${id}-confidential`}
        optional
        hint="Only the editors see these, for example concerns about research integrity."
      >
        <Textarea
          id={`${id}-confidential`}
          value={report.confidentialComments}
          onChange={(e) => set({ confidentialComments: e.target.value })}
          rows={5}
        />
      </FormField>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-sm" aria-live="polite">
          <SaveIndicatorText state={autosave.state} error={autosave.error} />
          {autosave.state === "idle" ? <span className="text-muted-foreground">Your report saves as you type.</span> : null}
        </p>
        <div className="flex flex-col items-end gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="brand" size="lg" disabled={missing.length > 0 || submitting}>
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your report?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can’t change it afterwards. The editor sees all of it; the authors see only your
                  comments to them, without your name.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant="brand" onClick={handleSubmit}>
                  Submit report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {missing.length > 0 ? (
            <p className="text-right text-xs text-muted-foreground">Still needed: {missing.join(", ")}.</p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
