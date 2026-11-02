"use server";

import { auth } from "@clerk/nextjs/server";
import { updateTag } from "next/cache";
import { TAGS } from "@/lib/data";

/**
 * Called by the dashboard after publishing or editing public content, so the
 * cached pages show the change on the next visit. Convex enforces who may
 * publish; this only refreshes caches, so being signed in is enough.
 */
export async function refreshPublicContent(slugs: string[] = []) {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to continue.");
  updateTag(TAGS.articles);
  updateTag(TAGS.issues);
  for (const slug of slugs.slice(0, 20)) updateTag(TAGS.article(slug));
}

/**
 * Called after someone saves their profile or the board changes, so the Who
 * we are page, the profiles and the author links on articles show it.
 */
export async function refreshPeople(handles: string[] = []) {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to continue.");
  updateTag(TAGS.people);
  updateTag(TAGS.articles);
  for (const handle of handles.slice(0, 20)) updateTag(TAGS.person(handle));
}
