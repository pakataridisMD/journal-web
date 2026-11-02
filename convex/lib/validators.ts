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

// ---------------------------------------------------------------- people

export const boardGroupValidator = v.union(
  v.literal("chief"),
  v.literal("deputy"),
  v.literal("section"),
  v.literal("methods"),
  v.literal("advisory"),
  v.literal("office"),
);
export type BoardGroup = Infer<typeof boardGroupValidator>;

export const linkKindValidator = v.union(
  v.literal("google_scholar"),
  v.literal("researchgate"),
  v.literal("linkedin"),
  v.literal("scopus"),
  v.literal("web_of_science"),
  v.literal("pubmed"),
  v.literal("website"),
  v.literal("bluesky"),
  v.literal("x"),
);
export type LinkKind = Infer<typeof linkKindValidator>;

export const profileLinkValidator = v.object({
  kind: linkKindValidator,
  url: v.string(),
});
export type ProfileLink = Infer<typeof profileLinkValidator>;

/** A job or a degree from an ORCID record. */
export const orcidAffiliationValidator = v.object({
  organization: v.string(),
  department: v.optional(v.string()),
  role: v.optional(v.string()),
  city: v.optional(v.string()),
  country: v.optional(v.string()),
  startYear: v.optional(v.number()),
  endYear: v.optional(v.number()),
});
export type OrcidAffiliation = Infer<typeof orcidAffiliationValidator>;

export const orcidWorkValidator = v.object({
  title: v.string(),
  journal: v.optional(v.string()),
  year: v.optional(v.number()),
  type: v.optional(v.string()),
  doi: v.optional(v.string()),
  url: v.optional(v.string()),
});
export type OrcidWork = Infer<typeof orcidWorkValidator>;

/** The public parts of an ORCID record that profiles use, trimmed to size. */
export const orcidRecordValidator = v.object({
  givenNames: v.optional(v.string()),
  familyName: v.optional(v.string()),
  creditName: v.optional(v.string()),
  biography: v.optional(v.string()),
  keywords: v.array(v.string()),
  researcherUrls: v.array(v.object({ name: v.string(), url: v.string() })),
  externalIds: v.array(v.object({ type: v.string(), value: v.string(), url: v.optional(v.string()) })),
  employments: v.array(orcidAffiliationValidator),
  educations: v.array(orcidAffiliationValidator),
  works: v.array(orcidWorkValidator),
  worksCount: v.number(),
});
export type OrcidRecord = Infer<typeof orcidRecordValidator>;

/** Citation counts for a person, from OpenAlex. */
export const researchMetricsValidator = v.object({
  source: v.literal("openalex"),
  openAlexId: v.string(),
  worksCount: v.number(),
  citedByCount: v.number(),
  hIndex: v.optional(v.number()),
  i10Index: v.optional(v.number()),
  topics: v.array(v.string()),
});
export type ResearchMetrics = Infer<typeof researchMetricsValidator>;
