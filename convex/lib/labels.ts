import type {
  DecisionKind,
  EventType,
  ManuscriptStatus,
  Recommendation,
  ReviewStatus,
} from "./validators";

/** Human labels shared by Convex functions and the UI. */

export const DECISION_LABELS: Record<DecisionKind, string> = {
  accept: "Accept",
  minor_revision: "Minor revision",
  major_revision: "Major revision",
  reject: "Reject",
  desk_reject: "Reject without review",
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  accept: "Accept",
  minor_revision: "Minor revision",
  major_revision: "Major revision",
  reject: "Reject",
};

export const STATUS_NAMES: Record<ManuscriptStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  with_editor: "With editor",
  under_review: "Under review",
  revision_requested: "Revision requested",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  published: "Published",
};

export const REVIEW_STATUS_NAMES: Record<ReviewStatus, string> = {
  invited: "Invited",
  accepted: "Accepted",
  declined: "Declined",
  submitted: "Report submitted",
  cancelled: "Cancelled",
};

export const EVENT_NAMES: Record<EventType, string> = {
  created: "Draft started",
  submitted: "Submitted",
  editor_assigned: "Editor assigned",
  reviewer_invited: "Reviewer invited",
  reviewer_accepted: "Reviewer agreed",
  reviewer_declined: "Reviewer declined",
  review_submitted: "Report received",
  review_cancelled: "Invitation cancelled",
  decision: "Decision",
  revision_submitted: "Revision submitted",
  withdrawn: "Withdrawn",
  published: "Published",
};
