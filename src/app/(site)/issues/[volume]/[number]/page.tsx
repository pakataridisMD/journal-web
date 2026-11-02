import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IssueCover } from "@/components/site/issue-cover";
import { IssueToc } from "@/components/site/issue-toc";
import { Skeleton } from "@/components/ui/skeleton";
import { getIssue, getPublishedIssues } from "@/lib/data";
import { formatDate, issueLabel } from "@/lib/format";

export async function generateStaticParams() {
  const issues = await getPublishedIssues();
  return issues.length > 0
    ? issues.map((i) => ({ volume: String(i.volume), number: String(i.number) }))
    : [{ volume: "0", number: "0" }];
}

function parse(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/issues/[volume]/[number]">): Promise<Metadata> {
  const { volume, number } = await params;
  const v = parse(volume);
  const n = parse(number);
  const issue = v && n ? await getIssue(v, n) : null;
  if (!issue) return { title: "Issue not found", robots: { index: false } };
  return {
    title: issueLabel(issue),
    description: issue.description ?? `Table of contents for ${issueLabel(issue)}.`,
  };
}

export default function IssuePage({ params }: PageProps<"/issues/[volume]/[number]">) {
  return (
    <Suspense fallback={<IssueSkeleton />}>
      <IssueContent params={params} />
    </Suspense>
  );
}

async function IssueContent({ params }: { params: PageProps<"/issues/[volume]/[number]">["params"] }) {
  const { volume, number } = await params;
  const v = parse(volume);
  const n = parse(number);
  const issue = v && n ? await getIssue(v, n) : null;
  if (!issue) notFound();
  const articles = issue.sections.flatMap((s) => s.articles);

  return (
    <div className="page-container pb-20">
      <nav aria-label="Breadcrumb" className="border-b py-3">
        <Link href="/issues" className="meta-label text-muted-foreground underline-offset-4 hover:underline">
          <span aria-hidden>←</span> All issues
        </Link>
      </nav>
      <div className="grid gap-12 py-10 md:py-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="max-w-[20rem] lg:sticky lg:top-6">
            <IssueCover issue={issue} articles={articles} draw />
          </div>
        </div>
        <div className="lg:col-span-8">
          <p className="meta-label text-muted-foreground">
            {issue.publishedAt ? `Published ${formatDate(issue.publishedAt)}` : "Issue"}
          </p>
          <h1 className="mt-3 font-serif text-headline md:text-display">{issueLabel(issue)}</h1>
          {issue.title ? <p className="mt-2 font-serif text-title text-muted-foreground">{issue.title}</p> : null}
          {issue.description ? (
            <p className="mt-5 max-w-2xl leading-relaxed">{issue.description}</p>
          ) : null}
          <div className="mt-12">
            <h2 className="sr-only">Contents</h2>
            <IssueToc sections={issue.sections} />
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueSkeleton() {
  return (
    <div className="page-container grid gap-12 py-14 lg:grid-cols-12" aria-busy="true">
      <Skeleton className="aspect-[3/4] w-full max-w-[20rem] lg:col-span-4" />
      <div className="space-y-4 lg:col-span-8">
        <Skeleton className="h-10 w-80" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
