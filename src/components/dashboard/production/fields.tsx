"use client";

import { useState } from "react";
import { Markdown } from "@/components/site/markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { wordCount } from "@/convex/lib/text";
import { issueLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Markdown source with a rendered preview, styled like the article page. */
export function MarkdownEditor({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="border border-input focus-within:border-ring">
      <div role="tablist" aria-label="Editor mode" className="flex gap-5 border-b px-4">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "relative h-10 text-sm capitalize",
              tab === t
                ? "font-medium after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "write" ? (
        <textarea
          id={id}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={24}
          spellCheck
          className="block min-h-96 w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none"
          placeholder={"## Introduction\n\nText…\n\n## Methods\n\n…"}
        />
      ) : (
        <div className="max-h-[48rem] min-h-96 overflow-y-auto px-6 py-5">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground tabular-nums">
        Markdown · {wordCount(value).toLocaleString("en-US")} words
      </div>
    </div>
  );
}

type IssueOption = {
  _id: Id<"issues">;
  volume: number;
  number: number;
  title?: string;
  status: "draft" | "published";
};

export const NO_ISSUE = "none";

export function IssueSelect({
  id,
  value,
  onChange,
  issues,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  issues: readonly IssueOption[] | undefined;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={issues === undefined}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Loading issues…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ISSUE}>Online first, no issue yet</SelectItem>
        {(issues ?? []).map((issue) => (
          <SelectItem key={issue._id} value={issue._id}>
            {issueLabel(issue)}
            {issue.title ? ` · ${issue.title}` : ""}
            {issue.status === "draft" ? " (draft)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One reference per line; blank lines are ignored. */
export const splitReferences = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
