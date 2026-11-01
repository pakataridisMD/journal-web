"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { submissionRules } from "@/config/journal";
import { formatDate, typeLabel } from "@/lib/format";
import { PageHeader } from "../page-header";
import { AbstractList, DecisionCard, FilesByVersion, RecordSection, TermList, Timeline } from "../record";
import { ManuscriptStatusMark } from "../status";
import type { AuthorDetail, ManuscriptDoc } from "../types";
import { WithdrawButton } from "./withdraw-button";

const reviewWeeks = Math.round(submissionRules.defaultReviewDays / 7);

function whatNow(m: ManuscriptDoc): string {
  switch (m.status) {
    case "submitted":
      return "Waiting for an editor. The editors first check that the manuscript fits the journal’s scope and format.";
    case "with_editor":
      return "An editor is assessing the manuscript and choosing reviewers.";
    case "under_review":
      return `Out for peer review. Reviewers are usually given about ${reviewWeeks} weeks.`;
    case "revision_requested":
      return "The editors have asked for a revision.";
    case "accepted":
      return "Accepted for publication. The editors are preparing the article.";
    case "published":
      return "Published, and free to read.";
    case "rejected":
      return "Not accepted for publication. The decision letter explains why.";
    case "withdrawn":
      return "You withdrew this manuscript.";
    case "draft":
      return "Not submitted yet.";
  }
}

const WITHDRAWABLE = new Set(["submitted", "with_editor", "under_review"]);

export function StatusView({ detail, justSubmitted }: { detail: AuthorDetail; justSubmitted: boolean }) {
  const m = detail.manuscript;
  const decisions = [...detail.decisions].sort((a, b) => b.decidedAt - a.decidedAt);
  const articleSlug = detail.articleSlug;

  return (
    <>
      <PageHeader
        eyebrow={[m.code, typeLabel(m.articleType), m.version > 1 ? `Version ${m.version}` : null]
          .filter(Boolean)
          .join(" · ")}
        title={m.title}
        actions={
          <>
            {m.status === "published" && articleSlug ? (
              <Button asChild>
                <Link href={`/articles/${articleSlug}`}>Read the article</Link>
              </Button>
            ) : null}
            {WITHDRAWABLE.has(m.status) ? <WithdrawButton manuscriptId={m._id} /> : null}
          </>
        }
      />

      {justSubmitted ? <SubmittedNotice code={m.code} revision={m.version > 1} /> : null}

      <div className="grid gap-x-12 gap-y-10 py-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-10">
          {decisions.length > 0 ? (
            <RecordSection title={decisions.length === 1 ? "Decision" : "Decisions"}>
              <div className="space-y-6">
                {decisions.map((d) => (
                  <DecisionCard
                    key={d._id}
                    decision={d}
                    reports={detail.reviews.filter((r) => r.version === d.version)}
                  />
                ))}
              </div>
            </RecordSection>
          ) : null}
          <RecordSection title="Abstract">
            <AbstractList sections={m.abstractSections} />
          </RecordSection>
          <RecordSection title="Details">
            <TermList
              items={[
                ["Keywords", m.keywords.join(", ")],
                ["Subject areas", m.subjects.join(", ")],
                [
                  "Authors",
                  m.authors
                    .map((a) => `${a.name}${a.isCorresponding ? " (corresponding)" : ""}`)
                    .join(", "),
                ],
              ]}
            />
          </RecordSection>
          <RecordSection title="Files">
            <FilesByVersion files={detail.files} currentVersion={m.version} />
          </RecordSection>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
          <section className="rounded-card border p-5">
            <ManuscriptStatusMark status={m.status} />
            <p className="mt-3 text-sm leading-relaxed">{whatNow(m)}</p>
            <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
              {m.code ? <Row label="Manuscript ID" value={<span className="font-mono">{m.code}</span>} /> : null}
              {m.firstSubmittedAt ? <Row label="First submitted" value={formatDate(m.firstSubmittedAt)} /> : null}
              {m.revisedAt ? <Row label="Last revised" value={formatDate(m.revisedAt)} /> : null}
              {detail.handlingEditor ? <Row label="Handling editor" value={detail.handlingEditor.name} /> : null}
            </dl>
          </section>
          <RecordSection title="History">
            <Timeline events={detail.events} />
          </RecordSection>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function SubmittedNotice({ code, revision }: { code?: string; revision: boolean }) {
  return (
    <section className="mt-8 rounded-card border" aria-live="polite">
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
        <span aria-hidden className="size-2 bg-success" />
        <h2 className="text-sm font-semibold">{revision ? "Revision submitted" : "Manuscript submitted"}</h2>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-sm text-muted-foreground">Your manuscript ID</p>
          <p className="mt-1 font-mono text-title">{code}</p>
          <p className="mt-2 text-sm text-muted-foreground">Quote it if you contact the editorial office.</p>
        </div>
        <ol className="space-y-3 text-sm">
          {[
            revision
              ? "The handling editor reads your response and the revised manuscript."
              : "An editor checks scope and format, usually within a week.",
            "If it goes out for review, independent reviewers read it without seeing your names.",
            "The decision and the reviewers’ comments will appear on this page.",
          ].map((text, i) => (
            <li key={text} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center border text-xs tabular-nums">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
