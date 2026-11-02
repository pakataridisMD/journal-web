import { v } from "convex/values";
import { articleTypes, submissionRules, subjects as SUBJECTS } from "../src/config/journal";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireRole, requireViewer, type Viewer } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  DAY,
  accessFor,
  assertStatus,
  cancelOpenReviews,
  deleteBlobIfUnused,
  fileViews,
  filesFor,
  loadOwnManuscript,
  logEvent,
  nextManuscriptCode,
  usersById,
} from "./lib/manuscripts";
import { personSummary } from "./lib/people";
import {
  describeIssues,
  revisionIssues,
  submissionIssues,
  type ChecklistIssue,
} from "./lib/submission";
import { cleanList, normalizeEmail } from "./lib/text";
import {
  abstractSectionValidator,
  articleTypeValidator,
  declarationsValidator,
  manuscriptAuthorValidator,
  suggestedReviewerValidator,
  type ArticleType,
  type ManuscriptStatus,
} from "./lib/validators";

const EMPTY_DECLARATIONS: Doc<"manuscripts">["declarations"] = {
  ethics: "",
  consent: "",
  conflicts: "",
  funding: "",
  dataAvailability: "",
  originality: false,
  aiUse: "",
};

function blankAbstract(type: ArticleType) {
  return articleTypes[type].abstractSections.map((label) => ({ label, text: "" }));
}

/** Map abstract text onto a type's headings, keeping text whose heading matches. */
function remapAbstract(
  type: ArticleType,
  sections: readonly { label: string; text: string }[],
) {
  const byLabel = new Map(sections.map((s) => [s.label, s.text]));
  return articleTypes[type].abstractSections.map((label) => ({
    label,
    text: byLabel.get(label) ?? "",
  }));
}

function tooLong(value: string | undefined, max: number, what: string) {
  if (value !== undefined && value.length > max) {
    fail("INVALID_INPUT", `${what} is too long (${max.toLocaleString("en-US")} characters at most).`);
  }
}

// ---------------------------------------------------------------- authors

export const createDraft = mutation({
  args: { articleType: articleTypeValidator },
  returns: v.id("manuscripts"),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (!articleTypes[args.articleType].submittable) {
      fail("INVALID_INPUT", `${articleTypes[args.articleType].label}s are commissioned by the editors.`);
    }
    const now = Date.now();
    const manuscriptId = await ctx.db.insert("manuscripts", {
      submitterId: viewer._id,
      title: "",
      articleType: args.articleType,
      abstractSections: blankAbstract(args.articleType),
      keywords: [],
      subjects: [],
      authors: [
        {
          name: viewer.name,
          email: viewer.email,
          affiliation: viewer.affiliation ?? "",
          orcid: viewer.orcid,
          isCorresponding: true,
        },
      ],
      declarations: EMPTY_DECLARATIONS,
      suggestedReviewers: [],
      status: "draft",
      version: 1,
      updatedAt: now,
    });
    await logEvent(ctx, { _id: manuscriptId, version: 1 }, "created", viewer._id);
    return manuscriptId;
  },
});

/**
 * Save any part of a draft (or, during a revision, its metadata). Values are
 * stored as typed; they are tidied and fully checked on submission.
 */
export const updateDraft = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    title: v.optional(v.string()),
    articleType: v.optional(articleTypeValidator),
    abstractSections: v.optional(v.array(abstractSectionValidator)),
    keywords: v.optional(v.array(v.string())),
    subjects: v.optional(v.array(v.string())),
    authors: v.optional(v.array(manuscriptAuthorValidator)),
    coverLetter: v.optional(v.string()),
    declarations: v.optional(declarationsValidator),
    suggestedReviewers: v.optional(v.array(suggestedReviewerValidator)),
  },
  handler: async (ctx, { manuscriptId, ...fields }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, manuscriptId);
    assertStatus(m, ["draft", "revision_requested"], "edit the submission");

    if (fields.articleType !== undefined && fields.articleType !== m.articleType) {
      if (m.status !== "draft") {
        fail("INVALID_STATE", "The article type can't change during a revision.");
      }
      if (!articleTypes[fields.articleType].submittable) {
        fail("INVALID_INPUT", "That article type is commissioned by the editors.");
      }
    }

    tooLong(fields.title, 500, "The title");
    tooLong(fields.coverLetter, 10_000, "The cover letter");
    if (fields.abstractSections) {
      if (fields.abstractSections.length > 8) fail("INVALID_INPUT", "Too many abstract sections.");
      for (const s of fields.abstractSections) tooLong(s.text, 5_000, `The ${s.label} section`);
    }
    if (fields.keywords && fields.keywords.length > 12) {
      fail("INVALID_INPUT", "Too many keywords.");
    }
    fields.keywords?.forEach((k) => tooLong(k, 80, "A keyword"));
    if (fields.subjects) {
      const known = new Set<string>(SUBJECTS);
      if (fields.subjects.some((s) => !known.has(s))) fail("INVALID_INPUT", "Unknown subject area.");
      if (fields.subjects.length > 3) fail("INVALID_INPUT", "Choose up to three subject areas.");
    }
    if (fields.authors) {
      if (fields.authors.length > submissionRules.maxAuthors) {
        fail("INVALID_INPUT", `Up to ${submissionRules.maxAuthors} authors can be listed.`);
      }
      for (const a of fields.authors) {
        tooLong(a.name, 200, "An author name");
        tooLong(a.email, 254, "An author email");
        tooLong(a.affiliation, 500, "An affiliation");
      }
    }
    if (fields.declarations) {
      for (const [key, value] of Object.entries(fields.declarations)) {
        if (typeof value === "string") tooLong(value, 5_000, `The ${key} statement`);
      }
    }
    if (
      fields.suggestedReviewers &&
      fields.suggestedReviewers.length > submissionRules.maxSuggestedReviewers
    ) {
      fail(
        "INVALID_INPUT",
        `Suggest up to ${submissionRules.maxSuggestedReviewers} reviewers.`,
      );
    }

    const articleType = fields.articleType ?? m.articleType;
    const patch: Partial<Doc<"manuscripts">> = { ...fields, updatedAt: Date.now() };
    if (fields.abstractSections || fields.articleType) {
      patch.abstractSections = remapAbstract(
        articleType,
        fields.abstractSections ?? m.abstractSections,
      );
    }
    await ctx.db.patch("manuscripts", m._id, patch);
  },
});

/** Tidy the free text once, at the moment it is submitted. */
function tidied(m: Doc<"manuscripts">): Partial<Doc<"manuscripts">> {
  const trimAll = <T extends Record<string, unknown>>(obj: T): T =>
    Object.fromEntries(
      Object.entries(obj).map(([k, value]) => [k, typeof value === "string" ? value.trim() : value]),
    ) as T;
  return {
    title: m.title.trim().replace(/\s+/g, " "),
    abstractSections: m.abstractSections.map((s) => ({ label: s.label, text: s.text.trim() })),
    keywords: cleanList(m.keywords),
    authors: m.authors.map((a) => ({
      ...trimAll(a),
      email: normalizeEmail(a.email),
      orcid: a.orcid?.trim().toUpperCase() || undefined,
    })),
    declarations: trimAll(m.declarations),
    coverLetter: m.coverLetter?.trim() || undefined,
    suggestedReviewers: m.suggestedReviewers.map((r) => ({
      ...trimAll(r),
      email: normalizeEmail(r.email),
    })),
  };
}

export const submit = mutation({
  args: { manuscriptId: v.id("manuscripts") },
  handler: async (ctx, { manuscriptId }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, manuscriptId);
    assertStatus(m, ["draft"], "submit");
    const tidy = { ...m, ...tidied(m) };
    const issues = submissionIssues(tidy, await filesFor(ctx, m._id, m.version));
    if (issues.length > 0) fail("INVALID_INPUT", describeIssues(issues));

    const now = Date.now();
    await ctx.db.patch("manuscripts", m._id, {
      ...tidied(m),
      code: m.code ?? (await nextManuscriptCode(ctx, now)),
      status: "submitted",
      firstSubmittedAt: m.firstSubmittedAt ?? now,
      submittedAt: now,
      updatedAt: now,
    });
    await logEvent(ctx, m, "submitted", viewer._id);
  },
});

export const submitRevision = mutation({
  args: { manuscriptId: v.id("manuscripts") },
  handler: async (ctx, { manuscriptId }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, manuscriptId);
    assertStatus(m, ["revision_requested"], "submit a revision");
    const tidy = { ...m, ...tidied(m) };
    const issues = revisionIssues(tidy, await filesFor(ctx, m._id, m.version));
    if (issues.length > 0) fail("INVALID_INPUT", describeIssues(issues));

    const now = Date.now();
    await ctx.db.patch("manuscripts", m._id, {
      ...tidied(m),
      status: m.handlingEditorId ? "with_editor" : "submitted",
      submittedAt: now,
      revisedAt: now,
      updatedAt: now,
    });
    await logEvent(ctx, m, "revision_submitted", viewer._id);
  },
});

export const withdraw = mutation({
  args: { manuscriptId: v.id("manuscripts"), reason: v.string() },
  handler: async (ctx, { manuscriptId, reason }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, manuscriptId);
    assertStatus(
      m,
      ["submitted", "with_editor", "under_review", "revision_requested"],
      "withdraw",
    );
    const note = reason.trim();
    if (!note) fail("INVALID_INPUT", "Tell the editors why you are withdrawing.");
    tooLong(note, 2_000, "The reason");
    await cancelOpenReviews(ctx, m, viewer._id);
    await ctx.db.patch("manuscripts", m._id, { status: "withdrawn", updatedAt: Date.now() });
    await logEvent(ctx, m, "withdrawn", viewer._id, note);
  },
});

export const deleteDraft = mutation({
  args: { manuscriptId: v.id("manuscripts") },
  handler: async (ctx, { manuscriptId }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, manuscriptId);
    assertStatus(m, ["draft"], "delete the submission");
    if (m.code) fail("INVALID_STATE", "Submitted manuscripts can be withdrawn, not deleted.");
    const files = await filesFor(ctx, m._id);
    for (const f of files) await ctx.db.delete("manuscriptFiles", f._id);
    for (const f of files) await deleteBlobIfUnused(ctx, f.storageId);
    const events = await ctx.db
      .query("manuscriptEvents")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", m._id))
      .collect();
    for (const e of events) await ctx.db.delete("manuscriptEvents", e._id);
    await ctx.db.delete("manuscripts", m._id);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const rows = await ctx.db
      .query("manuscripts")
      .withIndex("by_submitter", (q) => q.eq("submitterId", viewer._id))
      .take(200);
    // Newest activity first; changes in the same millisecond put the newest manuscript first.
    rows.sort((a, b) => b.updatedAt - a.updatedAt || b._creationTime - a._creationTime);
    return await Promise.all(
      rows.map(async (m) => {
        const article = m.articleId ? await ctx.db.get("articles", m.articleId) : null;
        return {
          _id: m._id,
          code: m.code,
          title: m.title,
          articleType: m.articleType,
          status: m.status,
          version: m.version,
          updatedAt: m.updatedAt,
          submittedAt: m.submittedAt,
          articleSlug: article?.status === "published" ? article.slug : undefined,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------- detail

async function loadRecord(ctx: QueryCtx, m: Doc<"manuscripts">) {
  const [files, decisions, reviews, events, article] = await Promise.all([
    filesFor(ctx, m._id),
    ctx.db
      .query("decisions")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", m._id))
      .take(100),
    ctx.db
      .query("reviewAssignments")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", m._id))
      .take(200),
    ctx.db
      .query("manuscriptEvents")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", m._id))
      .take(500),
    m.articleId ? ctx.db.get("articles", m.articleId) : null,
  ]);
  const articleSlug = article?.status === "published" ? article.slug : undefined;
  return { files, decisions, reviews, events, articleSlug };
}

/**
 * Reviewers are numbered by when they first submitted a report, so
 * "Reviewer 1" stays the same person across rounds.
 */
function reviewerLabels(reviews: readonly Doc<"reviewAssignments">[]) {
  const labels = new Map<Id<"users">, string>();
  const submitted = reviews
    .filter((r) => r.status === "submitted")
    .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
  for (const r of submitted) {
    if (!labels.has(r.reviewerId)) labels.set(r.reviewerId, `Reviewer ${labels.size + 1}`);
  }
  return labels;
}

function checklistFor(m: Doc<"manuscripts">, files: readonly Doc<"manuscriptFiles">[]): ChecklistIssue[] {
  if (m.status === "draft") return submissionIssues(m, files);
  if (m.status === "revision_requested") return revisionIssues(m, files);
  return [];
}

export const get = query({
  args: { manuscriptId: v.id("manuscripts") },
  handler: async (ctx, { manuscriptId }) => {
    const viewer = await requireViewer(ctx);
    const m = await ctx.db.get("manuscripts", manuscriptId);
    if (!m) fail("NOT_FOUND", "We couldn't find that manuscript.");
    const access = accessFor(viewer, m);
    if (access.isSubmitter) return await authorView(ctx, m);
    if (access.isEditorial) return await editorView(ctx, viewer, m, access);
    fail("NOT_FOUND", "We couldn't find that manuscript.");
  },
});

async function authorView(ctx: QueryCtx, m: Doc<"manuscripts">) {
  const record = await loadRecord(ctx, m);
  const people = await usersById(ctx, [
    m.handlingEditorId,
    ...record.decisions.map((d) => d.editorId),
  ]);
  const decidedVersions = new Set(record.decisions.map((d) => d.version));
  const labels = reviewerLabels(record.reviews);
  return {
    view: "author" as const,
    manuscript: m,
    articleSlug: record.articleSlug,
    handlingEditor: m.handlingEditorId
      ? { name: people.get(m.handlingEditorId)?.name ?? "Editor" }
      : null,
    files: await fileViews(ctx, record.files),
    decisions: record.decisions.map((d) => ({
      _id: d._id,
      version: d.version,
      decision: d.decision,
      letter: d.letter,
      decidedAt: d._creationTime,
      editorName: people.get(d.editorId)?.name ?? "Editor",
    })),
    // Reports reach authors with the decision, never before.
    reviews: record.reviews
      .filter((r) => r.status === "submitted" && decidedVersions.has(r.version))
      .sort((a, b) => a.version - b.version || (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
      .map((r) => ({
        _id: r._id,
        label: labels.get(r.reviewerId) ?? "Reviewer",
        version: r.version,
        commentsToAuthor: r.commentsToAuthor ?? "",
        submittedAt: r.submittedAt,
      })),
    events: record.events
      .filter((e) => !e.editorialOnly)
      .map((e) => ({
        _id: e._id,
        type: e.type,
        version: e.version,
        note: e.note,
        at: e._creationTime,
      })),
    checklist: checklistFor(m, record.files),
  };
}

async function editorView(
  ctx: QueryCtx,
  viewer: Viewer,
  m: Doc<"manuscripts">,
  access: ReturnType<typeof accessFor>,
) {
  const record = await loadRecord(ctx, m);
  const people = await usersById(ctx, [
    m.submitterId,
    m.handlingEditorId,
    ...record.reviews.map((r) => r.reviewerId),
    ...record.decisions.map((d) => d.editorId),
    ...record.events.map((e) => e.actorId),
  ]);
  const now = Date.now();
  const submitter = people.get(m.submitterId);
  const handlingEditor = m.handlingEditorId ? people.get(m.handlingEditorId) : undefined;
  return {
    view: "editor" as const,
    manuscript: m,
    articleSlug: record.articleSlug,
    submitter: submitter ? personSummary(submitter) : null,
    handlingEditor: handlingEditor ? personSummary(handlingEditor) : null,
    files: await fileViews(ctx, record.files),
    decisions: record.decisions.map((d) => ({
      _id: d._id,
      version: d.version,
      decision: d.decision,
      letter: d.letter,
      decidedAt: d._creationTime,
      editorName: people.get(d.editorId)?.name ?? "Editor",
    })),
    reviews: record.reviews.map((r) => {
      const reviewer = people.get(r.reviewerId);
      return {
        _id: r._id,
        version: r.version,
        status: r.status,
        reviewer: reviewer ? personSummary(reviewer) : null,
        invitedAt: r._creationTime,
        dueAt: r.dueAt,
        overdue: (r.status === "invited" || r.status === "accepted") && r.dueAt < now,
        respondedAt: r.respondedAt,
        submittedAt: r.submittedAt,
        declineReason: r.declineReason,
        recommendation: r.recommendation,
        scores: r.scores,
        commentsToAuthor: r.status === "submitted" ? r.commentsToAuthor : undefined,
        confidentialComments: r.status === "submitted" ? r.confidentialComments : undefined,
      };
    }),
    events: record.events.map((e) => ({
      _id: e._id,
      type: e.type,
      version: e.version,
      note: e.note,
      at: e._creationTime,
      actorName: e.actorId ? (people.get(e.actorId)?.name ?? null) : null,
    })),
    checklist: [] as ChecklistIssue[],
    permissions: {
      canManage: access.canManage,
      canTake: !m.handlingEditorId,
      isAdmin: access.isAdmin,
      viewerId: viewer._id,
    },
  };
}

// ---------------------------------------------------------------- editors

const BUCKETS = {
  new: ["submitted"],
  mine: ["submitted", "with_editor", "under_review", "revision_requested", "accepted"],
  active: ["with_editor", "under_review"],
  revision: ["revision_requested"],
  accepted: ["accepted"],
  closed: ["rejected", "withdrawn", "published"],
} as const satisfies Record<string, readonly ManuscriptStatus[]>;

export type QueueBucket = keyof typeof BUCKETS;

const bucketValidator = v.union(
  v.literal("new"),
  v.literal("mine"),
  v.literal("active"),
  v.literal("revision"),
  v.literal("accepted"),
  v.literal("closed"),
);

async function bucketRows(ctx: QueryCtx, viewer: Viewer, bucket: QueueBucket) {
  const statuses: readonly ManuscriptStatus[] = BUCKETS[bucket];
  let rows: Doc<"manuscripts">[];
  if (bucket === "mine") {
    rows = (
      await ctx.db
        .query("manuscripts")
        .withIndex("by_handling_editor", (q) => q.eq("handlingEditorId", viewer._id))
        .take(500)
    ).filter((m) => statuses.includes(m.status));
  } else {
    const perStatus = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("manuscripts")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order(bucket === "closed" ? "desc" : "asc")
          .take(bucket === "closed" ? 50 : 500),
      ),
    );
    rows = perStatus.flat();
  }
  // Editors never see manuscripts they wrote, even in lists.
  return rows.filter((m) => !accessFor(viewer, m).conflicted);
}

export const queue = query({
  args: { bucket: bucketValidator },
  handler: async (ctx, { bucket }) => {
    const viewer = await requireRole(ctx, "editor");
    const rows = await bucketRows(ctx, viewer, bucket);
    const editors = await usersById(ctx, rows.map((m) => m.handlingEditorId));
    const now = Date.now();
    const out = await Promise.all(
      rows.map(async (m) => {
        const assignments = await ctx.db
          .query("reviewAssignments")
          .withIndex("by_manuscript", (q) =>
            q.eq("manuscriptId", m._id).eq("version", m.version),
          )
          .take(50);
        const count = (s: string) => assignments.filter((a) => a.status === s).length;
        return {
          _id: m._id,
          code: m.code,
          title: m.title,
          articleType: m.articleType,
          status: m.status,
          version: m.version,
          submittedAt: m.submittedAt,
          updatedAt: m.updatedAt,
          handlingEditorName: m.handlingEditorId
            ? (editors.get(m.handlingEditorId)?.name ?? "Editor")
            : null,
          isMine: m.handlingEditorId === viewer._id,
          reviews: {
            invited: count("invited"),
            accepted: count("accepted"),
            submitted: count("submitted"),
            overdue: assignments.filter(
              (a) => (a.status === "invited" || a.status === "accepted") && a.dueAt < now,
            ).length,
          },
          daysWaiting: m.submittedAt ? Math.floor((now - m.submittedAt) / DAY) : 0,
        };
      }),
    );
    if (bucket === "closed") out.sort((a, b) => b.updatedAt - a.updatedAt);
    else out.sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
    return out;
  },
});

export const queueCounts = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireRole(ctx, "editor");
    const buckets = ["new", "mine", "active", "revision", "accepted"] as const;
    const counts = await Promise.all(
      buckets.map(async (b) => [b, (await bucketRows(ctx, viewer, b)).length] as const),
    );
    return Object.fromEntries(counts) as Record<(typeof buckets)[number], number>;
  },
});

