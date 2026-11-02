import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { linkAuthors } from "./lib/authorships";

/**
 * Match the authors of articles published before profiles existed to journal
 * members. Safe to run more than once:
 *   npx convex run authorships:backfill
 */
export const backfill = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("articles").paginate({ cursor: cursor ?? null, numItems: 50 });
    for (const article of page.page) {
      const manuscript = article.manuscriptId ? await ctx.db.get("manuscripts", article.manuscriptId) : null;
      // Manuscript authors carry every email; published ones only the corresponding author's.
      const authors = manuscript && manuscript.authors.length === article.authors.length ? manuscript.authors : article.authors;
      await linkAuthors(ctx, article._id, authors, article.publishedAt);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.authorships.backfill, { cursor: page.continueCursor });
    }
    return page.isDone ? "Done." : "Continuing in the background.";
  },
});
