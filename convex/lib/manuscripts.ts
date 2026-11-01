import { fileKinds, journal } from "../../src/config/journal";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { hasRole, type Viewer } from "./auth";
import { fail } from "./errors";
import { normalizeEmail } from "./text";
import type { EventType, ManuscriptStatus } from "./validators";

export const DAY = 24 * 60 * 60 * 1000;

/** Statuses in which a manuscript is with the journal and awaiting a decision. */
export const IN_PROGRESS: readonly ManuscriptStatus[] = [
  "submitted",
  "with_editor",
  "under_review",
  "revision_requested",
];

export const STATUS_LABELS: Record<ManuscriptStatus, string> = {
  draft: "a draft",
  submitted: "awaiting an editor",
  with_editor: "with the editor",
  under_review: "under review",
  revision_requested: "awaiting revision",
  accepted: "accepted",
  rejected: "rejected",
  withdrawn: "withdrawn",
  published: "published",
};

export async function loadManuscript(
  ctx: QueryCtx | MutationCtx,
  id: Id<"manuscripts">,
): Promise<Doc<"manuscripts">> {
  const manuscript = await ctx.db.get("manuscripts", id);
  if (!manuscript) fail("NOT_FOUND", "We couldn't find that manuscript.");
  return manuscript;
}

export type Access = {
  isSubmitter: boolean;
  /** Submitter or listed author: may never act as editor or reviewer on it. */
  conflicted: boolean;
  /** Editorial staff without a conflict: may read the full record. */
  isEditorial: boolean;
  isAdmin: boolean;
  isHandlingEditor: boolean;
  /** May invite reviewers and make decisions. */
  canManage: boolean;
};

export function isListedAuthor(manuscript: Doc<"manuscripts">, email: string): boolean {
  const target = normalizeEmail(email);
  return manuscript.authors.some((a) => normalizeEmail(a.email) === target);
}

export function isConflicted(manuscript: Doc<"manuscripts">, user: Doc<"users">): boolean {
  return manuscript.submitterId === user._id || isListedAuthor(manuscript, user.email);
}

export function accessFor(viewer: Viewer, manuscript: Doc<"manuscripts">): Access {
  const isSubmitter = manuscript.submitterId === viewer._id;
  const conflicted = isConflicted(manuscript, viewer);
  // Drafts belong to their author alone.
  const visibleToStaff = manuscript.status !== "draft";
  const isEditorial = visibleToStaff && !conflicted && hasRole(viewer, "editor");
  const isAdmin = isEditorial && hasRole(viewer, "admin");
  const isHandlingEditor = isEditorial && manuscript.handlingEditorId === viewer._id;
  return {
    isSubmitter,
    conflicted,
    isEditorial,
    isAdmin,
    isHandlingEditor,
    canManage: isAdmin || isHandlingEditor,
  };
}

/** The submitter's own manuscript; anyone else is told it doesn't exist. */
export async function loadOwnManuscript(
  ctx: QueryCtx | MutationCtx,
  viewer: Viewer,
  id: Id<"manuscripts">,
): Promise<Doc<"manuscripts">> {
  const manuscript = await ctx.db.get("manuscripts", id);
  if (!manuscript || manuscript.submitterId !== viewer._id) {
    fail("NOT_FOUND", "We couldn't find that manuscript.");
  }
  return manuscript;
}

export function requireManage(viewer: Viewer, manuscript: Doc<"manuscripts">): Access {
  const access = accessFor(viewer, manuscript);
  if (!access.canManage) {
    fail(
      "FORBIDDEN",
      "Only the handling editor or the editor-in-chief can do that.",
    );
  }
  return access;
}

export function assertStatus(
  manuscript: Doc<"manuscripts">,
  allowed: readonly ManuscriptStatus[],
  action: string,
): void {
  if (!allowed.includes(manuscript.status)) {
    fail(
      "INVALID_STATE",
      `You can't ${action} while the manuscript is ${STATUS_LABELS[manuscript.status]}.`,
    );
  }
}

const EDITORIAL_ONLY: ReadonlySet<EventType> = new Set([
  "reviewer_invited",
  "reviewer_accepted",
  "reviewer_declined",
  "review_submitted",
  "review_cancelled",
]);

export async function logEvent(
  ctx: MutationCtx,
  manuscript: Pick<Doc<"manuscripts">, "_id" | "version">,
  type: EventType,
  actorId: Id<"users"> | undefined,
  note?: string,
): Promise<void> {
  await ctx.db.insert("manuscriptEvents", {
    manuscriptId: manuscript._id,
    version: manuscript.version,
    type,
    actorId,
    editorialOnly: EDITORIAL_ONLY.has(type),
    note,
  });
}

export async function nextCounter(ctx: MutationCtx, name: string): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (!counter) {
    await ctx.db.insert("counters", { name, value: 1 });
    return 1;
  }
  const value = counter.value + 1;
  await ctx.db.patch("counters", counter._id, { value });
  return value;
}

/** e.g. TJ-2026-0007 */
export async function nextManuscriptCode(ctx: MutationCtx, now: number): Promise<string> {
  const year = new Date(now).getUTCFullYear();
  const n = await nextCounter(ctx, `manuscript-${year}`);
  return `${journal.codePrefix}-${year}-${String(n).padStart(4, "0")}`;
}

/** Cancel invitations nobody has finished, e.g. after a decision. */
export async function cancelOpenReviews(
  ctx: MutationCtx,
  manuscript: Doc<"manuscripts">,
  actorId: Id<"users">,
): Promise<void> {
  const assignments = await ctx.db
    .query("reviewAssignments")
    .withIndex("by_manuscript", (q) =>
      q.eq("manuscriptId", manuscript._id).eq("version", manuscript.version),
    )
    .collect();
  for (const a of assignments) {
    if (a.status === "invited" || a.status === "accepted") {
      await ctx.db.patch("reviewAssignments", a._id, { status: "cancelled" });
      await logEvent(ctx, manuscript, "review_cancelled", actorId);
    }
  }
}

export async function filesFor(
  ctx: QueryCtx | MutationCtx,
  manuscriptId: Id<"manuscripts">,
  version?: number,
): Promise<Doc<"manuscriptFiles">[]> {
  return await ctx.db
    .query("manuscriptFiles")
    .withIndex("by_manuscript_version", (q) =>
      version === undefined
        ? q.eq("manuscriptId", manuscriptId)
        : q.eq("manuscriptId", manuscriptId).eq("version", version),
    )
    .take(500);
}

export async function fileViews(
  ctx: QueryCtx,
  files: readonly Doc<"manuscriptFiles">[],
) {
  return await Promise.all(
    files.map(async (f) => ({
      _id: f._id,
      version: f.version,
      kind: f.kind,
      label: fileKinds[f.kind].label,
      fileName: f.fileName,
      contentType: f.contentType,
      size: f.size,
      uploadedAt: f._creationTime,
      url: await ctx.storage.getUrl(f.storageId),
    })),
  );
}

/** Delete a stored blob unless another file row still points at it. */
export async function deleteBlobIfUnused(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const stillUsed = await ctx.db
    .query("manuscriptFiles")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (stillUsed) return;
  const usedByArticle = await ctx.db
    .query("articles")
    .withIndex("by_pdf", (q) => q.eq("pdfStorageId", storageId))
    .first();
  if (usedByArticle) return;
  if (await ctx.db.system.get("_storage", storageId)) {
    await ctx.storage.delete(storageId);
  }
}

/** Fetch several users at once, keyed by id. */
export async function usersById(
  ctx: QueryCtx,
  ids: readonly (Id<"users"> | undefined)[],
): Promise<Map<Id<"users">, Doc<"users">>> {
  const unique = Array.from(new Set(ids.filter((id): id is Id<"users"> => !!id)));
  const docs = await Promise.all(unique.map((id) => ctx.db.get("users", id)));
  const map = new Map<Id<"users">, Doc<"users">>();
  for (const doc of docs) if (doc) map.set(doc._id, doc);
  return map;
}
