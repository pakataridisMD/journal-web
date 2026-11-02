import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { findByEmail } from "./people";
import { orcidLinkOf, visibleHandle } from "./profiles";

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

/**
 * What the journal knows about each byline position that belongs to a member:
 * their profile address when it's on the website, and the ORCID iD they proved.
 */
export async function authorLinks(ctx: QueryCtx, articleId: Id<"articles">) {
  const rows = await ctx.db
    .query("authorships")
    .withIndex("by_article", (q) => q.eq("articleId", articleId))
    .take(100);
  const links = new Map<number, { handle: string | null; orcid: string | null }>();
  for (const row of rows) {
    const [handle, link] = await Promise.all([visibleHandle(ctx, row.userId), orcidLinkOf(ctx, row.userId)]);
    links.set(row.position, { handle, orcid: link?.orcid ?? null });
  }
  return links;
}
