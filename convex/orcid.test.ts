import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { SAMPLE_RECORD } from "./lib/orcid.fixture";
import { setup, signIn } from "./test.helpers";

const ORCID = "0000-0002-1825-0097";
const REDIRECT = "https://journal.example/dashboard/profile/orcid";

type Call = { url: string; init?: RequestInit };

/** Stand-ins for orcid.org and OpenAlex; records each request. */
function stubNetwork({ orcid = ORCID, tokenStatus = 200, openAlex = true } = {}) {
  const calls: Call[] = [];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "https://orcid.org/oauth/token") {
      return tokenStatus === 200
        ? json(200, { access_token: "token-123", token_type: "bearer", scope: "/authenticate", name: "Ana Ruiz", orcid })
        : json(tokenStatus, { error: "invalid_grant" });
    }
    if (url === `https://pub.orcid.org/v3.0/${orcid}/record`) return json(200, SAMPLE_RECORD);
    if (url.startsWith("https://api.openalex.org/authors/")) {
      return openAlex
        ? json(200, { id: "https://openalex.org/A1", works_count: 42, cited_by_count: 1234, summary_stats: { h_index: 15 } })
        : json(404, { error: "not found" });
    }
    return json(404, {});
  });
  return calls;
}

beforeEach(() => {
  vi.stubEnv("ORCID_CLIENT_ID", "APP-TEST");
  vi.stubEnv("ORCID_CLIENT_SECRET", "secret-xyz");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("orcid.config", () => {
  test("is off until the credentials are set", async () => {
    const t = setup();
    expect(await t.query(api.orcid.config, {})).toMatchObject({
      enabled: true,
      clientId: "APP-TEST",
      authorizeUrl: "https://orcid.org/oauth/authorize",
    });
    vi.stubEnv("ORCID_SANDBOX", "true");
    expect(await t.query(api.orcid.config, {})).toMatchObject({ authorizeUrl: "https://sandbox.orcid.org/oauth/authorize" });
    vi.stubEnv("ORCID_CLIENT_SECRET", "");
    expect(await t.query(api.orcid.config, {})).toEqual({ enabled: false });
    // The secret never leaves the server.
    vi.stubEnv("ORCID_CLIENT_SECRET", "secret-xyz");
    expect(JSON.stringify(await t.query(api.orcid.config, {}))).not.toContain("secret-xyz");
  });
});

describe("orcid.connect", () => {
  test("proves the iD with ORCID and stores the public record", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana Ruiz" });
    const calls = stubNetwork();
    expect(await ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT })).toEqual({ orcid: ORCID });

    const exchange = calls.find((c) => c.url.endsWith("/oauth/token"))!;
    const form = new URLSearchParams(String(exchange.init?.body));
    expect(Object.fromEntries(form)).toEqual({
      client_id: "APP-TEST",
      client_secret: "secret-xyz",
      grant_type: "authorization_code",
      code: "Ab12Cd",
      redirect_uri: REDIRECT,
    });
    const read = calls.find((c) => c.url.includes("/record"))!;
    expect(new Headers(read.init?.headers).get("Authorization")).toBe("Bearer token-123");

    const mine = await ana.as.query(api.profiles.mine, {});
    expect(mine.orcid).toMatchObject({ id: ORCID, authenticated: true, worksCount: 3, hasMetrics: true });
    expect(mine.orcid && "suggestions" in mine.orcid ? mine.orcid.suggestions?.keywords : null).toEqual(["frailty", "falls"]);
    expect((await ana.as.query(api.users.me, {}))?.orcid).toBe(ORCID);
    // The access token is never sent to a browser.
    expect(JSON.stringify(mine)).not.toContain("token-123");

    // Shown on the public profile as authenticated, with works when the person allows.
    const { handle } = await ana.as.mutation(api.profiles.save, {
      name: "Ana Ruiz",
      isPublic: true,
      expertise: [],
      keywords: [],
      links: [],
      showPhoto: false,
      showOrcidWorks: true,
      showMetrics: true,
      listAsReviewer: false,
    });
    const profile = await t.query(api.profiles.getByHandle, { handle });
    expect(profile?.orcid).toEqual({ id: ORCID, authenticated: true });
    expect(profile?.orcidRecord?.works[0].title).toBe("Frailty screening in primary care");
    expect(profile?.metrics).toMatchObject({ citedByCount: 1234, hIndex: 15 });
    expect(JSON.stringify(profile)).not.toContain("token-123");
  });

  test("works without OpenAlex", async () => {
    const t = setup();
    const ana = await signIn(t);
    stubNetwork({ openAlex: false });
    await ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT });
    expect((await ana.as.query(api.profiles.mine, {})).orcid).toMatchObject({ authenticated: true, hasMetrics: false });
  });

  test("an iD belongs to one account, and beats the same iD typed in elsewhere", async () => {
    const t = setup();
    const typist = await signIn(t);
    await typist.as.mutation(api.profiles.save, {
      name: typist.name,
      orcid: ORCID,
      isPublic: false,
      expertise: [],
      keywords: [],
      links: [],
      showPhoto: false,
      showOrcidWorks: true,
      showMetrics: false,
      listAsReviewer: false,
    });
    const owner = await signIn(t);
    const other = await signIn(t);
    stubNetwork();

    await owner.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT });
    expect((await typist.as.query(api.users.me, {}))?.orcid).toBeUndefined();
    await expect(other.as.action(api.orcid.connect, { code: "Zz99", redirectUri: REDIRECT })).rejects.toThrow(
      /another account/,
    );
    await expect(
      typist.as.mutation(api.profiles.save, {
        name: typist.name,
        orcid: ORCID,
        isPublic: false,
        expertise: [],
        keywords: [],
        links: [],
        showPhoto: false,
        showOrcidWorks: true,
        showMetrics: false,
        listAsReviewer: false,
      }),
    ).rejects.toThrow(/another account/);
  });

  test("refuses codes ORCID rejects, strange return addresses and signed-out callers", async () => {
    const t = setup();
    const ana = await signIn(t);
    stubNetwork({ tokenStatus: 400 });
    await expect(ana.as.action(api.orcid.connect, { code: "used", redirectUri: REDIRECT })).rejects.toThrow(
      /didn't accept/,
    );
    for (const redirectUri of [
      "https://journal.example/elsewhere",
      "http://journal.example/dashboard/profile/orcid",
      "https://journal.example/dashboard/profile/orcid?next=evil",
      "not a url",
    ]) {
      await expect(ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri }), redirectUri).rejects.toThrow(
        /isn't valid/,
      );
    }
    await expect(t.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT })).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
    vi.stubEnv("ORCID_CLIENT_ID", "");
    await expect(ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT })).rejects.toThrow(
      /isn't set up/,
    );
  });

  test("disconnecting removes the iD", async () => {
    const t = setup();
    const ana = await signIn(t);
    stubNetwork();
    await ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT });
    await ana.as.mutation(api.orcid.disconnect, {});
    expect((await ana.as.query(api.profiles.mine, {})).orcid).toBeNull();
    expect((await ana.as.query(api.users.me, {}))?.orcid).toBeUndefined();
  });

  test("refresh reads the record again, at most once a minute", async () => {
    const t = setup();
    const ana = await signIn(t);
    const calls = stubNetwork();
    await ana.as.action(api.orcid.connect, { code: "Ab12Cd", redirectUri: REDIRECT });
    const reads = () => calls.filter((c) => c.url.includes("/record")).length;
    expect(reads()).toBe(1);
    await ana.as.action(api.orcid.refresh, {});
    expect(reads()).toBe(1);

    await t.run(async (ctx) => {
      const link = await ctx.db.query("orcidLinks").first();
      await ctx.db.patch("orcidLinks", link!._id, { syncedAt: Date.now() - 120_000 });
    });
    await ana.as.action(api.orcid.refresh, {});
    expect(reads()).toBe(2);
  });
});
