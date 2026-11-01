"use client";

import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { articleTypes } from "@/config/journal";
import { wordCount } from "@/convex/lib/text";
import { FileRow, RecordSection, TermList } from "../record";
import type { FileView } from "../types";
import { STATEMENTS } from "./declarations-step";
import { STEP_LABELS, type DraftForm, type StepKey } from "./form";

export function ReviewStep({
  form,
  files,
  issues,
  steps,
  onGo,
}: {
  form: DraftForm;
  files: readonly FileView[];
  issues: Map<StepKey, string[]>;
  steps: readonly StepKey[];
  onGo: (step: StepKey) => void;
}) {
  const total = [...issues.values()].reduce((n, list) => n + list.length, 0);
  const type = articleTypes[form.articleType];
  const words = form.abstractSections.reduce((n, s) => n + wordCount(s.text), 0);
  const edit = (step: StepKey) => (
    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => onGo(step)}>
      Edit
    </Button>
  );

  return (
    <div className="space-y-10">
      {total > 0 ? (
        <div className="rounded-card border">
          <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
            <span aria-hidden className="size-2 bg-warning" />
            <p className="text-sm font-semibold">
              {total === 1 ? "One thing to fix" : `${total} things to fix`} before you can submit
            </p>
          </div>
          <ul className="divide-y">
            {steps
              .filter((step) => issues.has(step))
              .map((step) => (
                <li key={step} className="grid gap-2 px-5 py-4 sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-5">
                  <p className="meta-label pt-0.5 text-muted-foreground">{STEP_LABELS[step]}</p>
                  <ul className="space-y-1 text-sm">
                    {issues.get(step)!.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" size="sm" onClick={() => onGo(step)}>
                    Go to {STEP_LABELS[step].toLowerCase()}
                    <ArrowRightIcon />
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-card border px-5 py-4">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-success" />
          <div>
            <p className="text-sm font-semibold">Everything is in place</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Check the summary below, then submit.</p>
          </div>
        </div>
      )}

      <RecordSection title="Details" actions={edit("details")}>
        <TermList
          items={[
            ["Article type", type.label],
            ["Title", form.title.trim()],
            ["Abstract", words > 0 ? `${words} of ${type.abstractWordLimit} words` : ""],
            ["Keywords", form.keywords.join(", ")],
            ["Subject areas", form.subjects.join(", ")],
          ]}
        />
      </RecordSection>

      <RecordSection title="Authors" actions={edit("authors")}>
        <ol className="divide-y border-y">
          {form.authors.map((a, i) => (
            <li key={i} className="grid gap-1 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-5">
              <p className="font-medium">
                {i + 1}. {a.name.trim() || <span className="font-normal text-muted-foreground">No name</span>}
              </p>
              <p className="text-muted-foreground">
                {[a.affiliation.trim(), a.email.trim()].filter(Boolean).join(" · ") || "No details"}
                {a.isCorresponding ? <span className="ml-2 meta-label text-foreground">Corresponding</span> : null}
              </p>
            </li>
          ))}
        </ol>
      </RecordSection>

      <RecordSection title="Files" actions={edit("files")}>
        {files.length > 0 ? (
          <ul className="divide-y border-y">
            {files.map((file) => (
              <FileRow key={file._id} file={file} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        )}
      </RecordSection>

      <RecordSection title="Declarations" actions={edit("declarations")}>
        <TermList
          items={[
            ...STATEMENTS.map((s) => [s.label, form.declarations[s.key].trim()] as const),
            ["Originality", form.declarations.originality ? "Confirmed" : ""],
            ["Cover letter", form.coverLetter.trim() ? `${wordCount(form.coverLetter)} words` : "None"],
            [
              "Suggested reviewers",
              form.suggestedReviewers.length > 0
                ? form.suggestedReviewers.map((r) => r.name.trim() || r.email.trim()).join(", ")
                : "None",
            ],
          ]}
        />
      </RecordSection>
    </div>
  );
}
