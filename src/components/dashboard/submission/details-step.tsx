"use client";

import { XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { articleTypes, submissionRules, subjects, type ArticleTypeKey } from "@/config/journal";
import { wordCount } from "@/convex/lib/text";
import { cn } from "@/lib/utils";
import { Counter, FormField } from "../form-field";
import { remapAbstract, type DraftForm, type UpdateForm } from "./form";

const SUBMITTABLE = (Object.keys(articleTypes) as ArticleTypeKey[]).filter((k) => articleTypes[k].submittable);
const MAX_SUBJECTS = 3;
/** The server accepts a few extra while drafting; the rule is checked on submission. */
const KEYWORD_HARD_LIMIT = 12;

export function DetailsStep({
  form,
  update,
  isRevision,
}: {
  form: DraftForm;
  update: UpdateForm;
  isRevision: boolean;
}) {
  const id = useId();
  const type = articleTypes[form.articleType];
  const words = form.abstractSections.reduce((n, s) => n + wordCount(s.text), 0);
  const structured = form.abstractSections.length > 1;

  return (
    <div className="space-y-10">
      <FormField
        label="Article type"
        htmlFor={`${id}-type`}
        hint={isRevision ? "The article type can't change during a revision." : type.description}
      >
        <Select
          value={form.articleType}
          disabled={isRevision}
          onValueChange={(value) => {
            const next = value as ArticleTypeKey;
            update({ articleType: next, abstractSections: remapAbstract(next, form.abstractSections) });
          }}
        >
          <SelectTrigger id={`${id}-type`} className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBMITTABLE.map((key) => (
              <SelectItem key={key} value={key}>
                {articleTypes[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Title"
        htmlFor={`${id}-title`}
        hint="Say what was studied and how, in sentence case. For example: “Early mobilization after hip fracture surgery: a randomized trial”."
        hintId={`${id}-title-hint`}
        aside={<Counter value={form.title.trim().length} max={submissionRules.maxTitleLength} unit="characters" />}
      >
        <Textarea
          id={`${id}-title`}
          aria-describedby={`${id}-title-hint`}
          value={form.title}
          rows={2}
          onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
          className="min-h-0 font-serif text-lg md:text-lg"
        />
      </FormField>

      <fieldset className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <legend className="text-sm font-medium">Abstract</legend>
          <Counter value={words} max={type.abstractWordLimit} unit="words" />
        </div>
        <p className="-mt-3 text-sm leading-snug text-muted-foreground">
          {structured
            ? `${type.label} abstracts are structured under ${type.abstractSections.length} headings, ${type.abstractWordLimit} words in all.`
            : `One paragraph of up to ${type.abstractWordLimit} words.`}
        </p>
        {form.abstractSections.map((section, i) => (
          <FormField
            key={section.label}
            label={structured ? section.label : "Abstract text"}
            htmlFor={`${id}-abstract-${i}`}
            aside={structured ? <span className="text-xs text-muted-foreground tabular-nums">{wordCount(section.text)} words</span> : null}
          >
            <Textarea
              id={`${id}-abstract-${i}`}
              value={section.text}
              rows={structured ? 3 : 8}
              onChange={(e) =>
                update({
                  abstractSections: form.abstractSections.map((s, j) =>
                    j === i ? { ...s, text: e.target.value } : s,
                  ),
                })
              }
              className="font-serif text-base leading-relaxed md:text-base"
            />
          </FormField>
        ))}
      </fieldset>

      <FormField
        label="Keywords"
        htmlFor={`${id}-keywords`}
        hint={`${submissionRules.minKeywords} to ${submissionRules.maxKeywords} terms. Press Enter or type a comma after each one. MeSH terms help readers find your work.`}
        hintId={`${id}-keywords-hint`}
        aside={<Counter value={form.keywords.length} max={submissionRules.maxKeywords} unit="keywords" />}
      >
        <KeywordInput
          id={`${id}-keywords`}
          describedBy={`${id}-keywords-hint`}
          value={form.keywords}
          onChange={(keywords) => update({ keywords })}
        />
      </FormField>

      <fieldset>
        <div className="flex items-baseline justify-between gap-4">
          <legend className="text-sm font-medium">Subject areas</legend>
          <Counter value={form.subjects.length} max={MAX_SUBJECTS} unit="chosen" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Up to three. They help us find reviewers, and readers find the article.</p>
        <div className="mt-3 grid border-t border-l sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const checked = form.subjects.includes(subject);
            const disabled = !checked && form.subjects.length >= MAX_SUBJECTS;
            return (
              <label
                key={subject}
                className={cn(
                  "flex items-center gap-3 border-r border-b px-3 py-2.5 text-sm",
                  disabled ? "text-muted-foreground" : "cursor-pointer hover:bg-accent",
                  checked && "bg-accent",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) =>
                    update({
                      subjects: value
                        ? [...form.subjects, subject]
                        : form.subjects.filter((s) => s !== subject),
                    })
                  }
                />
                {subject}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function KeywordInput({
  id,
  describedBy,
  value,
  onChange,
}: {
  id: string;
  describedBy?: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(/[,;\n]/)
      .map((p) => p.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(value.map((k) => k.toLowerCase()));
    const next = [...value];
    for (const part of parts) {
      if (!seen.has(part.toLowerCase()) && next.length < KEYWORD_HARD_LIMIT) {
        next.push(part.slice(0, 80));
        seen.add(part.toLowerCase());
      }
    }
    onChange(next);
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
      {value.map((keyword, i) => (
        <span key={`${keyword}-${i}`} className="inline-flex h-7 items-center gap-1 bg-muted pr-0.5 pl-2.5 text-sm">
          {keyword}
          <button
            type="button"
            aria-label={`Remove keyword ${keyword}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="flex size-6 items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-describedby={describedBy}
        value={draft}
        disabled={value.length >= KEYWORD_HARD_LIMIT}
        placeholder={value.length === 0 ? "e.g. Hip fractures" : "Add another"}
        onChange={(e) => {
          const next = e.target.value;
          if (/[,;]/.test(next)) {
            commit(next);
            setDraft("");
          } else {
            setDraft(next);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setDraft("");
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          commit(draft);
          setDraft("");
        }}
        className="h-7 min-w-[9rem] flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  );
}
