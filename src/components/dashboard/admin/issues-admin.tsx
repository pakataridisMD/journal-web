"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { formatShortDate, issueLabel } from "@/lib/format";
import { FormField } from "../form-field";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { refreshSite } from "../production/publish-form";

type Issue = FunctionReturnType<typeof api.issues.listAll>[number];

export function IssuesAdmin() {
  const issues = useQuery(api.issues.listAll);
  if (issues === undefined) return <PageSkeleton />;
  const latest = issues[0];
  const next = latest ? { volume: latest.volume, number: latest.number + 1 } : { volume: 1, number: 1 };

  return (
    <>
      <PageHeader
        title="Issues"
        description="Group articles into volumes and issues. Articles outside a published issue appear on the site as online first."
        actions={
          <IssueDialog
            mode="create"
            defaults={{ ...next, title: "", description: "" }}
            trigger={
              <Button>
                <PlusIcon />
                New issue
              </Button>
            }
          />
        }
      />
      {issues.length === 0 ? (
        <div className="py-8">
          <EmptyState title="No issues yet">
            Create Volume 1, Issue 1, add articles to it from Production, then publish it.
          </EmptyState>
        </div>
      ) : (
        <div className="py-8">
          <div
            aria-hidden
            className="hidden gap-x-6 border-b pb-2 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_9rem_8rem_14rem]"
          >
            <span>Issue</span>
            <span>Status</span>
            <span>Published</span>
          </div>
          <ul className="divide-y border-b">
            {issues.map((issue) => (
              <IssueRow key={issue._id} issue={issue} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const setPublished = useMutation(api.issues.setPublished);
  const published = issue.status === "published";
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_9rem_8rem_14rem] md:items-center">
      <div className="min-w-0">
        <p className="font-serif text-lg leading-snug">{issueLabel(issue)}</p>
        <p className="text-sm text-muted-foreground">
          {issue.title ?? "No title"} · {issue.articleCount} {issue.articleCount === 1 ? "article" : "articles"}
        </p>
      </div>
      <span className="meta-label inline-flex items-center gap-2">
        <span aria-hidden className={published ? "size-2 bg-success" : "size-2 border border-foreground"} />
        {published ? "Published" : "Draft"}
      </span>
      <span className="text-sm text-muted-foreground">
        {issue.publishedAt ? formatShortDate(issue.publishedAt) : "Not published"}
      </span>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {published ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/issues/${issue.volume}/${issue.number}`}>View</Link>
          </Button>
        ) : null}
        <IssueDialog
          mode="edit"
          issue={issue}
          defaults={{
            volume: issue.volume,
            number: issue.number,
            title: issue.title ?? "",
            description: issue.description ?? "",
          }}
          trigger={
            <Button variant="outline" size="sm">
              Edit
            </Button>
          }
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={published ? "outline" : "default"} size="sm">
              {published ? "Unpublish" : "Publish"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {published ? "Unpublish" : "Publish"} {issueLabel(issue)}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {published
                  ? "The issue leaves the archive and its articles go back to online first. The articles stay published."
                  : `The issue appears in the archive with its ${issue.articleCount} ${issue.articleCount === 1 ? "article" : "articles"}, and becomes the current issue if it is the newest.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await setPublished({ issueId: issue._id, published: !published });
                    await refreshSite();
                    toast.success(published ? "Issue unpublished" : "Issue published");
                  } catch (error) {
                    toast.error(errorMessage(error));
                  }
                }}
              >
                {published ? "Unpublish" : "Publish"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

type IssueFields = { volume: number; number: number; title: string; description: string };

function IssueDialog({
  mode,
  issue,
  defaults,
  trigger,
}: {
  mode: "create" | "edit";
  issue?: Issue;
  defaults: IssueFields;
  trigger: ReactNode;
}) {
  const id = useId();
  const create = useMutation(api.issues.create);
  const update = useMutation(api.issues.update);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(defaults);
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFields(defaults);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New issue" : `Edit ${issueLabel(defaults)}`}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "New issues start as drafts, so you can add articles before publishing."
              : "The volume and number can’t change once an issue exists."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              if (mode === "create") {
                await create({
                  volume: Number(fields.volume),
                  number: Number(fields.number),
                  title: fields.title,
                  description: fields.description,
                });
                toast.success(`${issueLabel(fields)} created as a draft`);
              } else if (issue) {
                await update({ issueId: issue._id, title: fields.title, description: fields.description });
                if (issue.status === "published") await refreshSite();
                toast.success("Issue saved");
              }
              setOpen(false);
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Volume" htmlFor={`${id}-volume`}>
              <Input
                id={`${id}-volume`}
                type="number"
                min={1}
                value={fields.volume}
                disabled={mode === "edit"}
                onChange={(e) => setFields({ ...fields, volume: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Issue number" htmlFor={`${id}-number`}>
              <Input
                id={`${id}-number`}
                type="number"
                min={1}
                value={fields.number}
                disabled={mode === "edit"}
                onChange={(e) => setFields({ ...fields, number: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label="Title" htmlFor={`${id}-title`} optional hint="For themed issues.">
            <Input id={`${id}-title`} value={fields.title} onChange={(e) => setFields({ ...fields, title: e.target.value })} />
          </FormField>
          <FormField label="Description" htmlFor={`${id}-description`} optional>
            <Textarea
              id={`${id}-description`}
              value={fields.description}
              rows={3}
              onChange={(e) => setFields({ ...fields, description: e.target.value })}
            />
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {mode === "create" ? "Create issue" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
