import "server-only";

import { fetchQuery } from "convex/nextjs";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { ArticleTypeKey } from "@/config/journal";

/**
 * Public, cached reads for the server-rendered site. Every function is
 * tagged so publishing can refresh exactly what changed (see app/actions.ts).
 */

export const TAGS = {
  articles: "articles",
  issues: "issues",
  article: (slug: string) => `article:${slug}`,
} as const;

export async function getFeaturedArticles(limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return await fetchQuery(api.articles.featured, { limit });
}

export async function getLatestArticles(limit = 10) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return await fetchQuery(api.articles.latest, { limit });
}

export async function getArticlePage(articleType: ArticleTypeKey | undefined, cursor: string | undefined) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return await fetchQuery(api.articles.list, { articleType, cursor: cursor ?? null, numItems: 20 });
}

export async function searchArticles(query: string, articleType: ArticleTypeKey | undefined) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.articles);
  return await fetchQuery(api.articles.search, { query, articleType });
}

export async function getArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.article(slug), TAGS.articles);
  return await fetchQuery(api.articles.getBySlug, { slug });
}

export async function getRecentSlugs(limit = 200) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return await fetchQuery(api.articles.recentSlugs, { limit });
}

export async function getCurrentIssue() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.issues, TAGS.articles);
  return await fetchQuery(api.issues.current, {});
}

export async function getIssue(volume: number, number: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.issues, TAGS.articles);
  return await fetchQuery(api.issues.get, { volume, number });
}

export async function getPublishedIssues() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.issues);
  return await fetchQuery(api.issues.listPublished, {});
}

export async function getOnlineFirst(limit = 6) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.issues, TAGS.articles);
  return await fetchQuery(api.issues.onlineFirst, { limit });
}

export type ArticleCard = Awaited<ReturnType<typeof getLatestArticles>>[number];
export type PublicArticle = NonNullable<Awaited<ReturnType<typeof getArticle>>>;
export type IssueWithContents = NonNullable<Awaited<ReturnType<typeof getIssue>>>;
