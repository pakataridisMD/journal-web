"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submissionRules } from "@/config/journal";
import { isValidEmail, normalizeEmail } from "@/convex/lib/text";
import type { Declarations, SuggestedReviewer } from "@/convex/lib/validators";
import { FormField } from "../form-field";
import { emptyReviewer, type DraftForm, type UpdateForm } from "./form";

type StatementKey = Exclude<keyof Declarations, "originality">;

export const STATEMENTS: readonly { key: StatementKey; label: string; hint: string; example: string }[] = [
  {
    key: "ethics",
    label: "Ethics approval",
    hint: "Name the committee and the reference number, or explain why approval wasn’t needed.",
    example: "e.g. Approved by the Research Ethics Committee of …, reference …",
  },
  {
    key: "consent",
    label: "Patient consent",
    hint: "How informed consent was obtained. Case reports need written consent to publish.",
    example: "e.g. All participants gave written informed consent.",
  },
  {
    key: "conflicts",
    label: "Competing interests",
    hint: "Financial and non-financial, for every author.",
    example: "e.g. None declared.",
  },
  {
    key: "funding",
    label: "Funding",
    hint: "Funders, grant numbers, and what part the funders played.",
    example: "e.g. This study received no external funding.",
  },
  {
    key: "dataAvailability",
    label: "Data availability",
    hint: "Where the data can be found, or how to ask for them.",
    example: "e.g. De-identified data are available from the corresponding author on reasonable request.",
  },
  {
    key: "aiUse",
    label: "Use of AI tools",
    hint: "Which tools, and what they were used for. AI tools can’t be listed as authors.",
    example: "e.g. No generative AI tools were used.",
  },
];

export function DeclarationsStep({ form, update }: { form: DraftForm; update: UpdateForm }) {
  const id = useId();
  const d = form.declarations;
  const setStatement = (patch: Partial<Declarations>) => update({ declarations: { ...d, ...patch } });
  const authorEmails = new Set(form.authors.map((a) => normalizeEmail(a.email)).filter(Boolean));

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <h3 className="meta-label text-muted-foreground">Statements</h3>
        {STATEMENTS.map((s) => (
          <FormField key={s.key} label={s.label} htmlFor={`${id}-${s.key}`} hint={s.hint} hintId={`${id}-${s.key}-hint`}>
            <Textarea
              id={`${id}-${s.key}`}
              aria-describedby={`${id}-${s.key}-hint`}
              value={d[s.key]}
              placeholder={s.example}
              rows={2}
              onChange={(e) => setStatement({ [s.key]: e.target.value })}
            />
          </FormField>
        ))}
        <label
          htmlFor={`${id}-originality`}
          className="flex cursor-pointer items-start gap-3 rounded-card border p-4 hover:bg-accent/60"
        >
          <Checkbox
            id={`${id}-originality`}
            checked={d.originality}
            onCheckedChange={(value) => setStatement({ originality: value === true })}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Originality</span>
            <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
              This work is original, hasn’t been published before, and isn’t under consideration by
              another journal.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-6">
        <h3 className="meta-label text-muted-foreground">For the editors</h3>
        <FormField
          label="Cover letter"
          htmlFor={`${id}-cover`}
          optional
          hint="Why this work matters to our readers. Only the editors see it."
        >
          <Textarea
            id={`${id}-cover`}
            value={form.coverLetter}
            rows={6}
            onChange={(e) => update({ coverLetter: e.target.value })}
          />
        </FormField>

        <div className="space-y-4">
          <div>
            <p className="flex items-baseline gap-2 text-sm leading-snug font-medium">
              Suggested reviewers <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              Up to {submissionRules.maxSuggestedReviewers} people with the right expertise and no conflict of
              interest. The editors decide whom to invite.
            </p>
          </div>
          {form.suggestedReviewers.map((reviewer, index) => (
            <ReviewerCard
              key={index}
              index={index}
              reviewer={reviewer}
              isAuthor={authorEmails.has(normalizeEmail(reviewer.email))}
              onChange={(patch) =>
                update({
                  suggestedReviewers: form.suggestedReviewers.map((r, i) => (i === index ? { ...r, ...patch } : r)),
                })
              }
              onRemove={() =>
                update({ suggestedReviewers: form.suggestedReviewers.filter((_, i) => i !== index) })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={form.suggestedReviewers.length >= submissionRules.maxSuggestedReviewers}
            onClick={() => update({ suggestedReviewers: [...form.suggestedReviewers, emptyReviewer()] })}
          >
            <PlusIcon />
            Suggest a reviewer
          </Button>
        </div>
      </section>
    </div>
  );
}

function ReviewerCard({
  index,
  reviewer,
  isAuthor,
  onChange,
  onRemove,
}: {
  index: number;
  reviewer: SuggestedReviewer;
  isAuthor: boolean;
  onChange: (patch: Partial<SuggestedReviewer>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const email = reviewer.email.trim();
  const emailProblem = isAuthor
    ? "This person is listed as an author."
    : email && !isValidEmail(normalizeEmail(email))
      ? "Check the email address."
      : null;
  return (
    <div className="rounded-card border">
      <div className="flex items-center justify-between gap-4 border-b py-2 pr-2 pl-4">
        <p className="meta-label">Suggested reviewer {index + 1}</p>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove suggested reviewer" onClick={onRemove}>
          <Trash2Icon />
        </Button>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={reviewer.name} onChange={(e) => onChange({ name: e.target.value })} />
        </FormField>
        <FormField label="Email" htmlFor={`${id}-email`} error={emailProblem}>
          <Input
            id={`${id}-email`}
            type="email"
            value={reviewer.email}
            aria-invalid={emailProblem ? true : undefined}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </FormField>
        <FormField label="Affiliation" htmlFor={`${id}-affiliation`} optional>
          <Input
            id={`${id}-affiliation`}
            value={reviewer.affiliation ?? ""}
            onChange={(e) => onChange({ affiliation: e.target.value })}
          />
        </FormField>
        <FormField label="Why this person" htmlFor={`${id}-reason`} optional>
          <Input id={`${id}-reason`} value={reviewer.reason ?? ""} onChange={(e) => onChange({ reason: e.target.value })} />
        </FormField>
      </div>
    </div>
  );
}
