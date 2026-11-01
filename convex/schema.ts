import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  abstractSectionValidator,
  articleAuthorValidator,
  articleTypeValidator,
  declarationsValidator,
  decisionKindValidator,
  eventTypeValidator,
  fileKindValidator,
  manuscriptAuthorValidator,
  manuscriptStatusValidator,
  recommendationValidator,
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
    .index("by_is_editor", ["isEditor"])
    .searchIndex("search_people", { searchField: "searchText" }),

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
