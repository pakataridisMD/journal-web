import { boardGroupOrder, profileRules } from "../../src/config/journal";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { articleCard } from "./articles";
import { hasRole } from "./auth";
import { handleFromName } from "./profileFields";

type Ctx = QueryCtx | MutationCtx;
export type Profile = Doc<"profiles">;

/** What a profile holds before the person has saved one. */
export const PROFILE_DEFAULTS = {
  isPublic: false,
  credentials: undefined,
  bio: undefined,
  expertise: [] as string[],
  keywords: [] as string[],
  links: [] as Profile["links"],
  showPhoto: false,
  showOrcidWorks: true,
  showMetrics: false,
  listAsReviewer: false,
};

export async function profileOf(ctx: Ctx, userId: Id<"users">): Promise<Profile | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function orcidLinkOf(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("orcidLinks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Board positions a person holds, in page order. */
export async function positionsOf(ctx: Ctx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("boardPositions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(10);
  return rows
    .sort((a, b) => boardGroupOrder.indexOf(a.group) - boardGroupOrder.indexOf(b.group) || a.order - b.order)
    .map((p) => ({ group: p.group, title: p.title, subject: p.subject }));
}

/**
 * A profile is on the website when its owner chose to show it, or when they
 * sit on the editorial board, which is public by appointment.
 */
export async function isVisible(ctx: Ctx, profile: Profile | null): Promise<boolean> {
  if (!profile) return false;
  if (profile.isPublic) return true;
  const position = await ctx.db
    .query("boardPositions")
    .withIndex("by_user", (q) => q.eq("userId", profile.userId))
    .first();
  return position !== null;
}

/** The person's profile address, if their profile is on the website. */
export async function visibleHandle(ctx: Ctx, userId: Id<"users">): Promise<string | null> {
  const profile = await profileOf(ctx, userId);
  return (await isVisible(ctx, profile)) ? profile!.handle : null;
}

/** `base`, or `base-2`, `base-3`… whichever no one else has. */
export async function uniqueHandle(ctx: Ctx, base: string, userId?: Id<"users">): Promise<string> {
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_handle", (q) => q.eq("handle", candidate))
      .unique();
    if (!taken || taken.userId === userId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** The person's profile, made with the defaults if they have none yet. */
export async function ensureProfile(ctx: MutationCtx, user: Doc<"users">): Promise<Profile> {
  const existing = await profileOf(ctx, user._id);
  if (existing) return existing;
  const handle = await uniqueHandle(ctx, handleFromName(user.name), user._id);
  const id = await ctx.db.insert("profiles", {
    ...PROFILE_DEFAULTS,
    userId: user._id,
    handle,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get("profiles", id))!;
}

/** Name, title and affiliation for lists of people (board, reviewers). */
export function personCard(user: Doc<"users">, profile: Profile | null, linked: boolean) {
  return {
    userId: user._id,
    handle: linked && profile ? profile.handle : null,
    name: user.name,
    credentials: profile?.credentials,
    affiliation: user.affiliation,
    imageUrl: profile?.showPhoto ? user.imageUrl : undefined,
    expertise: profile?.expertise ?? [],
  };
}

/** Everything a public profile page shows. Never includes email addresses. */
export async function publicProfile(ctx: QueryCtx, profile: Profile) {
  const user = await ctx.db.get("users", profile.userId);
  if (!user) return null;
  const [positions, link, authorships] = await Promise.all([
    positionsOf(ctx, user._id),
    orcidLinkOf(ctx, user._id),
    ctx.db
      .query("authorships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50),
  ]);

  const articles = [];
  for (const authorship of authorships) {
    const article = await ctx.db.get("articles", authorship.articleId);
    if (article && article.status === "published") articles.push(await articleCard(ctx, article));
  }

  const record = link?.record;
  const orcid = link
    ? { id: link.orcid, authenticated: true }
    : user.orcid
      ? { id: user.orcid, authenticated: false }
      : null;

  return {
    handle: profile.handle,
    name: user.name,
    credentials: profile.credentials,
    affiliation: user.affiliation,
    imageUrl: profile.showPhoto ? user.imageUrl : undefined,
    bio: profile.bio,
    expertise: profile.expertise,
    keywords: profile.keywords,
    links: profile.links,
    orcid,
    positions,
    isReviewer: profile.listAsReviewer && hasRole(user, "reviewer"),
    articles,
    orcidRecord:
      profile.showOrcidWorks && record && link?.syncedAt
        ? {
            works: record.works.slice(0, profileRules.maxWorksShown),
            worksCount: record.worksCount,
            employments: record.employments.slice(0, 6),
            educations: record.educations.slice(0, 4),
            syncedAt: link.syncedAt,
          }
        : null,
    metrics:
      profile.showMetrics && link?.metrics && link.metricsSyncedAt
        ? { ...link.metrics, syncedAt: link.metricsSyncedAt }
        : null,
    updatedAt: profile.updatedAt,
  };
}
