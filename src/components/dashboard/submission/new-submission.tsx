"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TYPE_ART } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { articleTypes, type ArticleTypeKey } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { PageHeader } from "../page-header";

const SUBMITTABLE = (Object.keys(articleTypes) as ArticleTypeKey[]).filter((k) => articleTypes[k].submittable);

const HAVE_READY = [
  "The manuscript with author names, affiliations and acknowledgements removed",
  "A separate title page with the authors, affiliations, acknowledgements and funding",
  "Figures as separate files, at least 300 dpi",
  "Every author’s email address and affiliation; ORCID iDs if they have them",
  "Statements on ethics approval, consent, competing interests, funding, data availability and use of AI tools",
  "The reporting checklist for your study design (CONSORT, STROBE, PRISMA, CARE…)",
];

export function NewSubmission() {
  const createDraft = useMutation(api.manuscripts.createDraft);
  const router = useRouter();
  const [type, setType] = useState<ArticleTypeKey>("original_research");
  const [pending, setPending] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="New submission"
        title="What are you submitting?"
        description="The article type sets the abstract headings and the word limit. You can change it until you submit."
      />
      <div className="grid gap-x-12 gap-y-10 py-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const id = await createDraft({ articleType: type });
              router.push(`/dashboard/submissions/${id}`);
            } catch (error) {
              toast.error(errorMessage(error));
              setPending(false);
            }
          }}
        >
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as ArticleTypeKey)}
            className="grid gap-3 md:grid-cols-2"
            aria-label="Article type"
          >
            {SUBMITTABLE.map((key) => {
              const config = articleTypes[key];
              const structured = config.abstractSections.length > 1;
              return (
                <label
                  key={key}
                  htmlFor={`type-${key}`}
                  className={cn(
                    "flex cursor-pointer gap-3.5 rounded-card border p-4 transition-colors hover:border-foreground",
                    type === key && "border-foreground bg-accent/60",
                  )}
                >
                  <RadioGroupItem id={`type-${key}`} value={key} className="mt-1" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="block font-serif text-xl leading-tight">{config.label}</span>
                      <Glyph
                        name={TYPE_ART[key].glyph}
                        className={cn("size-7 [--glyph-stroke:1.6px]", type !== key && "text-muted-foreground")}
                      />
                    </span>
                    <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">
                      {config.description}
                    </span>
                    <span className="meta-label mt-3 block text-muted-foreground">
                      {structured ? "Structured" : "Single-paragraph"} abstract · {config.abstractWordLimit} words
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button type="submit" variant="brand" size="lg" disabled={pending}>
              {pending ? "Starting…" : "Start the submission"}
            </Button>
            <p className="text-sm text-muted-foreground">Your draft saves as you type.</p>
          </div>
        </form>

        <aside className="lg:pt-1">
          <h2 className="meta-label text-muted-foreground">Have these ready</h2>
          <ul className="mt-4 divide-y border-y">
            {HAVE_READY.map((item) => (
              <li key={item} className="flex gap-3 py-3 text-sm leading-snug">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/for-authors" className="underline underline-offset-4">
              Read the guide for authors
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
