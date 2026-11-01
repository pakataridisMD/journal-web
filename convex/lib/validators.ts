import { v, type Infer } from "convex/values";

export const roleValidator = v.union(
  v.literal("author"),
  v.literal("reviewer"),
  v.literal("editor"),
  v.literal("admin"),
);
export type Role = Infer<typeof roleValidator>;

export const articleTypeValidator = v.union(
  v.literal("original_research"),
  v.literal("systematic_review"),
  v.literal("review"),
  v.literal("case_report"),
  v.literal("short_communication"),
  v.literal("editorial"),
  v.literal("letter"),
);
export type ArticleType = Infer<typeof articleTypeValidator>;

export const manuscriptStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("with_editor"),
  v.literal("under_review"),
  v.literal("revision_requested"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("withdrawn"),
  v.literal("published"),
);
export type ManuscriptStatus = Infer<typeof manuscriptStatusValidator>;

export const decisionKindValidator = v.union(
  v.literal("accept"),
  v.literal("minor_revision"),
  v.literal("major_revision"),
  v.literal("reject"),
  v.literal("desk_reject"),
);
export type DecisionKind = Infer<typeof decisionKindValidator>;

export const recommendationValidator = v.union(
  v.literal("accept"),
  v.literal("minor_revision"),
  v.literal("major_revision"),
  v.literal("reject"),
);
export type Recommendation = Infer<typeof recommendationValidator>;

export const reviewStatusValidator = v.union(
  v.literal("invited"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("submitted"),
  v.literal("cancelled"),
);
export type ReviewStatus = Infer<typeof reviewStatusValidator>;

export const fileKindValidator = v.union(
  /** The anonymised manuscript reviewers read. */
  v.literal("manuscript"),
  /** Names, affiliations and acknowledgements; never shown to reviewers. */
  v.literal("title_page"),
  v.literal("figure"),
  v.literal("supplement"),
  /** Point-by-point response, required with every revision. */
  v.literal("response_to_reviewers"),
);
export type FileKind = Infer<typeof fileKindValidator>;

export const eventTypeValidator = v.union(
  v.literal("created"),
  v.literal("submitted"),
  v.literal("editor_assigned"),
  v.literal("reviewer_invited"),
  v.literal("reviewer_accepted"),
  v.literal("reviewer_declined"),
  v.literal("review_submitted"),
  v.literal("review_cancelled"),
  v.literal("decision"),
  v.literal("revision_submitted"),
  v.literal("withdrawn"),
  v.literal("published"),
);
export type EventType = Infer<typeof eventTypeValidator>;

export const abstractSectionValidator = v.object({
  label: v.string(),
  text: v.string(),
});
export type AbstractSection = Infer<typeof abstractSectionValidator>;

export const manuscriptAuthorValidator = v.object({
  name: v.string(),
  email: v.string(),
  affiliation: v.string(),
  orcid: v.optional(v.string()),
  isCorresponding: v.boolean(),
});
export type ManuscriptAuthor = Infer<typeof manuscriptAuthorValidator>;

export const articleAuthorValidator = v.object({
  name: v.string(),
  affiliation: v.string(),
  orcid: v.optional(v.string()),
  isCorresponding: v.boolean(),
  /** Only published for the corresponding author. */
  email: v.optional(v.string()),
});
export type ArticleAuthor = Infer<typeof articleAuthorValidator>;

export const declarationsValidator = v.object({
  ethics: v.string(),
  consent: v.string(),
  conflicts: v.string(),
  funding: v.string(),
  dataAvailability: v.string(),
  /** Confirms the work is original and not under consideration elsewhere. */
  originality: v.boolean(),
  /** Disclosure of generative-AI use in preparing the manuscript. */
  aiUse: v.string(),
});
export type Declarations = Infer<typeof declarationsValidator>;

export const suggestedReviewerValidator = v.object({
  name: v.string(),
  email: v.string(),
  affiliation: v.optional(v.string()),
  reason: v.optional(v.string()),
});
export type SuggestedReviewer = Infer<typeof suggestedReviewerValidator>;

export const reviewScoresValidator = v.object({
  originality: v.number(),
  methodology: v.number(),
  clarity: v.number(),
  significance: v.number(),
});
export type ReviewScores = Infer<typeof reviewScoresValidator>;
