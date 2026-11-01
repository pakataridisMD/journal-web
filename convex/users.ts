import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { adminEmails, getViewer, hasRole, requireRole, requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  findByEmail,
  findOrCreatePerson,
  personSummary,
  rolesFields,
  withRoles,
} from "./lib/people";
import { isValidOrcid, normalizeEmail, userSearchText } from "./lib/text";
import { roleValidator } from "./lib/validators";

/**
 * Link the signed-in Clerk identity to a users row. The app calls this once
 * per session, before anything else. Safe to call repeatedly.
 */
export const ensure = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");
    if (!identity.email) {
      fail(
        "SETUP_REQUIRED",
        "Your sign-in token doesn't include an email address. Add the email claim to the Clerk session token (README → Connect Clerk).",
      );
    }
    // Invited people are matched by email, so an unverified address must
    // never link to an account. A missing claim is a setup problem.
    if (identity.emailVerified === undefined) {
      fail(
        "SETUP_REQUIRED",
        "Your sign-in token doesn't say whether your email is verified. Add the email_verified claim to the Clerk session token (README → Connect Clerk).",
      );
    }
    if (identity.emailVerified !== true) {
      fail("FORBIDDEN", "Please verify your email address, then sign in again.");
    }

    const email = normalizeEmail(identity.email);
    const tokenName =
      identity.name?.trim() ||
      [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim();
    const imageUrl = identity.pictureUrl || undefined;
    const extraRoles = adminEmails().has(email)
      ? (["author", "editor", "admin"] as const)
      : (["author"] as const);

    const linked = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (linked) {
      const patch: Partial<typeof linked> = {};
      if (linked.email !== email && !(await findByEmail(ctx, email))) {
        patch.email = email;
        patch.searchText = userSearchText({ ...linked, email });
      }
      if (imageUrl !== linked.imageUrl) patch.imageUrl = imageUrl;
      if (extraRoles.some((r) => !linked.roles.includes(r))) {
        Object.assign(patch, withRoles(linked.roles, extraRoles));
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch("users", linked._id, patch);
      }
      return linked._id;
    }

    // A row with this email exists when an editor invited the person before
    // they had an account. The email is verified, so the row is theirs.
    const placeholder = await findByEmail(ctx, email);
    if (placeholder) {
      const name = tokenName || placeholder.name;
      await ctx.db.patch("users", placeholder._id, {
        tokenIdentifier: identity.tokenIdentifier,
        name,
        imageUrl,
        ...withRoles(placeholder.roles, extraRoles),
        searchText: userSearchText({ ...placeholder, name }),
      });
      return placeholder._id;
    }

    const name = tokenName || email.split("@")[0];
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name,
      imageUrl,
      ...rolesFields(extraRoles),
      searchText: userSearchText({ name, email }),
    });
  },
});

/** The signed-in person, or null when signed out or not yet synced. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;
    return {
      _id: viewer._id,
      email: viewer.email,
      name: viewer.name,
      affiliation: viewer.affiliation,
      orcid: viewer.orcid,
      imageUrl: viewer.imageUrl,
      roles: viewer.roles,
      isEditor: hasRole(viewer, "editor"),
      isAdmin: hasRole(viewer, "admin"),
      isReviewer: hasRole(viewer, "reviewer"),
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    affiliation: v.optional(v.string()),
    orcid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (!name || name.length > 120) {
      fail("INVALID_INPUT", "Enter your name (up to 120 characters).");
    }
    const affiliation = args.affiliation?.trim() || undefined;
    if (affiliation && affiliation.length > 300) {
      fail("INVALID_INPUT", "Affiliation is too long (300 characters at most).");
    }
    const orcid = args.orcid?.trim().toUpperCase() || undefined;
    if (orcid && !isValidOrcid(orcid)) {
      fail("INVALID_INPUT", "That ORCID iD isn't valid. It looks like 0000-0002-1825-0097.");
    }
    await ctx.db.patch("users", viewer._id, {
      name,
      affiliation,
      orcid,
      searchText: userSearchText({ name, email: viewer.email, affiliation }),
    });
  },
});

/** Editors add reviewers by email; only admins add editors or admins. */
export const addPerson = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    affiliation: v.optional(v.string()),
    role: roleValidator,
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const needed = args.role === "editor" || args.role === "admin" ? "admin" : "editor";
    await requireRole(ctx, needed);
    return await findOrCreatePerson(ctx, args, args.role);
  },
});

export const setRoles = mutation({
  args: { userId: v.id("users"), roles: v.array(roleValidator) },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const user = await ctx.db.get("users", args.userId);
    if (!user) fail("NOT_FOUND", "That person no longer exists.");
    if (user._id === admin._id && !args.roles.includes("admin")) {
      fail("INVALID_INPUT", "You can't remove your own admin role.");
    }
    // Everyone can submit, so author is always kept.
    await ctx.db.patch("users", user._id, rolesFields(["author", ...args.roles]));
  },
});

/** People search for editors choosing reviewers or handling editors. */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const term = args.query.trim();
    if (term.length < 2) return [];
    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_people", (q) => q.search("searchText", term))
      .take(20);
    return results.map(personSummary);
  },
});

/** Everyone who can handle manuscripts. */
export const editors = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const rows = await ctx.db
      .query("users")
      .withIndex("by_is_editor", (q) => q.eq("isEditor", true))
      .take(200);
    return rows.map(personSummary);
  },
});

/** Admin: everyone, newest first. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const page = await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
    return { ...page, page: page.page.map(personSummary) };
  },
});
