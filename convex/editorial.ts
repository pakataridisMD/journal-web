import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { hasRole, requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  accessFor,
  assertStatus,
  cancelOpenReviews,
  filesFor,
  isConflicted,
  loadManuscript,
  logEvent,
  requireManage,
} from "./lib/manuscripts";
import { DECISION_LABELS } from "./lib/labels";
import { decisionKindValidator } from "./lib/validators";

/**
 * Editors take unassigned manuscripts themselves; the editor-in-chief (admin)
 * assigns or reassigns anyone.
 */
export const assignEditor = mutation({
  args: { manuscriptId: v.id("manuscripts"), editorId: v.id("users") },
  handler: async (ctx, { manuscriptId, editorId }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadManuscript(ctx, manuscriptId);
    const access = accessFor(viewer, m);
    if (!access.isEditorial) fail("FORBIDDEN", "Only editors can assign manuscripts.");
    assertStatus(
      m,
      ["submitted", "with_editor", "under_review", "revision_requested", "accepted"],
      "change the handling editor",
    );
    const selfTake = editorId === viewer._id && !m.handlingEditorId;
    if (!access.isAdmin && !selfTake) {
      fail("FORBIDDEN", "Only the editor-in-chief can assign or reassign other editors.");
    }
    const editor = await ctx.db.get("users", editorId);
    if (!editor || !hasRole(editor, "editor")) {
      fail("INVALID_INPUT", "Choose someone with the editor role.");
    }
    if (isConflicted(m, editor)) {
      fail("INVALID_INPUT", `${editor.name} is an author of this manuscript (conflict of interest).`);
    }
    if (m.handlingEditorId === editorId) return;
    await ctx.db.patch("manuscripts", m._id, {
      handlingEditorId: editorId,
      status: m.status === "submitted" ? "with_editor" : m.status,
      updatedAt: Date.now(),
    });
    await logEvent(ctx, m, "editor_assigned", viewer._id, editor.name);
  },
});

export const decide = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    decision: decisionKindValidator,
    letter: v.string(),
  },
  handler: async (ctx, { manuscriptId, decision, letter }) => {
    const viewer = await requireViewer(ctx);
    const m = await loadManuscript(ctx, manuscriptId);
    requireManage(viewer, m);
    if (decision === "desk_reject") {
      assertStatus(m, ["submitted", "with_editor"], "reject without review");
    } else {
      assertStatus(m, ["with_editor", "under_review"], "make a decision");
    }
    const text = letter.trim();
    if (!text) fail("INVALID_INPUT", "Write a decision letter to the authors.");
    if (text.length > 20_000) fail("INVALID_INPUT", "The decision letter is too long.");

    await ctx.db.insert("decisions", {
      manuscriptId: m._id,
      version: m.version,
      editorId: viewer._id,
      decision,
      letter: text,
    });
    await cancelOpenReviews(ctx, m, viewer._id);
    await logEvent(ctx, m, "decision", viewer._id, DECISION_LABELS[decision]);

    const now = Date.now();
    if (decision === "accept") {
      await ctx.db.patch("manuscripts", m._id, {
        status: "accepted",
        acceptedAt: now,
        decidedAt: now,
        updatedAt: now,
      });
    } else if (decision === "minor_revision" || decision === "major_revision") {
      // Open the next version with this version's files, so authors only
      // replace what changed. Responses are written fresh each round.
      const nextVersion = m.version + 1;
      const files = await filesFor(ctx, m._id, m.version);
      for (const f of files) {
        if (f.kind === "response_to_reviewers") continue;
        await ctx.db.insert("manuscriptFiles", {
          manuscriptId: m._id,
          version: nextVersion,
          kind: f.kind,
          storageId: f.storageId,
          fileName: f.fileName,
          contentType: f.contentType,
          size: f.size,
          uploadedBy: f.uploadedBy,
        });
      }
      await ctx.db.patch("manuscripts", m._id, {
        status: "revision_requested",
        version: nextVersion,
        decidedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch("manuscripts", m._id, {
        status: "rejected",
        decidedAt: now,
        updatedAt: now,
      });
    }
  },
});

