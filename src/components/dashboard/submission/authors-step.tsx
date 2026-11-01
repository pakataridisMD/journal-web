"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submissionRules } from "@/config/journal";
import { isValidEmail, isValidOrcid, normalizeEmail } from "@/convex/lib/text";
import type { ManuscriptAuthor } from "@/convex/lib/validators";
import { FormField } from "../form-field";
import { emptyAuthor, type DraftForm, type UpdateForm } from "./form";

export function AuthorsStep({ form, update }: { form: DraftForm; update: UpdateForm }) {
  const authors = form.authors;
  const corresponding = authors.findIndex((a) => a.isCorresponding);

  const set = (index: number, patch: Partial<ManuscriptAuthor>) =>
    update({ authors: authors.map((a, i) => (i === index ? { ...a, ...patch } : a)) });

  const move = (index: number, by: -1 | 1) => {
    const next = [...authors];
    const [author] = next.splice(index, 1);
    next.splice(index + by, 0, author);
    update({ authors: next });
  };

  const remove = (index: number) => {
    const next = authors.filter((_, i) => i !== index);
    if (authors[index].isCorresponding && next.length > 0 && !next.some((a) => a.isCorresponding)) {
      next[0] = { ...next[0], isCorresponding: true };
    }
    update({ authors: next });
  };

  return (
    <div className="space-y-6">
      <RadioGroup
        value={corresponding >= 0 ? String(corresponding) : ""}
        onValueChange={(value) =>
          update({ authors: authors.map((a, i) => ({ ...a, isCorresponding: i === Number(value) })) })
        }
        className="gap-4"
        aria-label="Corresponding author"
      >
        {authors.map((author, index) => (
          <AuthorCard
            key={index}
            author={author}
            index={index}
            count={authors.length}
            onChange={(patch) => set(index, patch)}
            onMove={(by) => move(index, by)}
            onRemove={() => remove(index)}
          />
        ))}
      </RadioGroup>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={authors.length >= submissionRules.maxAuthors}
          onClick={() =>
            update({ authors: [...authors, { ...emptyAuthor(), isCorresponding: authors.length === 0 }] })
          }
        >
          <PlusIcon />
          Add author
        </Button>
        <p className="text-sm text-muted-foreground">
          Up to {submissionRules.maxAuthors}. Everyone listed must have approved the submission.
        </p>
      </div>
    </div>
  );
}

function AuthorCard({
  author,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  author: ManuscriptAuthor;
  index: number;
  count: number;
  onChange: (patch: Partial<ManuscriptAuthor>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const email = author.email.trim();
  const emailProblem = email && !isValidEmail(normalizeEmail(email)) ? "Check the email address." : null;
  const orcid = author.orcid?.trim().toUpperCase() ?? "";
  const orcidProblem = orcid && !isValidOrcid(orcid) ? "An ORCID iD looks like 0000-0002-1825-0097." : null;
  const name = author.name.trim() || `Author ${index + 1}`;

  return (
    <div className="rounded-card border">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b py-2 pr-2 pl-4">
        <p className="meta-label">
          {index + 1}. <span className="normal-case">{author.name.trim() ? author.name : "New author"}</span>
        </p>
        <div className="flex items-center gap-1">
          <label htmlFor={`${id}-corresponding`} className="mr-2 flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem id={`${id}-corresponding`} value={String(index)} />
            Corresponding
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${name}`}
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            value={author.name}
            autoComplete="off"
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </FormField>
        <FormField label="Email" htmlFor={`${id}-email`} error={emailProblem}>
          <Input
            id={`${id}-email`}
            type="email"
            value={author.email}
            autoComplete="off"
            aria-invalid={emailProblem ? true : undefined}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </FormField>
        <FormField
          label="Affiliation"
          htmlFor={`${id}-affiliation`}
          hint="Department, institution, city, country."
          className="sm:col-span-2"
        >
          <Input
            id={`${id}-affiliation`}
            value={author.affiliation}
            onChange={(e) => onChange({ affiliation: e.target.value })}
          />
        </FormField>
        <FormField label="ORCID iD" htmlFor={`${id}-orcid`} optional error={orcidProblem}>
          <Input
            id={`${id}-orcid`}
            value={author.orcid ?? ""}
            placeholder="0000-0000-0000-0000"
            inputMode="text"
            autoComplete="off"
            aria-invalid={orcidProblem ? true : undefined}
            onChange={(e) => onChange({ orcid: e.target.value || undefined })}
            className="font-mono"
          />
        </FormField>
      </div>
    </div>
  );
}
