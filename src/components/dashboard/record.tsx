import { FileTextIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DECISION_LABELS, EVENT_NAMES } from "@/convex/lib/labels";
import type { DecisionKind, EventType } from "@/convex/lib/validators";
import { fileSize, formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileView } from "./types";

/** A titled block of a manuscript record, separated by a hairline. */
export function RecordSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t pt-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="meta-label text-foreground">{title}</h2>
        {actions}
      </div>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Pre-formatted text people typed: keeps their paragraphs. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[0.9375rem] leading-relaxed whitespace-pre-wrap", className)}>{children}</div>;
}

export function AbstractList({ sections }: { sections: readonly { label: string; text: string }[] }) {
  const structured = sections.length > 1;
  return (
    <dl className="divide-y border-y">
      {sections.map((s) => (
        <div key={s.label} className={structured ? "grid gap-1 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-5" : "py-3.5"}>
          <dt className={structured ? "meta-label pt-0.5 text-muted-foreground" : "sr-only"}>{s.label}</dt>
          <dd className="max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-pretty whitespace-pre-wrap">
            {s.text.trim() ? s.text : <span className="font-sans text-sm text-muted-foreground">Not written yet</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Label | value rows. Empty values are shown as such, not hidden. */
export function TermList({
  items,
  className,
}: {
  items: readonly (readonly [string, ReactNode])[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y border-y", className)}>
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {value === "" || value === undefined || value === null ? (
              <span className="text-muted-foreground">Not provided</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FileRow({ file }: { file: FileView }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="meta-label text-muted-foreground">{file.label}</p>
        {file.url ? (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm underline-offset-4 hover:underline"
          >
            {file.fileName}
          </a>
        ) : (
          <span className="block truncate text-sm">{file.fileName}</span>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {fileSize(file.size)} · {formatShortDate(file.uploadedAt)}
      </span>
    </li>
  );
}

/** Files grouped by version, newest version first. */
export function FilesByVersion({
  files,
  currentVersion,
}: {
  files: readonly FileView[];
  currentVersion: number;
}) {
  if (files.length === 0) return <p className="text-sm text-muted-foreground">No files.</p>;
  const versions = [...new Set(files.map((f) => f.version))].sort((a, b) => b - a);
  return (
    <div className="space-y-5">
      {versions.map((version) => (
        <div key={version}>
          {versions.length > 1 ? (
            <p className="text-sm font-medium">
              Version {version}
              {version === currentVersion ? <span className="ml-2 font-normal text-muted-foreground">current</span> : null}
            </p>
          ) : null}
          <ul className="mt-1 divide-y border-y">
            {files
              .filter((f) => f.version === version)
              .map((file) => (
                <FileRow key={file._id} file={file} />
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type DecisionView = {
  _id: string;
  version: number;
  decision: DecisionKind;
  letter: string;
  decidedAt: number;
  editorName: string;
};

/** A decision letter, with the reports the authors receive alongside it. */
export function DecisionCard({
  decision,
  reports = [],
}: {
  decision: DecisionView;
  reports?: readonly { _id: string; label: string; commentsToAuthor: string }[];
}) {
  return (
    <article className="rounded-card border">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <p className="meta-label">Decision on version {decision.version}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(decision.decidedAt)} · {decision.editorName}
        </p>
      </header>
      <div className="px-5 py-5">
        <p className="font-serif text-title">{DECISION_LABELS[decision.decision]}</p>
        <Prose className="mt-4">{decision.letter}</Prose>
      </div>
      {reports.length > 0 ? (
        <div className="border-t">
          {reports.map((r) => (
            <section key={r._id} className="border-b px-5 py-5 last:border-b-0">
              <h3 className="meta-label text-muted-foreground">{r.label}</h3>
              <Prose className="mt-2">{r.commentsToAuthor}</Prose>
            </section>
          ))}
        </div>
      ) : null}
    </article>
  );
}

type TimelineEvent = {
  _id: string;
  type: EventType;
  version: number;
  note?: string;
  at: number;
  actorName?: string | null;
};

/** What happened to a manuscript, newest first. */
export function Timeline({ events }: { events: readonly TimelineEvent[] }) {
  const ordered = [...events].sort((a, b) => b.at - a.at);
  return (
    <ol className="relative ml-1 space-y-4 border-l pl-5">
      {ordered.map((e, i) => (
        <li key={e._id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-[25px] size-2",
              i === 0 ? "bg-foreground" : "border border-foreground bg-background",
            )}
          />
          <p className="text-sm font-medium">{EVENT_NAMES[e.type]}</p>
          {e.note ? <p className="mt-0.5 text-sm break-words text-muted-foreground">{e.note}</p> : null}
          <p className="mt-0.5 text-xs text-muted-foreground">
            <time dateTime={new Date(e.at).toISOString()}>{formatShortDate(e.at)}</time>
            {` · Version ${e.version}`}
            {e.actorName ? ` · ${e.actorName}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Five squares, filled to the score. */
export function ScoreMeter({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`${label}: ${value} of 5`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("size-2.5", n <= value ? "bg-foreground" : "border border-input")} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
        {value}/5
      </span>
    </span>
  );
}
