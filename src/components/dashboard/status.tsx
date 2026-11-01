import { REVIEW_STATUS_NAMES, STATUS_NAMES } from "@/convex/lib/labels";
import type { ManuscriptStatus, ReviewStatus } from "@/convex/lib/validators";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "active" | "attention" | "good" | "closed";

const MANUSCRIPT_TONES: Record<ManuscriptStatus, Tone> = {
  draft: "neutral",
  submitted: "active",
  with_editor: "active",
  under_review: "active",
  revision_requested: "attention",
  accepted: "good",
  published: "good",
  rejected: "closed",
  withdrawn: "closed",
};

const REVIEW_TONES: Record<ReviewStatus, Tone> = {
  invited: "attention",
  accepted: "active",
  submitted: "good",
  declined: "closed",
  cancelled: "closed",
};

const SQUARE: Record<Tone, string> = {
  neutral: "border border-foreground bg-transparent",
  active: "bg-foreground",
  attention: "bg-warning",
  good: "bg-success",
  closed: "bg-muted-foreground/50",
};

/** Status as a mono label with a small square; no pills. */
function StatusMark({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn("meta-label inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-2 shrink-0", SQUARE[tone])} />
      {label}
    </span>
  );
}

export function ManuscriptStatusMark({ status, className }: { status: ManuscriptStatus; className?: string }) {
  return <StatusMark tone={MANUSCRIPT_TONES[status]} label={STATUS_NAMES[status]} className={className} />;
}

export function ReviewStatusMark({ status, overdue, className }: { status: ReviewStatus; overdue?: boolean; className?: string }) {
  return (
    <StatusMark
      tone={overdue ? "attention" : REVIEW_TONES[status]}
      label={overdue ? `${REVIEW_STATUS_NAMES[status]} · overdue` : REVIEW_STATUS_NAMES[status]}
      className={className}
    />
  );
}
