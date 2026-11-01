"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ExternalLinkIcon, FileTextIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { formatDate, typeLabel } from "@/lib/format";
import { uploadToConvex } from "../file-upload";
import { FormField } from "../form-field";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { RecordSection } from "../record";
import { IssueSelect, MarkdownEditor, NO_ISSUE, splitReferences } from "./fields";
import { refreshSite } from "./publish-form";

type Article = FunctionReturnType<typeof api.articles.getForEdit>;

export function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const article = useQuery(api.articles.getForEdit, { articleId: id as Id<"articles"> });
  if (article === undefined) return <PageSkeleton />;
  return <ArticleEditorForm key={article._id} article={article} />;
}

function ArticleEditorForm({ article }: { article: Article }) {
  const id = useId();
  const issues = useQuery(api.issues.listAll);
  const update = useMutation(api.articles.update);
  const [title, setTitle] = useState(article.title);
  const [abstract, setAbstract] = useState(article.abstractSections);
  const [keywords, setKeywords] = useState(article.keywords.join(", "));
  const [body, setBody] = useState(article.body);
  const [references, setReferences] = useState(article.references.join("\n"));
  const [issueId, setIssueId] = useState<string>(article.issueId ?? NO_ISSUE);
  const [featured, setFeatured] = useState(article.featured);
  const [doi, setDoi] = useState(article.doi ?? "");
  const [visibility, setVisibility] = useState<"published" | "hidden">(article.status);
  const [pending, setPending] = useState(false);

  const keywordList = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const refs = splitReferences(references);
  const changed =
    title !== article.title ||
    JSON.stringify(abstract) !== JSON.stringify(article.abstractSections) ||
    JSON.stringify(keywordList) !== JSON.stringify(article.keywords) ||
    body !== article.body ||
    JSON.stringify(refs) !== JSON.stringify(article.references) ||
    issueId !== (article.issueId ?? NO_ISSUE) ||
    featured !== article.featured ||
    doi.trim() !== (article.doi ?? "") ||
    visibility !== article.status;

  async function save() {
    setPending(true);
    try {
      await update({
        articleId: article._id,
        title,
        abstractSections: abstract,
        keywords: keywordList,
        body,
        references: refs,
        issueId: issueId === NO_ISSUE ? null : (issueId as Id<"issues">),
        featured,
        doi,
        status: visibility,
      });
      await refreshSite([article.slug]);
      toast.success("Article saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            Production · <span className="normal-case">{article.articleNumber}</span> · {typeLabel(article.articleType)}
          </>
        }
        title={article.title}
        description={`Published ${formatDate(article.publishedAt)}${article.status === "hidden" ? " · hidden from the site" : ""}`}
        actions={
          article.status === "published" ? (
            <Button asChild variant="outline">
              <Link href={`/articles/${article.slug}`} target="_blank">
                View on the site
                <ExternalLinkIcon />
              </Link>
            </Button>
          ) : null
        }
      />
      <form
        className="grid gap-x-10 gap-y-10 py-8 xl:grid-cols-[minmax(0,1fr)_18rem]"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="min-w-0 space-y-10">
          <FormField label="Title" htmlFor={`${id}-title`}>
            <Textarea
              id={`${id}-title`}
              value={title}
              rows={2}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              className="min-h-0 font-serif text-lg md:text-lg"
            />
          </FormField>
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium">Abstract</legend>
            {abstract.map((section, i) => (
              <FormField
                key={section.label}
                label={abstract.length > 1 ? section.label : "Abstract text"}
                htmlFor={`${id}-abstract-${i}`}
              >
                <Textarea
                  id={`${id}-abstract-${i}`}
                  value={section.text}
                  rows={abstract.length > 1 ? 3 : 7}
                  onChange={(e) =>
                    setAbstract(abstract.map((s, j) => (j === i ? { ...s, text: e.target.value } : s)))
                  }
                  className="font-serif text-base leading-relaxed md:text-base"
                />
              </FormField>
            ))}
          </fieldset>
          <FormField label="Keywords" htmlFor={`${id}-keywords`} hint="Separated by commas.">
            <Input id={`${id}-keywords`} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </FormField>
          <FormField label="Article text" htmlFor={`${id}-body`}>
            <MarkdownEditor id={`${id}-body`} value={body} onChange={setBody} />
          </FormField>
          <FormField
            label="References"
            htmlFor={`${id}-refs`}
            hint="One per line."
            aside={<span className="text-xs text-muted-foreground tabular-nums">{refs.length} {refs.length === 1 ? "reference" : "references"}</span>}
          >
            <Textarea
              id={`${id}-refs`}
              value={references}
              rows={10}
              onChange={(e) => setReferences(e.target.value)}
              className="font-mono text-sm leading-relaxed md:text-sm"
            />
          </FormField>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="space-y-5 rounded-card border p-5">
            <FormField label="Visibility" htmlFor={`${id}-visibility`}>
              <RadioGroup
                id={`${id}-visibility`}
                value={visibility}
                onValueChange={(v) => setVisibility(v as "published" | "hidden")}
                className="gap-2"
              >
                {(
                  [
                    ["published", "Published", "On the site and in search."],
                    ["hidden", "Hidden", "Off the site; the link stops working."],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex cursor-pointer items-start gap-3 text-sm">
                    <RadioGroupItem value={value} className="mt-0.5" />
                    <span>
                      <span className="block font-medium">{label}</span>
                      <span className="block text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FormField>
            <FormField label="Issue" htmlFor={`${id}-issue`}>
              <IssueSelect id={`${id}-issue`} value={issueId} onChange={setIssueId} issues={issues} />
            </FormField>
            <FormField label="DOI" htmlFor={`${id}-doi`} optional>
              <Input id={`${id}-doi`} value={doi} onChange={(e) => setDoi(e.target.value)} className="font-mono" />
            </FormField>
            <label htmlFor={`${id}-featured`} className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Feature on the home page</span>
                <span className="block text-sm text-muted-foreground">Shown in the lead slots.</span>
              </span>
              <Switch id={`${id}-featured`} checked={featured} onCheckedChange={setFeatured} />
            </label>
          </section>
          <Button type="submit" size="lg" className="w-full" disabled={!changed || pending}>
            {pending ? "Saving…" : changed ? "Save changes" : "No changes"}
          </Button>
          <PdfPanel article={article} />
        </aside>
      </form>
    </>
  );
}

function PdfPanel({ article }: { article: Article }) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const setPdf = useMutation(api.articles.setPdf);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Upload a PDF.");
      return;
    }
    try {
      setProgress(0);
      const url = await generateUploadUrl({});
      const storageId = await uploadToConvex(url, file, setProgress);
      await setPdf({ articleId: article._id, storageId, fileName: file.name });
      await refreshSite([article.slug]);
      toast.success("PDF attached");
    } catch (error) {
      toast.error(error instanceof Error && !("data" in error) ? error.message : errorMessage(error));
    } finally {
      setProgress(null);
    }
  }

  return (
    <RecordSection title="PDF">
      {article.pdfUrl ? (
        <div className="flex items-center gap-3 text-sm">
          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Current PDF
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No PDF yet. Readers see a download button once one is attached.</p>
      )}
      {progress !== null ? (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="text-sm">Uploading… {progress}%</p>
          <div className="mt-2 h-1 bg-muted">
            <div className="h-1 bg-foreground" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadIcon />
            {article.pdfUrl ? "Replace PDF" : "Upload PDF"}
          </Button>
          {article.pdfUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await setPdf({ articleId: article._id });
                  await refreshSite([article.slug]);
                  toast.success("PDF removed");
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-label="Choose a PDF"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </RecordSection>
  );
}
