import { v } from "convex/values";
import { fileKinds, submissionRules } from "../src/config/journal";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import { assertStatus, deleteBlobIfUnused, filesFor, loadOwnManuscript } from "./lib/manuscripts";
import { cleanFileName, extensionOf } from "./lib/text";
import { fileKindValidator } from "./lib/validators";

/** Step 1 of an upload: a short-lived URL the browser POSTs the file to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Step 2: attach the uploaded file to the submitter's current version. */
export const attach = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    kind: fileKindValidator,
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const m = await loadOwnManuscript(ctx, viewer, args.manuscriptId);
    assertStatus(m, ["draft", "revision_requested"], "change files");
    if (args.kind === "response_to_reviewers" && m.status !== "revision_requested") {
      fail("INVALID_INPUT", "A response to reviewers is uploaded with a revision.");
    }

    const blob = await ctx.db.system.get("_storage", args.storageId);
    if (!blob) fail("NOT_FOUND", "The upload didn't finish. Please try again.");
    const alreadyUsed = await ctx.db
      .query("manuscriptFiles")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (alreadyUsed) fail("CONFLICT", "That upload is already attached to a manuscript.");

    // Sizes come from storage, not the client. Rejected uploads are left for
    // the nightly cleanup (deleting here would be rolled back with the error).
    const kind = fileKinds[args.kind];
    const fileName = cleanFileName(args.fileName);
    const extension = extensionOf(fileName);
    if (!kind.extensions.includes(extension)) {
      fail(
        "INVALID_INPUT",
        `${kind.label} files must be ${kind.extensions.map((e) => `.${e}`).join(", ")}.`,
      );
    }
    if (blob.size > submissionRules.maxFileBytes) {
      fail("INVALID_INPUT", `Files can be up to ${submissionRules.maxFileBytes / 1024 / 1024} MB.`);
    }

    if (kind.single) {
      const current = await filesFor(ctx, m._id, m.version);
      for (const old of current.filter((f) => f.kind === args.kind)) {
        await ctx.db.delete("manuscriptFiles", old._id);
        await deleteBlobIfUnused(ctx, old.storageId);
      }
    }
    const fileId = await ctx.db.insert("manuscriptFiles", {
      manuscriptId: m._id,
      version: m.version,
      kind: args.kind,
      storageId: args.storageId,
      fileName,
      contentType: blob.contentType ?? "application/octet-stream",
      size: blob.size,
      uploadedBy: viewer._id,
    });
    await ctx.db.patch("manuscripts", m._id, { updatedAt: Date.now() });
    return fileId;
  },
});

export const remove = mutation({
  args: { fileId: v.id("manuscriptFiles") },
  handler: async (ctx, { fileId }) => {
    const viewer = await requireViewer(ctx);
    const file = await ctx.db.get("manuscriptFiles", fileId);
    if (!file) fail("NOT_FOUND", "That file has already been removed.");
    const m = await loadOwnManuscript(ctx, viewer, file.manuscriptId);
    assertStatus(m, ["draft", "revision_requested"], "change files");
    if (file.version !== m.version) {
      fail("INVALID_STATE", "Files from earlier versions are part of the record.");
    }
    await ctx.db.delete("manuscriptFiles", file._id);
    await deleteBlobIfUnused(ctx, file.storageId);
    await ctx.db.patch("manuscripts", m._id, { updatedAt: Date.now() });
  },
});

const ORPHAN_AGE = 24 * 60 * 60 * 1000;

/**
 * Nightly: delete uploads that were never attached (abandoned or rejected),
 * a page at a time.
 */
export const deleteOrphanedUploads = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }): Promise<null> => {
    const page = await ctx.db.system
      .query("_storage")
      .paginate({ numItems: 100, cursor: cursor ?? null });
    const cutoff = Date.now() - ORPHAN_AGE;
    for (const blob of page.page) {
      if (blob._creationTime > cutoff) continue;
      await deleteBlobIfUnused(ctx, blob._id);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.files.deleteOrphanedUploads, {
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
