"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { refreshPublicContent } from "@/app/actions";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { authorList, formatDate, typeLabel } from "@/lib/format";
import { FormField } from "../form-field";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { RecordSection, TermList } from "../record";
import type { EditorDetail } from "../types";
import { IssueSelect, MarkdownEditor, NO_ISSUE, splitReferences } from "./fields";

/** Refresh the cached public pages; publishing has already succeeded either way. */
export async function refreshSite(slugs: string[] = []) {
  try {
    await refreshPublicContent(slugs);
  } catch (error) {
    console.warn("The public pages will refresh within the hour.", error);
  }
}

type Draft = { body: string; references: string; doi: string };
const draftKey = (id: string) => `journal:publish-draft:${id}`;

function readDraft(id: string): Draft | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function PublishForm() {
  const { id } = useParams<{ id: string }>();
  const manuscriptId = id as Id<"manuscripts">;
  const detail = useQuery(api.manuscripts.get, { manuscriptId });
  if (detail === undefined) return <PageSkeleton />;
  if (detail.view !== "editor") {
    return <Blocked title="This manuscript isn’t yours to publish">You are one of its authors.</Blocked>;
  }
  const m = detail.manuscript;
  if (m.status === "published" && m.articleId) {
    return (
      <Blocked title="Already published">
        <Link href={`/dashboard/production/articles/${m.articleId}`} className="underline underline-offset-4">
          Edit the article
        </Link>{" "}
        instead.
      </Blocked>
    );
  }
  if (m.status !== "accepted") {
    return <Blocked title="Not accepted yet">Only accepted manuscripts can be published.</Blocked>;
  }
  if (!detail.permissions.canManage) {
    return (
      <Blocked title="Handled by another editor">
        Only the handling editor or the editor-in-chief can publish this manuscript.
      </Blocked>
    );
  }
  return <PublishFormInner detail={detail} />;
}

function PublishFormInner({ detail }: { detail: EditorDetail }) {
  const id = useId();
  const router = useRouter();
  const m = detail.manuscript;
  const issues = useQuery(api.issues.listAll);
  const publish = useMutation(api.articles.publishFromManuscript);
  const [saved] = useState(() => readDraft(m._id));
  const [body, setBody] = useState(saved?.body ?? "");
  const [references, setReferences] = useState(saved?.references ?? "");
  const [doi, setDoi] = useState(saved?.doi ?? "");
  const [issueId, setIssueId] = useState<string>(NO_ISSUE);
  const [featured, setFeatured] = useState(false);
  const [pending, setPending] = useState(false);
  const refs = splitReferences(references);

  // Keep unfinished production text in this browser in case the tab closes.
  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey(m._id), JSON.stringify({ body, references, doi }));
    } catch {
      // Storage can be unavailable (private windows); the form still works.
    }
  }, [body, references, doi, m._id]);

  async function handlePublish() {
    setPending(true);
    try {
      const articleId = await publish({
        manuscriptId: m._id,
        body,
        references: refs,
        issueId: issueId === NO_ISSUE ? undefined : (issueId as Id<"issues">),
        featured,
        doi: doi.trim() || undefined,
      });
      try {
        window.localStorage.removeItem(draftKey(m._id));
      } catch {}
      await refreshSite();
      toast.success("Published. Add the PDF when it’s ready.");
      router.push(`/dashboard/production/articles/${articleId}`);
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Production · ${m.code}`}
        title={m.title}
        description={`${typeLabel(m.articleType)} · ${authorList(m.authors.map((a) => a.name), 4)}`}
      />
      <div className="grid gap-x-10 gap-y-10 py-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-10">
          <RecordSection
            title="Carried over from the manuscript"
            description="Taken from the accepted manuscript. After publishing, the title, abstract and keywords can be corrected on the article’s edit page."
          >
            <TermList
              items={[
                ["Authors", m.authors.map((a) => a.name).join(", ")],
                ["Abstract", `${m.abstractSections.length > 1 ? "Structured" : "Single paragraph"}, ${m.abstractSections.length} ${m.abstractSections.length === 1 ? "section" : "sections"}`],
                ["Keywords", m.keywords.join(", ")],
                ["Received", m.firstSubmittedAt ? formatDate(m.firstSubmittedAt) : ""],
                ["Revised", m.revisedAt ? formatDate(m.revisedAt) : "Not revised"],
                ["Accepted", m.acceptedAt ? formatDate(m.acceptedAt) : ""],
                ["Funding", m.declarations.funding],
                ["Competing interests", m.declarations.conflicts],
                ["Data availability", m.declarations.dataAvailability],
              ]}
            />
          </RecordSection>

          <FormField
            label="Article text"
            htmlFor={`${id}-body`}
            hint="The final text in Markdown: ## for section headings, GitHub-style tables. Leave out the title, authors and abstract; they come from the manuscript."
            hintId={`${id}-body-hint`}
          >
            <MarkdownEditor id={`${id}-body`} describedBy={`${id}-body-hint`} value={body} onChange={setBody} />
          </FormField>

          <FormField
            label="References"
            htmlFor={`${id}-refs`}
            hint="One per line, in Vancouver style, in the order they are cited."
            aside={<span className="text-xs text-muted-foreground tabular-nums">{refs.length} {refs.length === 1 ? "reference" : "references"}</span>}
          >
            <Textarea
              id={`${id}-refs`}
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              rows={10}
              className="font-mono text-sm leading-relaxed md:text-sm"
            />
          </FormField>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="space-y-5 rounded-card border p-5">
            <FormField label="Issue" htmlFor={`${id}-issue`} hint="Articles outside a published issue appear as online first.">
              <IssueSelect id={`${id}-issue`} value={issueId} onChange={setIssueId} issues={issues} />
            </FormField>
            <FormField label="DOI" htmlFor={`${id}-doi`} optional>
              <Input
                id={`${id}-doi`}
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.xxxx/xxxxx"
                className="font-mono"
              />
            </FormField>
            <label htmlFor={`${id}-featured`} className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Feature on the home page</span>
                <span className="block text-sm text-muted-foreground">Shown in the lead slots.</span>
              </span>
              <Switch id={`${id}-featured`} checked={featured} onCheckedChange={setFeatured} />
            </label>
          </section>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="brand" size="lg" className="w-full" disabled={!body.trim() || pending}>
                {pending ? "Publishing…" : "Publish article"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish this article?</AlertDialogTitle>
                <AlertDialogDescription>
                  It goes live on the journal site straight away, free to read under the journal’s license.
                  You can still edit it or hide it afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <AlertDialogAction variant="brand" onClick={handlePublish}>
                  Publish article
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!body.trim() ? (
            <p className="text-sm text-muted-foreground">Add the article text to publish.</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

export function Blocked({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-2xl py-16">
      <p className="meta-label text-muted-foreground">Production</p>
      <h1 className="mt-3 font-serif text-headline">{title}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/dashboard/production">Back to production</Link>
      </Button>
    </div>
  );
}
