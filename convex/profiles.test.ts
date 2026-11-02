import type { FunctionArgs } from "convex/server";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup, signIn, submitted, type T } from "./test.helpers";

type SaveArgs = FunctionArgs<typeof api.profiles.save>;

const BASE: Omit<SaveArgs, "name"> = {
  isPublic: false,
  expertise: [],
  keywords: [],
  links: [],
  showPhoto: false,
  showOrcidWorks: true,
  showMetrics: false,
  listAsReviewer: false,
};

type Person = Awaited<ReturnType<typeof signIn>>;

async function saveProfile(person: Person, fields: Partial<SaveArgs> = {}) {
  return await person.as.mutation(api.profiles.save, { name: person.name, ...BASE, ...fields });
}

describe("profiles.save", () => {
  test("saves the profile and the name, affiliation and typed ORCID iD", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana Ruiz" });
    const { handle } = await saveProfile(ana, {
      name: "Dr Ana Ruiz",
      affiliation: "Hospital General",
      credentials: "MD, PhD",
      orcid: "0000-0002-1825-0097",
      isPublic: true,
      bio: "Geriatrician.\r\n\r\n\r\n\r\nInterested in falls.",
      expertise: ["Geriatrics", "Geriatrics", "General practice"],
      keywords: [" falls ", "Falls", "frailty"],
      links: [
        { kind: "linkedin", url: "linkedin.com/in/ana-ruiz" },
        { kind: "google_scholar", url: "AbCdEfGhIjKl" },
      ],
    });
    expect(handle).toBe("dr-ana-ruiz");

    expect(await ana.as.query(api.users.me, {})).toMatchObject({
      name: "Dr Ana Ruiz",
      affiliation: "Hospital General",
      orcid: "0000-0002-1825-0097",
    });
    const mine = await ana.as.query(api.profiles.mine, {});
    expect(mine).toMatchObject({
      handle: "dr-ana-ruiz",
      saved: true,
      visible: true,
      credentials: "MD, PhD",
      bio: "Geriatrician.\n\nInterested in falls.",
      expertise: ["Geriatrics", "General practice"],
      keywords: ["falls", "frailty"],
      links: [
        { kind: "linkedin", url: "https://www.linkedin.com/in/ana-ruiz" },
        { kind: "google_scholar", url: "https://scholar.google.com/citations?user=AbCdEfGhIjKl" },
      ],
      orcid: { id: "0000-0002-1825-0097", authenticated: false },
    });
  });

  test("suggests an address before the first save, and keeps it unique", async () => {
    const t = setup();
    const first = await signIn(t, { name: "Sam Lee" });
    const second = await signIn(t, { name: "Sam Lee" });
    expect((await first.as.query(api.profiles.mine, {})).saved).toBe(false);
    expect((await saveProfile(first)).handle).toBe("sam-lee");
    expect((await second.as.query(api.profiles.mine, {})).handle).toBe("sam-lee-2");
    expect((await saveProfile(second)).handle).toBe("sam-lee-2");
    // Renaming doesn't move the address.
    expect((await saveProfile(first, { name: "Samuel Lee" })).handle).toBe("sam-lee");
  });

  test("lets people choose an address that is free and well formed", async () => {
    const t = setup();
    const ana = await signIn(t, { name: "Ana Ruiz" });
    const bea = await signIn(t, { name: "Bea Ruiz" });
    await saveProfile(ana);
    expect((await saveProfile(bea, { handle: "Dr-Bea" })).handle).toBe("dr-bea");
    await expect(saveProfile(bea, { handle: "ana-ruiz" })).rejects.toThrow(/already has that profile address/);
    await expect(saveProfile(bea, { handle: "no spaces" })).rejects.toThrow(/Profile address/);
  });

  test("checks every field", async () => {
    const t = setup();
    const ana = await signIn(t);
    for (const [fields, message] of [
      [{ name: " " }, /Enter your name/],
      [{ orcid: "0000-0002-1825-0098" }, /ORCID iD isn't valid/],
      [{ bio: "x".repeat(1501) }, /bio is too long/],
      [{ credentials: "x".repeat(81) }, /too long/],
      [{ expertise: ["Astrology"] }, /from the list/],
      [{ expertise: ["Cardiology", "Dermatology", "Geriatrics", "Hematology", "Neurology", "Oncology"] }, /up to 5/],
      [{ keywords: Array.from({ length: 11 }, (_, i) => `k${i}`) }, /up to 10/],
      [{ links: [{ kind: "linkedin", url: "https://evil.example/in/ana" }] }, /LinkedIn/],
      [{ links: [{ kind: "website", url: "javascript:alert(1)" }] }, /Website/],
      [
        {
          links: [
            { kind: "website", url: "https://a.example" },
            { kind: "website", url: "https://b.example" },
          ],
        },
        /one Website link/,
      ],
    ] as const) {
      await expect(saveProfile(ana, fields as Partial<SaveArgs>), JSON.stringify(fields)).rejects.toThrow(message);
    }
  });

  test("only reviewers can be listed as reviewers", async () => {
    const t = setup();
    const author = await signIn(t);
    const reviewer = await signIn(t, { roles: ["reviewer"] });
    await saveProfile(author, { listAsReviewer: true });
    await saveProfile(reviewer, { listAsReviewer: true });
    expect((await author.as.query(api.profiles.mine, {})).listAsReviewer).toBe(false);
    expect((await reviewer.as.query(api.profiles.mine, {})).listAsReviewer).toBe(true);

    const listed = await t.query(api.profiles.listedReviewers, {});
    expect(listed.map((p) => p.name)).toEqual([reviewer.name]);
    // Listed, but the profile itself stays private.
    expect(listed[0].handle).toBeNull();
  });

  test("requires sign-in", async () => {
    const t = setup();
    await expect(t.query(api.profiles.mine, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });
});

describe("public profiles", () => {
  async function publicPerson(t: T) {
    const ana = await signIn(t, { name: "Ana Ruiz", email: "ana@example.test" });
    const { handle } = await saveProfile(ana, {
      isPublic: true,
      bio: "Geriatrician.",
      showPhoto: false,
      affiliation: "Hospital General",
    });
    return { ana, handle };
  }

  test("show what the person chose, and never their email", async () => {
    const t = setup();
    const { handle } = await publicPerson(t);
    const profile = await t.query(api.profiles.getByHandle, { handle: handle.toUpperCase() });
    expect(profile).toMatchObject({ handle, name: "Ana Ruiz", bio: "Geriatrician.", affiliation: "Hospital General" });
    expect(JSON.stringify(profile)).not.toContain("ana@example.test");
    expect(profile?.imageUrl).toBeUndefined();
    expect(await t.query(api.profiles.publicHandles, {})).toEqual([handle]);
  });

  test("are hidden until the person makes them public", async () => {
    const t = setup();
    const { ana, handle } = await publicPerson(t);
    await saveProfile(ana, { isPublic: false });
    expect(await t.query(api.profiles.getByHandle, { handle })).toBeNull();
    expect(await t.query(api.profiles.publicHandles, {})).toEqual([]);
    expect(await t.query(api.profiles.getByHandle, { handle: "nobody" })).toBeNull();
  });

  test("list the articles the person wrote, matched by email when published", async () => {
    const t = setup();
    const author = await signIn(t, { name: "Ana Ruiz" });
    const coAuthor = await signIn(t, { name: "Chris Coauthor", email: "co.author@example.test" });
    const { handle } = await saveProfile(coAuthor, { isPublic: true });
    const chief = await signIn(t, { roles: ["admin", "editor"] });
    const manuscriptId = await submitted(t, author);
    await t.run(async (ctx) => {
      await ctx.db.patch("manuscripts", manuscriptId, { status: "accepted", acceptedAt: Date.now() });
    });
    await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "Text.",
      references: [],
      featured: false,
    });

    const profile = await t.query(api.profiles.getByHandle, { handle });
    expect(profile?.articles.map((a) => a.title)).toEqual([
      "Early mobilization after hip fracture surgery: a randomized trial",
    ]);

    // The article links the co-author's public profile, not the private one.
    const slug = profile!.articles[0].slug;
    const article = await t.query(api.articles.getBySlug, { slug });
    expect(article?.authors.map((a) => a.profile)).toEqual([null, handle]);
  });
});
