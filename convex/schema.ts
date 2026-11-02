import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  abstractSectionValidator,
  articleAuthorValidator,
  articleTypeValidator,
  boardGroupValidator,
  declarationsValidator,
  decisionKindValidator,
  eventTypeValidator,
  fileKindValidator,
  manuscriptAuthorValidator,
  manuscriptStatusValidator,
  orcidRecordValidator,
  profileLinkValidator,
  recommendationValidator,
  researchMetricsValidator,
  reviewScoresValidator,
  reviewStatusValidator,
  roleValidator,
  suggestedReviewerValidator,
} from "./lib/validators";

export default defineSchema({
  /**
   * One row per person. A row can exist before the person signs up (an editor
   * invited a reviewer by email, or an admin pre-assigned a role). It is linked
   * to their Clerk identity on first sign-in with a verified email.
   */
  users: defineTable({
    tokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.string(),
    affiliation: v.optional(v.string()),
    orcid: v.optional(v.string()),
    roles: v.array(roleValidator),
    /** Derived from roles (editor or admin) so editors can be listed by index. */
    isEditor: v.boolean(),
    imageUrl: v.optional(v.string()),
    /** name + email + affiliation, for the people search editors use. */
    searchText: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_orcid", ["orcid"])
    .index("by_is_editor", ["isEditor"])
    .searchIndex("search_people", { searchField: "searchText" }),

  /**
   * A person's public profile, one per user, made when they first save it or
   * are appointed to the board. Kept apart from users, which every request
   * reads, so the bio and links don't travel with each permission check.
   */
  profiles: defineTable({
    userId: v.id("users"),
    /** Profile address: /people/{handle}. Unique. */
    handle: v.string(),
    /** The person chose to show their profile. Board members are shown regardless. */
    isPublic: v.boolean(),
    credentials: v.optional(v.string()),
    bio: v.optional(v.string()),
    /** Subjects from the journal's list. */
    expertise: v.array(v.string()),
    keywords: v.array(v.string()),
    links: v.array(profileLinkValidator),
    showPhoto: v.boolean(),
    showOrcidWorks: v.boolean(),
    showMetrics: v.boolean(),
    /** Named among the journal's reviewers on the Who we are page (reviewers only). */
    listAsReviewer: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_handle", ["handle"])
    .index("by_public", ["isPublic"])
    .index("by_listed_reviewer", ["listAsReviewer"]),

  /**
   * An ORCID iD the person proved is theirs by signing in to ORCID, with the
   * public record as last fetched. The token only reads public data; no query
   * returns it.
   */
  orcidLinks: defineTable({
    userId: v.id("users"),
    orcid: v.string(),
    accessToken: v.string(),
    linkedAt: v.number(),
    syncedAt: v.optional(v.number()),
    record: v.optional(orcidRecordValidator),
    metrics: v.optional(researchMetricsValidator),
    metricsSyncedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_orcid", ["orcid"]),

  /** Positions on the editorial board; a position without a person is open. */
  boardPositions: defineTable({
    group: boardGroupValidator,
    title: v.string(),
    /** One of the journal's subjects; gives the position its glyph. */
    subject: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    order: v.number(),
  })
    .index("by_group", ["group", "order"])
    .index("by_user", ["userId"]),

  /** Which published articles a person wrote, matched by verified email or ORCID iD. */
  authorships: defineTable({
    articleId: v.id("articles"),
    userId: v.id("users"),
    /** The author's place in the byline, from 0. */
    position: v.number(),
    publishedAt: v.number(),
  })
    .index("by_user", ["userId", "publishedAt"])
    .index("by_article", ["articleId", "position"]),

  /** Monotonic counters, e.g. manuscript numbers per year. */
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  manuscripts: defineTable({
    code: v.optional(v.string()),
    submitterId: v.id("users"),
    title: v.string(),
    articleType: articleTypeValidator,
    abstractSections: v.array(abstractSectionValidator),
    keywords: v.array(v.string()),
    subjects: v.array(v.string()),
    authors: v.array(manuscriptAuthorValidator),
    coverLetter: v.optional(v.string()),
    declarations: declarationsValidator,
    suggestedReviewers: v.array(suggestedReviewerValidator),
    status: manuscriptStatusValidator,
    /** The version currently under consideration; starts at 1. */
    version: v.number(),
    handlingEditorId: v.optional(v.id("users")),
    firstSubmittedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    revisedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    articleId: v.optional(v.id("articles")),
    updatedAt: v.number(),
  })
    .index("by_submitter", ["submitterId"])
    .index("by_status", ["status", "submittedAt"])
    .index("by_handling_editor", ["handlingEditorId"])
    .index("by_code", ["code"]),

  manuscriptFiles: defineTable({
    manuscriptId: v.id("manuscripts"),
    version: v.number(),
    kind: fileKindValidator,
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
  })
    .index("by_manuscript_version", ["manuscriptId", "version"])
    .index("by_storage", ["storageId"]),

  reviewAssignments: defineTable({
    manuscriptId: v.id("manuscripts"),
    version: v.number(),
    reviewerId: v.id("users"),
    invitedBy: v.id("users"),
    status: reviewStatusValidator,
    dueAt: v.number(),
    message: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    declineReason: v.optional(v.string()),
    recommendation: v.optional(recommendationValidator),
    scores: v.optional(reviewScoresValidator),
    commentsToAuthor: v.optional(v.string()),
    confidentialComments: v.optional(v.string()),
  })
    .index("by_manuscript", ["manuscriptId", "version"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_manuscript_reviewer", ["manuscriptId", "reviewerId"])
    .index("by_status_due", ["status", "dueAt"]),

  decisions: defineTable({
    manuscriptId: v.id("manuscripts"),
    version: v.number(),
    editorId: v.id("users"),
    decision: decisionKindValidator,
    letter: v.string(),
  }).index("by_manuscript", ["manuscriptId"]),

  manuscriptEvents: defineTable({
    manuscriptId: v.id("manuscripts"),
    version: v.number(),
    type: eventTypeValidator,
    actorId: v.optional(v.id("users")),
    /** Events marked editorial are hidden from authors (e.g. reviewer invited). */
    editorialOnly: v.boolean(),
    note: v.optional(v.string()),
  }).index("by_manuscript", ["manuscriptId"]),

  issues: defineTable({
    volume: v.number(),
    number: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
  })
    .index("by_volume_number", ["volume", "number"])
    .index("by_status", ["status", "publishedAt"]),

  articles: defineTable({
    manuscriptId: v.optional(v.id("manuscripts")),
    slug: v.string(),
    /** Electronic locator used in citations, e.g. "e2026007". */
    articleNumber: v.string(),
    doi: v.optional(v.string()),
    title: v.string(),
    articleType: articleTypeValidator,
    abstractSections: v.array(abstractSectionValidator),
    keywords: v.array(v.string()),
    subjects: v.array(v.string()),
    authors: v.array(articleAuthorValidator),
    body: v.string(),
    references: v.array(v.string()),
    issueId: v.optional(v.id("issues")),
    status: v.union(v.literal("published"), v.literal("hidden")),
    featured: v.boolean(),
    receivedAt: v.optional(v.number()),
    revisedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    publishedAt: v.number(),
    pdfStorageId: v.optional(v.id("_storage")),
    license: v.string(),
    funding: v.optional(v.string()),
    conflicts: v.optional(v.string()),
    dataAvailability: v.optional(v.string()),
    searchText: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_published", ["status", "publishedAt"])
    .index("by_type_published", ["status", "articleType", "publishedAt"])
    .index("by_featured", ["featured", "status", "publishedAt"])
    .index("by_issue", ["issueId", "articleNumber"])
    .index("by_manuscript", ["manuscriptId"])
    .index("by_pdf", ["pdfStorageId"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status", "articleType"],
    }),

  articleMetrics: defineTable({
    articleId: v.id("articles"),
    views: v.number(),
    downloads: v.number(),
  }).index("by_article", ["articleId"]),
});
