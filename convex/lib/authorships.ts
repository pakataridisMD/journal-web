import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { findByEmail } from "./people";
import { visibleHandle } from "./profiles";

/**
 * Record which journal members wrote an article, so their profiles can list
 * it. An author is matched by email (manuscript authors have one, and members'
 * emails are verified at sign-in) or by an ORCID iD the member proved.
 */
export async function linkAuthors(
  ctx: MutationCtx,
  articleId: Id<"articles">,
  authors: readonly { email?: string; orcid?: string }[],
  publishedAt: number,
) {
  const existing = await ctx.db
    .query("authorships")
    .withIndex("by_article", (q) => q.eq("articleId", articleId))
    .take(100);
  const seen = new Set(existing.map((a) => a.userId));
  for (const [position, author] of authors.entries()) {
    let userId: Id<"users"> | undefined;
    if (author.email) userId = (await findByEmail(ctx, author.email))?._id;
    if (!userId && author.orcid) {
      const link = await ctx.db
        .query("orcidLinks")
        .withIndex("by_orcid", (q) => q.eq("orcid", author.orcid!))
        .first();
      userId = link?.userId;
    }
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    await ctx.db.insert("authorships", { articleId, userId, position, publishedAt });
  }
}

/** Profile addresses by byline position, for authors whose profiles are on the website. */
export async function authorHandles(ctx: QueryCtx, articleId: Id<"articles">) {
  const rows = await ctx.db
    .query("authorships")
    .withIndex("by_article", (q) => q.eq("articleId", articleId))
    .take(100);
  const handles = new Map<number, string>();
  for (const row of rows) {
    const handle = await visibleHandle(ctx, row.userId);
    if (handle) handles.set(row.position, handle);
  }
  return handles;
}
