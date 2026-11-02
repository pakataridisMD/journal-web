import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { journal, submissionRules } from "../src/config/journal";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { articleCard, issueRef } from "./lib/articles";
import { authorLinks, linkAuthors } from "./lib/authorships";
import { requireRole, requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  assertStatus,
  deleteBlobIfUnused,
  loadManuscript,
  logEvent,
  nextCounter,
  requireManage,
} from "./lib/manuscripts";
import { articleSearchText, extensionOf, slugify } from "./lib/text";
import {
  abstractSectionValidator,
  articleAuthorValidator,
  articleTypeValidator,
} from "./lib/validators";

// ---------------------------------------------------------------- public

export const latest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("articles")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(Math.min(limit ?? 10, 50));
    return await Promise.all(rows.map((a) => articleCard(ctx, a)));
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("articles")
      .withIndex("by_featured", (q) => q.eq("featured", true).eq("status", "published"))
      .order("desc")
      .take(Math.min(limit ?? 3, 12));
    return await Promise.all(rows.map((a) => articleCard(ctx, a)));
  },
});

/** Newest first, optionally one article type, a page at a time. */
export const list = query({
  args: {
    articleType: v.optional(articleTypeValidator),
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, { articleType, cursor, numItems }) => {
    const opts = { cursor: cursor ?? null, numItems: Math.min(numItems ?? 20, 50) };
    const page = articleType
      ? await ctx.db
          .query("articles")
          .withIndex("by_type_published", (q) =>
            q.eq("status", "published").eq("articleType", articleType),
          )
          .order("desc")
          .paginate(opts)
      : await ctx.db
          .query("articles")
          .withIndex("by_status_published", (q) => q.eq("status", "published"))
          .order("desc")
          .paginate(opts);
    return {
      articles: await Promise.all(page.page.map((a) => articleCard(ctx, a))),
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});

export const search = query({
  args: { query: v.string(), articleType: v.optional(articleTypeValidator) },
  handler: async (ctx, { query: text, articleType }) => {
    const term = text.trim().slice(0, 200);
    if (!term) return [];
    const rows = await ctx.db
      .query("articles")
      .withSearchIndex("search_text", (q) => {
        const base = q.search("searchText", term).eq("status", "published");
        return articleType ? base.eq("articleType", articleType) : base;
      })
      .take(30);
    return await Promise.all(rows.map((a) => articleCard(ctx, a)));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!article || article.status !== "published") return null;
    const { searchText: _searchText, manuscriptId: _manuscriptId, pdfStorageId, authors, ...rest } = article;
    const links = await authorLinks(ctx, article._id);
    return {
      ...rest,
      /**
       * `profile` is the author's profile address when their profile is on the
       * website. `orcidAuthenticated` says the author proved the iD shown by
       * signing in to ORCID, rather than someone typing it in.
       */
      authors: authors.map((author, i) => {
        const link = links.get(i);
        return {
          ...author,
          profile: link?.handle ?? null,
          orcidAuthenticated: Boolean(author.orcid && link?.orcid === author.orcid),
        };
      }),
      issue: await issueRef(ctx, article.issueId),
      pdfUrl: pdfStorageId ? await ctx.storage.getUrl(pdfStorageId) : null,
    };
  },
});

/** Recent slugs, so the newest article pages are prerendered at build. */
export const recentSlugs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("articles")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(Math.min(limit ?? 50, 200));
    return rows.map((a) => a.slug);
  },
});

async function bumpMetric(ctx: MutationCtx, slug: string, field: "views" | "downloads") {
  const article = await ctx.db
    .query("articles")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!article || article.status !== "published") return;
  const metrics = await ctx.db
    .query("articleMetrics")
    .withIndex("by_article", (q) => q.eq("articleId", article._id))
    .unique();
  if (metrics) {
    await ctx.db.patch("articleMetrics", metrics._id, { [field]: metrics[field] + 1 });
  } else {
    await ctx.db.insert("articleMetrics", {
      articleId: article._id,
      views: field === "views" ? 1 : 0,
      downloads: field === "downloads" ? 1 : 0,
    });
  }
}

export const recordView = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => bumpMetric(ctx, slug, "views"),
});

export const recordDownload = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => bumpMetric(ctx, slug, "downloads"),
});

// ---------------------------------------------------------------- production

async function uniqueSlug(ctx: MutationCtx, title: string, exceptId?: Id<"articles">) {
  const base = slugify(title);
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!taken || taken._id === exceptId) return candidate;
  }
  fail("CONFLICT", "Too many articles share this title.");
}

async function nextArticleNumber(ctx: MutationCtx, now: number) {
  const year = new Date(now).getUTCFullYear();
  const n = await nextCounter(ctx, `article-${year}`);
  return `e${year}${String(n).padStart(3, "0")}`;
}

async function checkIssue(ctx: MutationCtx, issueId: Id<"issues"> | undefined) {
  if (issueId && !(await ctx.db.get("issues", issueId))) {
    fail("NOT_FOUND", "That issue no longer exists.");
  }
}

function checkProductionText(fields: { body?: string; references?: string[] }) {
  if (fields.body !== undefined && fields.body.length > 400_000) {
    fail("INVALID_INPUT", "The article text is too long.");
  }
  if (fields.references !== undefined && fields.references.length > 500) {
    fail("INVALID_INPUT", "Too many references.");
  }
}

const productionFields = {
  body: v.string(),
  references: v.array(v.string()),
  issueId: v.optional(v.id("issues")),
  featured: v.boolean(),
  doi: v.optional(v.string()),
};

/** Turn an accepted manuscript into a published article. */
export const publishFromManuscript = mutation({
  args: { manuscriptId: v.id("manuscripts"), ...productionFields },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const m = await loadManuscript(ctx, args.manuscriptId);
    requireManage(viewer, m);
    assertStatus(m, ["accepted"], "publish");
    checkProductionText(args);
    await checkIssue(ctx, args.issueId);
    if (!args.body.trim()) fail("INVALID_INPUT", "Add the article text.");

    const now = Date.now();
    const article = {
      title: m.title,
      articleType: m.articleType,
      abstractSections: m.abstractSections,
      keywords: m.keywords,
      subjects: m.subjects,
      authors: m.authors.map((a) => ({
        name: a.name,
        affiliation: a.affiliation,
        orcid: a.orcid,
        isCorresponding: a.isCorresponding,
        email: a.isCorresponding ? a.email : undefined,
      })),
    };
    const articleId = await ctx.db.insert("articles", {
      ...article,
      manuscriptId: m._id,
      slug: await uniqueSlug(ctx, m.title),
      articleNumber: await nextArticleNumber(ctx, now),
      doi: args.doi?.trim() || undefined,
      body: args.body,
      references: args.references.map((r) => r.trim()).filter(Boolean),
      issueId: args.issueId,
      status: "published",
      featured: args.featured,
      receivedAt: m.firstSubmittedAt,
      revisedAt: m.revisedAt,
      acceptedAt: m.acceptedAt,
      publishedAt: now,
      license: journal.license.name,
      funding: m.declarations.funding || undefined,
      conflicts: m.declarations.conflicts || undefined,
      dataAvailability: m.declarations.dataAvailability || undefined,
      searchText: articleSearchText(article),
    });
    await ctx.db.patch("manuscripts", m._id, {
      status: "published",
      articleId,
      updatedAt: now,
    });
    await linkAuthors(ctx, articleId, m.authors, now);
    await logEvent(ctx, m, "published", viewer._id);
    return articleId;
  },
});

/** Editors publish commissioned pieces (editorials) directly. */
export const create = mutation({
  args: {
    title: v.string(),
    articleType: articleTypeValidator,
    authors: v.array(articleAuthorValidator),
    abstractSections: v.array(abstractSectionValidator),
    keywords: v.array(v.string()),
    subjects: v.array(v.string()),
    ...productionFields,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    if (!args.title.trim()) fail("INVALID_INPUT", "Add a title.");
    if (args.authors.length === 0) fail("INVALID_INPUT", "Add at least one author.");
    checkProductionText(args);
    await checkIssue(ctx, args.issueId);
    const now = Date.now();
    const { doi, references, ...rest } = args;
    const articleId = await ctx.db.insert("articles", {
      ...rest,
      title: args.title.trim(),
      slug: await uniqueSlug(ctx, args.title),
      articleNumber: await nextArticleNumber(ctx, now),
      doi: doi?.trim() || undefined,
      references: references.map((r) => r.trim()).filter(Boolean),
      status: "published",
      publishedAt: now,
      license: journal.license.name,
      searchText: articleSearchText(args),
    });
    await linkAuthors(ctx, articleId, args.authors, now);
    return articleId;
  },
});

export const update = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.optional(v.string()),
    abstractSections: v.optional(v.array(abstractSectionValidator)),
    keywords: v.optional(v.array(v.string())),
    body: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    issueId: v.optional(v.union(v.id("issues"), v.null())),
    featured: v.optional(v.boolean()),
    doi: v.optional(v.string()),
    status: v.optional(v.union(v.literal("published"), v.literal("hidden"))),
  },
  handler: async (
    ctx,
    { articleId, issueId, title, abstractSections, keywords, references, doi, ...rest },
  ) => {
    await requireRole(ctx, "editor");
    const article = await ctx.db.get("articles", articleId);
    if (!article) fail("NOT_FOUND", "We couldn't find that article.");
    checkProductionText({ body: rest.body, references });
    if (issueId) await checkIssue(ctx, issueId);
    const patch: Partial<Doc<"articles">> = { ...rest };
    if (title !== undefined) {
      if (!title.trim()) fail("INVALID_INPUT", "The title can't be empty.");
      patch.title = title.trim();
    }
    if (abstractSections !== undefined) {
      // Corrections only: the headings stay those of the article type.
      if (
        abstractSections.length !== article.abstractSections.length ||
        abstractSections.some((s, i) => s.label !== article.abstractSections[i].label)
      ) {
        fail("INVALID_INPUT", "The abstract headings can't change.");
      }
      if (abstractSections.some((s) => s.text.length > 5_000)) {
        fail("INVALID_INPUT", "An abstract section is too long.");
      }
      patch.abstractSections = abstractSections.map((s) => ({ label: s.label, text: s.text.trim() }));
    }
    if (keywords !== undefined) {
      if (keywords.length > 12) fail("INVALID_INPUT", "Too many keywords.");
      patch.keywords = keywords.map((k) => k.trim()).filter(Boolean);
    }
    if (patch.title || patch.abstractSections || patch.keywords) {
      patch.searchText = articleSearchText({ ...article, ...patch });
    }
    if (references !== undefined) patch.references = references.map((r) => r.trim()).filter(Boolean);
    if (doi !== undefined) patch.doi = doi.trim() || undefined;
    if (issueId !== undefined) patch.issueId = issueId ?? undefined;
    await ctx.db.patch("articles", article._id, patch);
  },
});

/** Attach (or with no storageId, remove) the article's PDF. */
export const setPdf = mutation({
  args: { articleId: v.id("articles"), storageId: v.optional(v.id("_storage")), fileName: v.optional(v.string()) },
  handler: async (ctx, { articleId, storageId, fileName }) => {
    await requireRole(ctx, "editor");
    const article = await ctx.db.get("articles", articleId);
    if (!article) fail("NOT_FOUND", "We couldn't find that article.");
    if (storageId) {
      const blob = await ctx.db.system.get("_storage", storageId);
      if (!blob) fail("NOT_FOUND", "The upload didn't finish. Please try again.");
      if (extensionOf(fileName ?? "") !== "pdf") fail("INVALID_INPUT", "Upload a PDF.");
      if (blob.size > submissionRules.maxFileBytes) fail("INVALID_INPUT", "The PDF is too large.");
    }
    const previous = article.pdfStorageId;
    await ctx.db.patch("articles", article._id, { pdfStorageId: storageId });
    if (previous && previous !== storageId) await deleteBlobIfUnused(ctx, previous);
  },
});

/** Editors: every article including hidden ones, newest first. */
export const listAll = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireRole(ctx, "editor");
    const page = await ctx.db.query("articles").order("desc").paginate(paginationOpts);
    const withMetrics = await Promise.all(
      page.page.map(async (a) => {
        const metrics = await ctx.db
          .query("articleMetrics")
          .withIndex("by_article", (q) => q.eq("articleId", a._id))
          .unique();
        return {
          ...(await articleCard(ctx, a)),
          status: a.status,
          issueId: a.issueId,
          hasPdf: !!a.pdfStorageId,
          views: metrics?.views ?? 0,
          downloads: metrics?.downloads ?? 0,
        };
      }),
    );
    return { ...page, page: withMetrics };
  },
});

export const getForEdit = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, { articleId }) => {
    await requireRole(ctx, "editor");
    const article = await ctx.db.get("articles", articleId);
    if (!article) fail("NOT_FOUND", "We couldn't find that article.");
    return {
      ...article,
      pdfUrl: article.pdfStorageId ? await ctx.storage.getUrl(article.pdfStorageId) : null,
    };
  },
});
