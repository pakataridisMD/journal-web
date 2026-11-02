import { v } from "convex/values";
import { profileRules, subjects } from "../src/config/journal";
import { mutation, query } from "./_generated/server";
import { hasRole, requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import { suggestionsFromRecord } from "./lib/orcid";
import { handleFromName, handleProblem, LINK_KINDS, normalizeLink } from "./lib/profileFields";
import {
  ensureProfile,
  isVisible,
  orcidLinkOf,
  personCard,
  positionsOf,
  profileOf,
  PROFILE_DEFAULTS,
  publicProfile,
  uniqueHandle,
} from "./lib/profiles";
import { cleanList, isValidOrcid, userSearchText } from "./lib/text";
import { profileLinkValidator } from "./lib/validators";

// ---------------------------------------------------------------- the owner

/** The signed-in person's profile, for the profile form. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [profile, positions, link] = await Promise.all([
      profileOf(ctx, viewer._id),
      positionsOf(ctx, viewer._id),
      orcidLinkOf(ctx, viewer._id),
    ]);
    const fields = profile ?? {
      ...PROFILE_DEFAULTS,
      handle: await uniqueHandle(ctx, handleFromName(viewer.name), viewer._id),
    };
    return {
      handle: fields.handle,
      isPublic: fields.isPublic,
      credentials: fields.credentials ?? "",
      bio: fields.bio ?? "",
      expertise: fields.expertise,
      keywords: fields.keywords,
      links: fields.links,
      showPhoto: fields.showPhoto,
      showOrcidWorks: fields.showOrcidWorks,
      showMetrics: fields.showMetrics,
      listAsReviewer: fields.listAsReviewer,
      saved: profile !== null,
      /** On the website now: shown by choice or by a board appointment. */
      visible: await isVisible(ctx, profile),
      positions,
      imageUrl: viewer.imageUrl,
      orcid: link
        ? {
            id: link.orcid,
            authenticated: true as const,
            linkedAt: link.linkedAt,
            syncedAt: link.syncedAt ?? null,
            worksCount: link.record?.worksCount ?? null,
            hasMetrics: link.metrics !== undefined,
            suggestions: link.record ? suggestionsFromRecord(link.record) : null,
          }
        : viewer.orcid
          ? { id: viewer.orcid, authenticated: false as const }
          : null,
    };
  },
});

const MAX_NAME = 120;
const MAX_AFFILIATION = 300;

function cleanBio(bio: string | undefined): string | undefined {
  const text = bio
    ?.replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || undefined;
}

export const save = mutation({
  args: {
    name: v.string(),
    affiliation: v.optional(v.string()),
    credentials: v.optional(v.string()),
    /** Typed in by hand; ignored once an iD is connected through ORCID. */
    orcid: v.optional(v.string()),
    handle: v.optional(v.string()),
    isPublic: v.boolean(),
    bio: v.optional(v.string()),
    expertise: v.array(v.string()),
    keywords: v.array(v.string()),
    links: v.array(profileLinkValidator),
    showPhoto: v.boolean(),
    showOrcidWorks: v.boolean(),
    showMetrics: v.boolean(),
    listAsReviewer: v.boolean(),
  },
  returns: v.object({ handle: v.string() }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);

    const name = args.name.trim().replace(/\s+/g, " ");
    if (!name || name.length > MAX_NAME) fail("INVALID_INPUT", `Enter your name (up to ${MAX_NAME} characters).`);
    const affiliation = args.affiliation?.trim() || undefined;
    if (affiliation && affiliation.length > MAX_AFFILIATION) {
      fail("INVALID_INPUT", `Affiliation is too long (${MAX_AFFILIATION} characters at most).`);
    }
    const credentials = args.credentials?.trim().replace(/\s+/g, " ") || undefined;
    if (credentials && credentials.length > profileRules.maxCredentials) {
      fail("INVALID_INPUT", `Degrees and titles are too long (${profileRules.maxCredentials} characters at most).`);
    }
    const bio = cleanBio(args.bio);
    if (bio && bio.length > profileRules.maxBio) {
      fail("INVALID_INPUT", `Your bio is too long (${profileRules.maxBio} characters at most).`);
    }

    const known = new Set<string>(subjects);
    const expertise = Array.from(new Set(args.expertise));
    if (expertise.some((s) => !known.has(s))) fail("INVALID_INPUT", "Choose areas of expertise from the list.");
    if (expertise.length > profileRules.maxExpertise) {
      fail("INVALID_INPUT", `Choose up to ${profileRules.maxExpertise} areas of expertise.`);
    }
    const keywords = cleanList(args.keywords);
    if (keywords.length > profileRules.maxKeywords) {
      fail("INVALID_INPUT", `Add up to ${profileRules.maxKeywords} keywords.`);
    }
    if (keywords.some((k) => k.length > profileRules.maxKeywordLength)) {
      fail("INVALID_INPUT", `Keep each keyword under ${profileRules.maxKeywordLength} characters.`);
    }

    const links: { kind: (typeof args.links)[number]["kind"]; url: string }[] = [];
    for (const link of args.links) {
      if (links.some((l) => l.kind === link.kind)) {
        fail("INVALID_INPUT", `Add one ${LINK_KINDS[link.kind].label} link.`);
      }
      const result = normalizeLink(link.kind, link.url);
      if (!result.ok) fail("INVALID_INPUT", result.message);
      links.push({ kind: link.kind, url: result.url });
    }

    // An iD proved through ORCID stays until it is disconnected.
    const link = await orcidLinkOf(ctx, viewer._id);
    let orcid = link ? link.orcid : args.orcid?.trim().toUpperCase() || undefined;
    if (!link && orcid) {
      if (!isValidOrcid(orcid)) fail("INVALID_INPUT", "That ORCID iD isn't valid. It looks like 0000-0002-1825-0097.");
      const claimed = await ctx.db
        .query("orcidLinks")
        .withIndex("by_orcid", (q) => q.eq("orcid", orcid!))
        .first();
      if (claimed && claimed.userId !== viewer._id) {
        fail("CONFLICT", "That ORCID iD is connected to another account on the journal.");
      }
    }
    if (link && args.orcid && args.orcid.trim().toUpperCase() !== link.orcid) {
      fail("INVALID_INPUT", "Disconnect your ORCID record before using a different iD.");
    }
    orcid = orcid || undefined;

    const profile = await ensureProfile(ctx, { ...viewer, name });
    let handle = profile.handle;
    const wanted = args.handle?.trim().toLowerCase();
    if (wanted && wanted !== handle) {
      const problem = handleProblem(wanted);
      if (problem) fail("INVALID_INPUT", `Profile address: ${problem}`);
      if ((await uniqueHandle(ctx, wanted, viewer._id)) !== wanted) {
        fail("CONFLICT", "Someone already has that profile address. Try another.");
      }
      handle = wanted;
    }

    await ctx.db.patch("users", viewer._id, {
      name,
      affiliation,
      orcid,
      searchText: userSearchText({ name, email: viewer.email, affiliation }),
    });
    await ctx.db.patch("profiles", profile._id, {
      handle,
      isPublic: args.isPublic,
      credentials,
      bio,
      expertise,
      keywords,
      links,
      showPhoto: args.showPhoto,
      showOrcidWorks: args.showOrcidWorks,
      showMetrics: args.showMetrics,
      // Only reviewers can be listed as reviewers.
      listAsReviewer: args.listAsReviewer && hasRole(viewer, "reviewer"),
      updatedAt: Date.now(),
    });
    return { handle };
  },
});

// ---------------------------------------------------------------- public

/** A profile page, or null when there is no such profile on the website. */
export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
      .unique();
    if (!profile || !(await isVisible(ctx, profile))) return null;
    return await publicProfile(ctx, profile);
  },
});

/** Addresses of profiles on the website, for the sitemap and prerendering. */
export const publicHandles = query({
  args: {},
  handler: async (ctx) => {
    const chosen = await ctx.db
      .query("profiles")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(500);
    const handles = new Set(chosen.map((p) => p.handle));
    const positions = await ctx.db.query("boardPositions").take(200);
    for (const position of positions) {
      if (!position.userId) continue;
      const profile = await profileOf(ctx, position.userId);
      if (profile) handles.add(profile.handle);
    }
    return [...handles];
  },
});

/** Reviewers who asked to be named on the Who we are page, by name. */
export const listedReviewers = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_listed_reviewer", (q) => q.eq("listAsReviewer", true))
      .take(500);
    const people = [];
    for (const profile of profiles) {
      const user = await ctx.db.get("users", profile.userId);
      if (!user || !hasRole(user, "reviewer")) continue;
      people.push(personCard(user, profile, await isVisible(ctx, profile)));
    }
    const surname = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;
    return people.sort((a, b) => surname(a.name).localeCompare(surname(b.name)) || a.name.localeCompare(b.name));
  },
});
