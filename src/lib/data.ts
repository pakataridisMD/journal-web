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
  /** The board, reviewer list and every profile. */
  people: "people",
  person: (handle: string) => `person:${handle}`,
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

export async function getBoard() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.people);
  return await fetchQuery(api.board.publicBoard, {});
}

export async function getListedReviewers() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.people);
  return await fetchQuery(api.profiles.listedReviewers, {});
}

export async function getProfile(handle: string) {
  "use cache";
  cacheLife("hours");
  // Profiles list articles, so publishing refreshes them too.
  cacheTag(TAGS.person(handle), TAGS.people, TAGS.articles);
  return await fetchQuery(api.profiles.getByHandle, { handle });
}

export async function getProfileHandles() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.people);
  return await fetchQuery(api.profiles.publicHandles, {});
}

export type ArticleCard = Awaited<ReturnType<typeof getLatestArticles>>[number];
export type PublicArticle = NonNullable<Awaited<ReturnType<typeof getArticle>>>;
export type IssueWithContents = NonNullable<Awaited<ReturnType<typeof getIssue>>>;
export type BoardPosition = Awaited<ReturnType<typeof getBoard>>["positions"][number];
export type PersonCard = Awaited<ReturnType<typeof getListedReviewers>>[number];
export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
