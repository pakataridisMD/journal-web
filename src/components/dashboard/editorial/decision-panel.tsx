"use client";

import { useMutation } from "convex/react";
import { useId, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { journal } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import { DECISION_LABELS, RECOMMENDATION_LABELS } from "@/convex/lib/labels";
import type { DecisionKind, Recommendation } from "@/convex/lib/validators";
import { errorMessage } from "@/lib/errors";
import { FormField } from "../form-field";
import type { EditorDetail } from "../types";

function letterTemplate(
  decision: DecisionKind,
  { title, author, editor }: { title: string; author: string; editor: string },
): string {
  const opening = `Dear ${author},\n\nThank you for submitting “${title}” to ${journal.name}.`;
  const closing = `\n\nWith best wishes,\n${editor}\n${journal.name}`;
  const body: Record<DecisionKind, string> = {
    accept:
      "I am pleased to tell you that it has been accepted for publication. We will be in touch about the final files and the publication date.",
    minor_revision:
      "The reviewers and I think it could be suitable for publication after minor revisions. Their comments are below. Please revise the manuscript and reply to each comment in your response to the reviewers.",
    major_revision:
      "The reviewers raised substantial points, which you will find below. We would be glad to consider a revised version that addresses each of them, with a point-by-point response. The revised manuscript may be sent for further review.",
    reject:
      "After careful consideration of the reviewers’ reports, I regret that we are unable to publish it. Their comments are below; I hope you find them useful.",
    desk_reject:
      "After an editorial assessment, I am sorry to say that we will not be sending it out for peer review, because [give the reason, for example that it falls outside the journal’s scope]. This is not a judgment of the quality of the research, and we hope you find a more suitable home for it.",
  };
  return `${opening} ${body[decision]}${closing}`;
}

const OPEN_STATUSES = new Set(["invited", "accepted"]);

export function DecisionPanel({ detail, editorName }: { detail: EditorDetail; editorName: string }) {
  const id = useId();
  const m = detail.manuscript;
  const decide = useMutation(api.editorial.decide);
  const [decision, setDecision] = useState<DecisionKind | "">("");
  const [letter, setLetter] = useState("");
  const [template, setTemplate] = useState("");
  const [pending, setPending] = useState(false);

  const reviewed = m.status === "with_editor" || m.status === "under_review";
  const options: DecisionKind[] = [
    ...(reviewed ? (["accept", "minor_revision", "major_revision", "reject"] as const) : []),
    ...(m.status === "submitted" || m.status === "with_editor" ? (["desk_reject"] as const) : []),
  ];

  const current = detail.reviews.filter((r) => r.version === m.version);
  const reports = current.filter((r) => r.status === "submitted");
  const open = current.filter((r) => OPEN_STATUSES.has(r.status)).length;
  const tally = new Map<Recommendation, number>();
  for (const r of reports) if (r.recommendation) tally.set(r.recommendation, (tally.get(r.recommendation) ?? 0) + 1);

  const author = m.authors.find((a) => a.isCorresponding)?.name ?? "authors";

  function choose(next: DecisionKind) {
    setDecision(next);
    // Swap the template only while the editor hasn't written their own letter.
    if (!letter.trim() || letter === template) {
      const text = letterTemplate(next, { title: m.title, author, editor: editorName });
      setLetter(text);
      setTemplate(text);
    }
  }

  async function send() {
    if (!decision) return;
    setPending(true);
    try {
      await decide({ manuscriptId: m._id, decision, letter });
      toast.success(`Decision sent: ${DECISION_LABELS[decision]}`);
      setDecision("");
      setLetter("");
      setTemplate("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (options.length === 0) return null;
  const withReports = decision !== "" && decision !== "desk_reject" && reports.length > 0;

  return (
    <section className="rounded-card border">
      <div className="border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">Decision</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {reports.length === 0
            ? "No reports yet on this version."
            : `${reports.length} ${reports.length === 1 ? "report" : "reports"}: ${[...tally]
                .map(([rec, n]) => `${RECOMMENDATION_LABELS[rec]}${n > 1 ? ` ×${n}` : ""}`)
                .join(", ")}`}
        </p>
      </div>
      <div className="space-y-4 p-5">
        <FormField label="Decision" htmlFor={`${id}-decision`}>
          <Select value={decision} onValueChange={(v) => choose(v as DecisionKind)}>
            <SelectTrigger id={`${id}-decision`} className="w-full">
              <SelectValue placeholder="Choose a decision" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {DECISION_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {decision ? (
          <FormField
            label="Letter to the authors"
            htmlFor={`${id}-letter`}
            hint={withReports ? "The authors see it in their dashboard with the reviewers’ comments, without the reviewers’ names." : undefined}
          >
            <Textarea
              id={`${id}-letter`}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={12}
              className="text-sm leading-relaxed"
            />
          </FormField>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" disabled={!decision || !letter.trim() || pending}>
              Send decision
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send “{decision ? DECISION_LABELS[decision] : ""}”?</AlertDialogTitle>
              <AlertDialogDescription>
                The authors see the letter
                {withReports ? " and the reviewers’ comments" : ""} as soon as you send it.
                {open > 0 ? ` ${open} open ${open === 1 ? "invitation is" : "invitations are"} closed.` : ""} A
                decision can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not yet</AlertDialogCancel>
              <AlertDialogAction onClick={send}>Send decision</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
