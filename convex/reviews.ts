import { v } from "convex/values";
import { fileKinds } from "../src/config/journal";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireViewer, type Viewer } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  DAY,
  assertStatus,
  fileViews,
  filesFor,
  isConflicted,
  isListedAuthor,
  loadManuscript,
  logEvent,
  requireManage,
} from "./lib/manuscripts";
import { findOrCreatePerson, withRoles } from "./lib/people";
import { recommendationValidator, reviewScoresValidator } from "./lib/validators";

const OPEN = new Set(["invited", "accepted", "submitted"]);

export const invite = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    reviewerId: v.optional(v.id("users")),
    newReviewer: v.optional(
      v.object({ email: v.string(), name: v.string(), affiliation: v.optional(v.string()) }),
    ),
    dueInDays: v.number(),
    message: v.optional(v.string()),
  },
  returns: v.id("reviewAssignments"),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const m = await loadManuscript(ctx, args.manuscriptId);
    requireManage(viewer, m);
    assertStatus(m, ["with_editor", "under_review"], "invite reviewers");
    if (!Number.isInteger(args.dueInDays) || args.dueInDays < 1 || args.dueInDays > 90) {
      fail("INVALID_INPUT", "Give the reviewer between 1 and 90 days.");
    }
    const message = args.message?.trim() || undefined;
    if (message && message.length > 5_000) fail("INVALID_INPUT", "The message is too long.");

    let reviewer: Doc<"users"> | null;
    if (args.reviewerId && !args.newReviewer) {
      reviewer = await ctx.db.get("users", args.reviewerId);
      if (!reviewer) fail("NOT_FOUND", "That person no longer exists.");
    } else if (args.newReviewer && !args.reviewerId) {
      // Check before creating anyone, so a conflicted invite leaves no trace.
      if (isListedAuthor(m, args.newReviewer.email)) {
        fail("INVALID_INPUT", "That person is an author of this manuscript (conflict of interest).");
      }
      const id = await findOrCreatePerson(ctx, args.newReviewer, "reviewer");
      reviewer = await ctx.db.get("users", id);
    } else {
      fail("INVALID_INPUT", "Choose a reviewer, or enter a new reviewer's details.");
    }
    if (!reviewer) fail("NOT_FOUND", "That person no longer exists.");

    if (isConflicted(m, reviewer)) {
      fail("INVALID_INPUT", `${reviewer.name} is an author of this manuscript (conflict of interest).`);
    }
    if (reviewer._id === m.handlingEditorId) {
      fail("INVALID_INPUT", "The handling editor can't also review the manuscript (conflict of interest).");
    }
    const previous = await ctx.db
      .query("reviewAssignments")
      .withIndex("by_manuscript_reviewer", (q) =>
        q.eq("manuscriptId", m._id).eq("reviewerId", reviewer._id),
      )
      .collect();
    if (previous.some((a) => a.version === m.version && OPEN.has(a.status))) {
      fail("CONFLICT", `${reviewer.name} is already reviewing this version.`);
    }

    const now = Date.now();
    const assignmentId = await ctx.db.insert("reviewAssignments", {
      manuscriptId: m._id,
      version: m.version,
      reviewerId: reviewer._id,
      invitedBy: viewer._id,
      status: "invited",
      dueAt: now + args.dueInDays * DAY,
      message,
    });
    if (!reviewer.roles.includes("reviewer")) {
      await ctx.db.patch("users", reviewer._id, withRoles(reviewer.roles, ["reviewer"]));
    }
    if (m.status === "with_editor") {
      await ctx.db.patch("manuscripts", m._id, { status: "under_review", updatedAt: now });
    }
    await logEvent(ctx, m, "reviewer_invited", viewer._id, reviewer.name);
    return assignmentId;
  },
});

async function loadOwnAssignment(ctx: QueryCtx | MutationCtx, viewer: Viewer, id: Doc<"reviewAssignments">["_id"]) {
  const assignment = await ctx.db.get("reviewAssignments", id);
  if (!assignment || assignment.reviewerId !== viewer._id) {
    fail("NOT_FOUND", "We couldn't find that review invitation.");
  }
  return assignment;
}

function assertAssignmentStatus(
  assignment: Doc<"reviewAssignments">,
  allowed: Doc<"reviewAssignments">["status"][],
  action: string,
) {
  if (!allowed.includes(assignment.status)) {
    const why =
      assignment.status === "cancelled"
        ? "the editor has closed this invitation"
        : assignment.status === "declined"
          ? "you declined this invitation"
          : assignment.status === "submitted"
            ? "your report is already in"
            : assignment.status === "invited"
              ? "you haven't accepted the invitation yet"
              : "the invitation is still open";
    fail("INVALID_STATE", `You can't ${action}: ${why}.`);
  }
}

export const respond = mutation({
  args: {
    assignmentId: v.id("reviewAssignments"),
    accept: v.boolean(),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const a = await loadOwnAssignment(ctx, viewer, args.assignmentId);
    assertAssignmentStatus(a, ["invited"], "respond");
    const m = await loadManuscript(ctx, a.manuscriptId);
    const declineReason = args.declineReason?.trim() || undefined;
    if (declineReason && declineReason.length > 2_000) {
      fail("INVALID_INPUT", "Keep the reason under 2,000 characters.");
    }
    await ctx.db.patch("reviewAssignments", a._id, {
      status: args.accept ? "accepted" : "declined",
      respondedAt: Date.now(),
      declineReason: args.accept ? undefined : declineReason,
    });
    await logEvent(
      ctx,
      { _id: m._id, version: a.version },
      args.accept ? "reviewer_accepted" : "reviewer_declined",
      viewer._id,
      viewer.name,
    );
  },
});

const reportFields = {
  recommendation: v.optional(recommendationValidator),
  scores: v.optional(reviewScoresValidator),
  commentsToAuthor: v.optional(v.string()),
  confidentialComments: v.optional(v.string()),
};

function checkReportLengths(fields: { commentsToAuthor?: string; confidentialComments?: string }) {
  if ((fields.commentsToAuthor?.length ?? 0) > 50_000) {
    fail("INVALID_INPUT", "Comments to the authors are too long (50,000 characters at most).");
  }
  if ((fields.confidentialComments?.length ?? 0) > 20_000) {
    fail("INVALID_INPUT", "Comments to the editor are too long (20,000 characters at most).");
  }
}

function checkScores(scores: Doc<"reviewAssignments">["scores"]) {
  if (!scores) return;
  for (const value of Object.values(scores)) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      fail("INVALID_INPUT", "Scores run from 1 to 5.");
    }
  }
}

/** Autosave while the reviewer writes. */
export const saveDraft = mutation({
  args: { assignmentId: v.id("reviewAssignments"), ...reportFields },
  handler: async (ctx, { assignmentId, ...fields }) => {
    const viewer = await requireViewer(ctx);
    const a = await loadOwnAssignment(ctx, viewer, assignmentId);
    assertAssignmentStatus(a, ["accepted"], "edit this report");
    checkReportLengths(fields);
    checkScores(fields.scores);
    await ctx.db.patch("reviewAssignments", a._id, fields);
  },
});

export const submit = mutation({
  args: {
    assignmentId: v.id("reviewAssignments"),
    recommendation: recommendationValidator,
    scores: reviewScoresValidator,
    commentsToAuthor: v.string(),
    confidentialComments: v.optional(v.string()),
  },
  handler: async (ctx, { assignmentId, ...report }) => {
    const viewer = await requireViewer(ctx);
    const a = await loadOwnAssignment(ctx, viewer, assignmentId);
    assertAssignmentStatus(a, ["accepted"], "submit a report");
    const m = await loadManuscript(ctx, a.manuscriptId);
    if (m.version !== a.version || !["with_editor", "under_review"].includes(m.status)) {
      fail("INVALID_STATE", "This round of review has closed.");
    }
    checkScores(report.scores);
    checkReportLengths(report);
    const commentsToAuthor = report.commentsToAuthor.trim();
    if (commentsToAuthor.length < 20) {
      fail("INVALID_INPUT", "Write your comments to the authors before submitting.");
    }
    await ctx.db.patch("reviewAssignments", a._id, {
      recommendation: report.recommendation,
      scores: report.scores,
      commentsToAuthor,
      confidentialComments: report.confidentialComments?.trim() || undefined,
      status: "submitted",
      submittedAt: Date.now(),
    });
    await logEvent(ctx, m, "review_submitted", viewer._id, viewer.name);
  },
});

export const cancel = mutation({
  args: { assignmentId: v.id("reviewAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const viewer = await requireViewer(ctx);
    const a = await ctx.db.get("reviewAssignments", assignmentId);
    if (!a) fail("NOT_FOUND", "We couldn't find that invitation.");
    const m = await loadManuscript(ctx, a.manuscriptId);
    requireManage(viewer, m);
    if (a.status !== "invited" && a.status !== "accepted") {
      fail("INVALID_STATE", "Only open invitations can be cancelled.");
    }
    await ctx.db.patch("reviewAssignments", a._id, { status: "cancelled" });
    await logEvent(ctx, { _id: m._id, version: a.version }, "review_cancelled", viewer._id);
  },
});

/** The reviewer's invitations and reports, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const assignments = await ctx.db
      .query("reviewAssignments")
      .withIndex("by_reviewer", (q) => q.eq("reviewerId", viewer._id))
      .order("desc")
      .take(200);
    const now = Date.now();
    return await Promise.all(
      assignments.map(async (a) => {
        const m = await ctx.db.get("manuscripts", a.manuscriptId);
        return {
          _id: a._id,
          status: a.status,
          version: a.version,
          dueAt: a.dueAt,
          invitedAt: a._creationTime,
          submittedAt: a.submittedAt,
          overdue: (a.status === "invited" || a.status === "accepted") && a.dueAt < now,
          manuscript: m
            ? { code: m.code, title: m.title, articleType: m.articleType }
            : null,
        };
      }),
    );
  },
});

/**
 * What a reviewer sees: the anonymized record, and the files only while the
 * invitation is accepted or the report is in. Never authors, title pages,
 * cover letters, funding or competing interests.
 */
export const getAssignment = query({
  args: { assignmentId: v.id("reviewAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const viewer = await requireViewer(ctx);
    const a = await loadOwnAssignment(ctx, viewer, assignmentId);
    const m = await loadManuscript(ctx, a.manuscriptId);
    const inviter = await ctx.db.get("users", a.invitedBy);
    const canOpenFiles = a.status === "accepted" || a.status === "submitted";
    const files = canOpenFiles
      ? (await filesFor(ctx, m._id, a.version)).filter((f) => fileKinds[f.kind].visibleToReviewers)
      : [];
    const earlier = (
      await ctx.db
        .query("reviewAssignments")
        .withIndex("by_manuscript_reviewer", (q) =>
          q.eq("manuscriptId", m._id).eq("reviewerId", viewer._id),
        )
        .collect()
    ).filter((other) => other.version < a.version && other.status === "submitted");

    return {
      assignment: {
        _id: a._id,
        status: a.status,
        version: a.version,
        dueAt: a.dueAt,
        invitedAt: a._creationTime,
        invitedByName: inviter?.name ?? "The editor",
        message: a.message,
        respondedAt: a.respondedAt,
        submittedAt: a.submittedAt,
        declineReason: a.declineReason,
        recommendation: a.recommendation,
        scores: a.scores,
        commentsToAuthor: a.commentsToAuthor,
        confidentialComments: a.confidentialComments,
      },
      manuscript: {
        _id: m._id,
        code: m.code,
        title: m.title,
        articleType: m.articleType,
        abstractSections: m.abstractSections,
        keywords: m.keywords,
        subjects: m.subjects,
        currentVersion: m.version,
        statements: {
          ethics: m.declarations.ethics,
          consent: m.declarations.consent,
          dataAvailability: m.declarations.dataAvailability,
          aiUse: m.declarations.aiUse,
        },
      },
      files: await fileViews(ctx, files),
      earlierReports: earlier.map((e) => ({
        version: e.version,
        recommendation: e.recommendation,
        commentsToAuthor: e.commentsToAuthor ?? "",
        submittedAt: e.submittedAt,
      })),
    };
  },
});

