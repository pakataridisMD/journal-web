import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireViewer } from "./lib/auth";
import { fail } from "./lib/errors";
import { orcidHosts, parseOpenAlexAuthor, parseOrcidRecord, tokenOrcid } from "./lib/orcid";
import { orcidLinkOf } from "./lib/profiles";
import { orcidRecordValidator, researchMetricsValidator, type OrcidRecord, type ResearchMetrics } from "./lib/validators";

/**
 * Connecting an ORCID iD. The person signs in at ORCID, which sends them back
 * to /dashboard/profile/orcid with a one-time code. `connect` trades the code
 * for the iD it was issued for, so the iD is proved rather than typed, then
 * reads the public record.
 *
 * Needs ORCID Public API credentials (free; ORCID → Developer tools) in the
 * Convex environment: ORCID_CLIENT_ID and ORCID_CLIENT_SECRET, plus
 * ORCID_SANDBOX=true to use sandbox.orcid.org while testing. OPENALEX_API_KEY
 * (free, optional) adds citation counts from OpenAlex.
 */

function settings() {
  const clientId = process.env.ORCID_CLIENT_ID?.trim();
  const clientSecret = process.env.ORCID_CLIENT_SECRET?.trim();
  const sandbox = process.env.ORCID_SANDBOX?.trim().toLowerCase() === "true";
  return { clientId, clientSecret, sandbox, hosts: orcidHosts(sandbox) };
}

/** Whether ORCID is set up, and where the Connect button sends people. */
export const config = query({
  args: {},
  handler: async () => {
    const s = settings();
    if (!s.clientId || !s.clientSecret) return { enabled: false as const };
    return {
      enabled: true as const,
      clientId: s.clientId,
      authorizeUrl: `${s.hosts.site}/oauth/authorize`,
      sandbox: s.sandbox,
    };
  },
});

const TIMEOUT_MS = 10_000;

async function fetchJson(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** The public record and, when OpenAlex knows the person, their citation counts. */
async function publicData(orcid: string, accessToken: string) {
  const { hosts } = settings();
  let record: OrcidRecord | undefined;
  try {
    const res = await fetchJson(`${hosts.api}/v3.0/${orcid}/record`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 200) record = parseOrcidRecord(res.body);
    else console.error(`ORCID record read for ${orcid} returned ${res.status}`);
  } catch (error) {
    console.error(`ORCID record read for ${orcid} failed`, error);
  }

  let metrics: ResearchMetrics | undefined;
  try {
    const key = process.env.OPENALEX_API_KEY?.trim();
    const url = new URL(`https://api.openalex.org/authors/orcid:${orcid}`);
    if (key) url.searchParams.set("api_key", key);
    const res = await fetchJson(url.toString(), { headers: { Accept: "application/json" } });
    if (res.status === 200) metrics = parseOpenAlexAuthor(res.body) ?? undefined;
    else if (res.status !== 404) console.warn(`OpenAlex lookup for ${orcid} returned ${res.status}`);
  } catch (error) {
    console.warn(`OpenAlex lookup for ${orcid} failed`, error);
  }
  return { record, metrics };
}

/** Only our own callback page may receive codes. */
function checkRedirectUri(redirectUri: string) {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    fail("INVALID_INPUT", "That sign-in link isn't valid.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !local) || url.pathname !== "/dashboard/profile/orcid" || url.search || url.hash) {
    fail("INVALID_INPUT", "That sign-in link isn't valid.");
  }
}

export const connect = action({
  args: { code: v.string(), redirectUri: v.string() },
  returns: v.object({ orcid: v.string() }),
  handler: async (ctx, { code, redirectUri }): Promise<{ orcid: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");
    const s = settings();
    if (!s.clientId || !s.clientSecret) {
      fail("SETUP_REQUIRED", "ORCID isn't set up for this journal yet. Ask the editorial office.");
    }
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(code)) fail("INVALID_INPUT", "That sign-in link isn't valid.");
    checkRedirectUri(redirectUri);
    const userId: Id<"users"> | null = await ctx.runQuery(internal.orcid.userByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!userId) fail("UNAUTHENTICATED", "Sign in to continue.");

    let token;
    try {
      token = await fetchJson(`${s.hosts.site}/oauth/token`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: s.clientId,
          client_secret: s.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });
    } catch (error) {
      console.error("ORCID token exchange failed", error);
      fail("INVALID_STATE", "ORCID didn't answer. Please try again in a few minutes.");
    }
    const orcid = token.status === 200 ? tokenOrcid(token.body) : null;
    const accessToken = (token.body as { access_token?: unknown } | null)?.access_token;
    if (!orcid || typeof accessToken !== "string") {
      const reason = (token.body as { error?: unknown } | null)?.error;
      console.error(`ORCID token exchange returned ${token.status}${typeof reason === "string" ? ` (${reason})` : ""}`);
      fail("INVALID_INPUT", "ORCID didn't accept that sign-in. It may have expired; please connect again.");
    }

    const { record, metrics } = await publicData(orcid, accessToken);
    await ctx.runMutation(internal.orcid.store, {
      tokenIdentifier: identity.tokenIdentifier,
      orcid,
      accessToken,
      record,
      metrics,
    });
    return { orcid };
  },
});

/** Read the public record again, e.g. after adding works on orcid.org. */
export const refresh = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");
    const link: { orcid: string; accessToken: string; syncedAt?: number } | null = await ctx.runQuery(
      internal.orcid.linkByToken,
      { tokenIdentifier: identity.tokenIdentifier },
    );
    if (!link) fail("NOT_FOUND", "Connect your ORCID iD first.");
    if (link.syncedAt && Date.now() - link.syncedAt < 60_000) return;
    const { record, metrics } = await publicData(link.orcid, link.accessToken);
    if (!record) fail("INVALID_STATE", "ORCID didn't answer. Please try again in a few minutes.");
    await ctx.runMutation(internal.orcid.saveSync, {
      tokenIdentifier: identity.tokenIdentifier,
      orcid: link.orcid,
      record,
      metrics,
    });
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const link = await orcidLinkOf(ctx, viewer._id);
    if (!link) return;
    await ctx.db.delete("orcidLinks", link._id);
    if (viewer.orcid === link.orcid) await ctx.db.patch("users", viewer._id, { orcid: undefined });
  },
});

// ---------------------------------------------------------------- internal

async function userByTokenIdentifier(ctx: QueryCtx | MutationCtx, tokenIdentifier: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

export const userByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => (await userByTokenIdentifier(ctx, tokenIdentifier))?._id ?? null,
});

export const linkByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    const user = await userByTokenIdentifier(ctx, tokenIdentifier);
    const link = user ? await orcidLinkOf(ctx, user._id) : null;
    return link ? { orcid: link.orcid, accessToken: link.accessToken, syncedAt: link.syncedAt } : null;
  },
});

export const store = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    orcid: v.string(),
    accessToken: v.string(),
    record: v.optional(orcidRecordValidator),
    metrics: v.optional(researchMetricsValidator),
  },
  handler: async (ctx, { tokenIdentifier, orcid, accessToken, record, metrics }) => {
    const user = await userByTokenIdentifier(ctx, tokenIdentifier);
    if (!user) fail("UNAUTHENTICATED", "Sign in to continue.");
    const claimed = await ctx.db
      .query("orcidLinks")
      .withIndex("by_orcid", (q) => q.eq("orcid", orcid))
      .first();
    if (claimed && claimed.userId !== user._id) {
      fail("CONFLICT", "That ORCID iD is already connected to another account on the journal.");
    }

    // Anyone else who typed this iD in by hand hadn't proved it; it isn't theirs.
    const typed = await ctx.db
      .query("users")
      .withIndex("by_orcid", (q) => q.eq("orcid", orcid))
      .take(20);
    for (const other of typed) {
      if (other._id !== user._id) await ctx.db.patch("users", other._id, { orcid: undefined });
    }

    const now = Date.now();
    const existing = await orcidLinkOf(ctx, user._id);
    const fields = {
      orcid,
      accessToken,
      record,
      syncedAt: record ? now : undefined,
      metrics,
      metricsSyncedAt: metrics ? now : undefined,
    };
    if (existing) await ctx.db.patch("orcidLinks", existing._id, { ...fields, linkedAt: now });
    else await ctx.db.insert("orcidLinks", { userId: user._id, linkedAt: now, ...fields });
    await ctx.db.patch("users", user._id, { orcid });
  },
});

export const saveSync = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    orcid: v.string(),
    record: orcidRecordValidator,
    metrics: v.optional(researchMetricsValidator),
  },
  handler: async (ctx, { tokenIdentifier, orcid, record, metrics }) => {
    const user = await userByTokenIdentifier(ctx, tokenIdentifier);
    const link = user ? await orcidLinkOf(ctx, user._id) : null;
    // Disconnected or reconnected to another iD while we were reading.
    if (!link || link.orcid !== orcid) return;
    const now = Date.now();
    await ctx.db.patch("orcidLinks", link._id, {
      record,
      syncedAt: now,
      ...(metrics ? { metrics, metricsSyncedAt: now } : {}),
    });
  },
});
