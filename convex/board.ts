import { v } from "convex/values";
import { boardGroupOrder, subjects, suggestedBoard, type BoardGroupKey } from "../src/config/journal";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { fail } from "./lib/errors";
import { ensureProfile, personCard, profileOf } from "./lib/profiles";
import { boardGroupValidator } from "./lib/validators";

const MAX_POSITIONS = 120;
const MAX_TITLE = 120;

function cleanTitle(title: string) {
  const clean = title.trim().replace(/\s+/g, " ");
  if (!clean) fail("INVALID_INPUT", "Give the position a title.");
  if (clean.length > MAX_TITLE) fail("INVALID_INPUT", `Keep the title under ${MAX_TITLE} characters.`);
  return clean;
}

function checkSubject(subject: string | undefined) {
  if (subject !== undefined && !(subjects as readonly string[]).includes(subject)) {
    fail("INVALID_INPUT", "Choose a subject from the list.");
  }
}

async function groupRows(ctx: QueryCtx, group: BoardGroupKey) {
  return await ctx.db
    .query("boardPositions")
    .withIndex("by_group", (q) => q.eq("group", group))
    .take(MAX_POSITIONS);
}

async function allPositions(ctx: QueryCtx) {
  const groups = await Promise.all(boardGroupOrder.map((group) => groupRows(ctx, group)));
  return groups.flat();
}

async function loadPosition(ctx: MutationCtx, positionId: Id<"boardPositions">) {
  const position = await ctx.db.get("boardPositions", positionId);
  if (!position) fail("NOT_FOUND", "That position no longer exists.");
  return position;
}

async function nextOrder(ctx: QueryCtx, group: BoardGroupKey) {
  const last = await ctx.db
    .query("boardPositions")
    .withIndex("by_group", (q) => q.eq("group", group))
    .order("desc")
    .first();
  return (last?.order ?? 0) + 1;
}

async function holder(ctx: QueryCtx, position: Doc<"boardPositions">) {
  if (!position.userId) return null;
  const user = await ctx.db.get("users", position.userId);
  if (!user) return null;
  // Board members' profiles are public by appointment, so always linked.
  return personCard(user, await profileOf(ctx, user._id), true);
}

// ---------------------------------------------------------------- public

/**
 * The board for the Who we are page, in page order. Until the editor-in-chief
 * sets one up, the suggested positions from the journal config show as open.
 */
export const publicBoard = query({
  args: {},
  handler: async (ctx) => {
    const rows = await allPositions(ctx);
    if (rows.length === 0) {
      return {
        configured: false,
        positions: suggestedBoard.map((p, i) => ({
          _id: `suggested-${i}`,
          group: p.group,
          title: p.title,
          subject: p.subject as string | undefined,
          person: null,
        })),
      };
    }
    return {
      configured: true,
      positions: await Promise.all(
        rows.map(async (p) => ({
          _id: p._id as string,
          group: p.group,
          title: p.title,
          subject: p.subject,
          person: await holder(ctx, p),
        })),
      ),
    };
  },
});

// ---------------------------------------------------------------- editor-in-chief

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const rows = await allPositions(ctx);
    return await Promise.all(
      rows.map(async (p) => {
        const user = p.userId ? await ctx.db.get("users", p.userId) : null;
        return {
          _id: p._id,
          group: p.group,
          title: p.title,
          subject: p.subject,
          order: p.order,
          person: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                affiliation: user.affiliation,
                hasAccount: user.tokenIdentifier !== undefined,
                handle: (await profileOf(ctx, user._id))?.handle ?? null,
              }
            : null,
        };
      }),
    );
  },
});

/** Start from the positions in the journal config. Only when the board is empty. */
export const addSuggested = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    if (await ctx.db.query("boardPositions").first()) {
      fail("INVALID_STATE", "The board already has positions.");
    }
    const orders = new Map<BoardGroupKey, number>();
    for (const p of suggestedBoard) {
      const order = (orders.get(p.group) ?? 0) + 1;
      orders.set(p.group, order);
      await ctx.db.insert("boardPositions", { group: p.group, title: p.title, subject: p.subject, order });
    }
  },
});

export const addPosition = mutation({
  args: {
    group: boardGroupValidator,
    title: v.string(),
    subject: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.id("boardPositions"),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const count = (await ctx.db.query("boardPositions").take(MAX_POSITIONS)).length;
    if (count >= MAX_POSITIONS) fail("INVALID_INPUT", "The board is full.");
    checkSubject(args.subject);
    if (args.userId) {
      const user = await ctx.db.get("users", args.userId);
      if (!user) fail("NOT_FOUND", "That person no longer exists.");
      await ensureProfile(ctx, user);
    }
    return await ctx.db.insert("boardPositions", {
      group: args.group,
      title: cleanTitle(args.title),
      subject: args.subject,
      userId: args.userId,
      order: await nextOrder(ctx, args.group),
    });
  },
});

export const updatePosition = mutation({
  args: {
    positionId: v.id("boardPositions"),
    group: v.optional(boardGroupValidator),
    title: v.optional(v.string()),
    /** null clears the subject. */
    subject: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const position = await loadPosition(ctx, args.positionId);
    const patch: Partial<Doc<"boardPositions">> = {};
    if (args.title !== undefined) patch.title = cleanTitle(args.title);
    if (args.subject !== undefined) {
      checkSubject(args.subject ?? undefined);
      patch.subject = args.subject ?? undefined;
    }
    if (args.group !== undefined && args.group !== position.group) {
      patch.group = args.group;
      patch.order = await nextOrder(ctx, args.group);
    }
    await ctx.db.patch("boardPositions", position._id, patch);
  },
});

/** Appoint someone to a position, or with no userId leave it open. */
export const assign = mutation({
  args: { positionId: v.id("boardPositions"), userId: v.optional(v.id("users")) },
  handler: async (ctx, { positionId, userId }) => {
    await requireRole(ctx, "admin");
    const position = await loadPosition(ctx, positionId);
    if (userId) {
      const user = await ctx.db.get("users", userId);
      if (!user) fail("NOT_FOUND", "That person no longer exists.");
      // Their profile page goes up with the appointment.
      await ensureProfile(ctx, user);
    }
    await ctx.db.patch("boardPositions", position._id, { userId });
  },
});

/** Swap a position with its neighbour in the same group. */
export const move = mutation({
  args: { positionId: v.id("boardPositions"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { positionId, direction }) => {
    await requireRole(ctx, "admin");
    const position = await loadPosition(ctx, positionId);
    const neighbour = await ctx.db
      .query("boardPositions")
      .withIndex("by_group", (q) =>
        direction === "up"
          ? q.eq("group", position.group).lt("order", position.order)
          : q.eq("group", position.group).gt("order", position.order),
      )
      .order(direction === "up" ? "desc" : "asc")
      .first();
    if (!neighbour) return;
    await ctx.db.patch("boardPositions", position._id, { order: neighbour.order });
    await ctx.db.patch("boardPositions", neighbour._id, { order: position.order });
  },
});

export const removePosition = mutation({
  args: { positionId: v.id("boardPositions") },
  handler: async (ctx, { positionId }) => {
    await requireRole(ctx, "admin");
    const position = await loadPosition(ctx, positionId);
    await ctx.db.delete("boardPositions", position._id);
  },
});
