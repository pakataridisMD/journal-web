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
