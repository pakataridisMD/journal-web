import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";
import type { Role } from "./validators";

export type Viewer = Doc<"users">;

/** The signed-in person's row, or null when signed out or not yet synced. */
export async function getViewer(ctx: QueryCtx | MutationCtx): Promise<Viewer | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function requireViewer(ctx: QueryCtx | MutationCtx): Promise<Viewer> {
  const viewer = await getViewer(ctx);
  if (!viewer) fail("UNAUTHENTICATED", "Sign in to continue.");
  return viewer;
}

/** Admins (editors-in-chief) can do everything editors can. */
export function hasRole(user: Pick<Viewer, "roles">, role: Role): boolean {
  if (user.roles.includes(role)) return true;
  return role === "editor" && user.roles.includes("admin");
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: Role,
): Promise<Viewer> {
  const viewer = await requireViewer(ctx);
  if (!hasRole(viewer, role)) {
    fail("FORBIDDEN", "You don't have permission to do that.");
  }
  return viewer;
}

/** Emails listed in JOURNAL_ADMIN_EMAILS become admins when they sign in. */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.JOURNAL_ADMIN_EMAILS ?? "")
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
