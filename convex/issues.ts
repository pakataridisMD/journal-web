import { v } from "convex/values";
import { tocOrder } from "../src/config/journal";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { articleCard } from "./lib/articles";
import { fail } from "./lib/errors";

async function tableOfContents(ctx: QueryCtx, issue: Doc<"issues">) {
  const articles = await ctx.db
    .query("articles")
    .withIndex("by_issue", (q) => q.eq("issueId", issue._id))
    .take(300);
  const published = articles.filter((a) => a.status === "published");
  const cards = await Promise.all(published.map((a) => articleCard(ctx, a)));
  return tocOrder
    .map((type) => ({
      articleType: type,
      articles: cards.filter((c) => c.articleType === type),
    }))
    .filter((section) => section.articles.length > 0);
}

function issueSummary(issue: Doc<"issues">) {
  return {
    _id: issue._id,
    volume: issue.volume,
    number: issue.number,
    title: issue.title,
    description: issue.description,
    publishedAt: issue.publishedAt,
    status: issue.status,
  };
}

/** The archive: every published issue, newest first. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(500);
    return await Promise.all(
      issues.map(async (issue) => {
        const articles = await ctx.db
          .query("articles")
          .withIndex("by_issue", (q) => q.eq("issueId", issue._id))
          .take(300);
        return {
          ...issueSummary(issue),
          articleCount: articles.filter((a) => a.status === "published").length,
        };
      }),
    );
  },
});

export const get = query({
  args: { volume: v.number(), number: v.number() },
  handler: async (ctx, { volume, number }) => {
    const issue = await ctx.db
      .query("issues")
      .withIndex("by_volume_number", (q) => q.eq("volume", volume).eq("number", number))
      .unique();
    if (!issue || issue.status !== "published") return null;
    return { ...issueSummary(issue), sections: await tableOfContents(ctx, issue) };
  },
});

/** The latest published issue with its contents. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const issue = await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .first();
    if (!issue) return null;
    return { ...issueSummary(issue), sections: await tableOfContents(ctx, issue) };
  },
});

/** Published articles not yet in a published issue. */
export const onlineFirst = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const recent = await ctx.db
      .query("articles")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(100);
    const cards = await Promise.all(recent.map((a) => articleCard(ctx, a)));
    return cards.filter((c) => c.issue === null).slice(0, Math.min(limit ?? 10, 50));
  },
});

// ---------------------------------------------------------------- editors

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const issues = await ctx.db.query("issues").withIndex("by_volume_number").order("desc").take(500);
    return await Promise.all(
      issues.map(async (issue) => {
        const articles = await ctx.db
          .query("articles")
          .withIndex("by_issue", (q) => q.eq("issueId", issue._id))
          .take(300);
        return { ...issueSummary(issue), articleCount: articles.length };
      }),
    );
  },
});

export const create = mutation({
  args: {
    volume: v.number(),
    number: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    if (![args.volume, args.number].every((n) => Number.isInteger(n) && n > 0 && n < 10_000)) {
      fail("INVALID_INPUT", "Volume and number are positive whole numbers.");
    }
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_volume_number", (q) => q.eq("volume", args.volume).eq("number", args.number))
      .unique();
    if (existing) fail("CONFLICT", `Volume ${args.volume}, issue ${args.number} already exists.`);
    return await ctx.db.insert("issues", {
      volume: args.volume,
      number: args.number,
      title: args.title?.trim() || undefined,
      description: args.description?.trim() || undefined,
      status: "draft",
    });
  },
});

export const update = mutation({
  args: {
    issueId: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { issueId, title, description }) => {
    await requireRole(ctx, "admin");
    const issue = await ctx.db.get("issues", issueId);
    if (!issue) fail("NOT_FOUND", "We couldn't find that issue.");
    await ctx.db.patch("issues", issue._id, {
      ...(title !== undefined ? { title: title.trim() || undefined } : {}),
      ...(description !== undefined ? { description: description.trim() || undefined } : {}),
    });
  },
});

export const setPublished = mutation({
  args: { issueId: v.id("issues"), published: v.boolean() },
  handler: async (ctx, { issueId, published }) => {
    await requireRole(ctx, "admin");
    const issue = await ctx.db.get("issues", issueId);
    if (!issue) fail("NOT_FOUND", "We couldn't find that issue.");
    await ctx.db.patch("issues", issue._id, {
      status: published ? "published" : "draft",
      publishedAt: published ? (issue.publishedAt ?? Date.now()) : undefined,
    });
  },
});
