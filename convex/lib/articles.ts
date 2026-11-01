import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type Article = Doc<"articles">;

function snippet(article: Article, max = 320): string {
  const text = article.abstractSections.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** The article's issue, if that issue is published. */
export async function issueRef(ctx: QueryCtx, issueId: Id<"issues"> | undefined) {
  if (!issueId) return null;
  const issue = await ctx.db.get("issues", issueId);
  if (!issue || issue.status !== "published") return null;
  return { _id: issue._id, volume: issue.volume, number: issue.number, title: issue.title };
}

/** What lists and cards need; no body or references. */
export async function articleCard(ctx: QueryCtx, article: Article) {
  return {
    _id: article._id,
    slug: article.slug,
    title: article.title,
    articleType: article.articleType,
    articleNumber: article.articleNumber,
    authors: article.authors.map((a) => a.name),
    subjects: article.subjects,
    snippet: snippet(article),
    publishedAt: article.publishedAt,
    featured: article.featured,
    issue: await issueRef(ctx, article.issueId),
  };
}
