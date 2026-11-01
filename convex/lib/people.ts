import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";
import { isValidEmail, normalizeEmail, userSearchText } from "./text";
import type { Role } from "./validators";

const ROLE_ORDER: Role[] = ["author", "reviewer", "editor", "admin"];

/** Roles plus the fields derived from them, ready to write to a user row. */
export function rolesFields(roles: readonly Role[]) {
  const unique = ROLE_ORDER.filter((r) => roles.includes(r));
  return {
    roles: unique,
    isEditor: unique.includes("editor") || unique.includes("admin"),
  };
}

export function withRoles(current: readonly Role[], add: readonly Role[]) {
  return rolesFields([...current, ...add]);
}

export async function findByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
    .unique();
}

/**
 * Find a person by email or create a placeholder row they claim when they
 * first sign in with that (verified) email. Adds the role either way.
 */
export async function findOrCreatePerson(
  ctx: MutationCtx,
  person: { email: string; name: string; affiliation?: string },
  role: Role,
): Promise<Id<"users">> {
  const email = normalizeEmail(person.email);
  if (!isValidEmail(email)) fail("INVALID_INPUT", "Enter a valid email address.");
  const name = person.name.trim();
  if (!name) fail("INVALID_INPUT", "Enter the person's name.");
  const affiliation = person.affiliation?.trim() || undefined;

  const existing = await findByEmail(ctx, email);
  if (existing) {
    const affiliationPatch =
      !existing.affiliation && affiliation ? { affiliation } : {};
    const merged = { ...existing, ...affiliationPatch };
    await ctx.db.patch("users", existing._id, {
      ...withRoles(existing.roles, [role]),
      ...affiliationPatch,
      searchText: userSearchText(merged),
    });
    return existing._id;
  }
  return await ctx.db.insert("users", {
    email,
    name,
    affiliation,
    ...rolesFields([role]),
    searchText: userSearchText({ name, email, affiliation }),
  });
}

/** Public shape of a person for editor-facing lists. */
export function personSummary(user: Doc<"users">) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    affiliation: user.affiliation,
    roles: user.roles,
    hasAccount: user.tokenIdentifier !== undefined,
  };
}
