import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup, signIn, submitted, type T } from "./test.helpers";

async function accepted(t: T) {
  const author = await signIn(t, { name: "Ana Author", email: "ana@example.test" });
  const chief = await signIn(t, { roles: ["editor", "admin"] });
  const manuscriptId = await submitted(t, author);
  await chief.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: chief.id });
  await chief.as.mutation(api.editorial.decide, {
    manuscriptId,
    decision: "accept",
    letter: "Accepted without changes.",
  });
  return { author, chief, manuscriptId };
}

describe("publishing", () => {
  test("an accepted manuscript becomes a public article with its review dates", async () => {
    const t = setup();
    const { author, chief, manuscriptId } = await accepted(t);
    const issueId = await chief.as.mutation(api.issues.create, { volume: 1, number: 1 });
    await chief.as.mutation(api.issues.setPublished, { issueId, published: true });

    await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "## Introduction\n\nText.",
      references: ["Smith J. A study. Lancet. 2020;1:1-2.", "  "],
      issueId,
      featured: true,
    });

    const year = new Date().getUTCFullYear();
    const [card] = await t.query(api.articles.latest, {});
    expect(card).toMatchObject({
      slug: "early-mobilization-after-hip-fracture-surgery-a-randomized-trial",
      articleNumber: `e${year}001`,
      authors: ["Ana Author", "Chris Coauthor"],
      issue: expect.objectContaining({ volume: 1, number: 1 }),
    });

    const article = await t.query(api.articles.getBySlug, { slug: card.slug });
    expect(article).toMatchObject({
      references: ["Smith J. A study. Lancet. 2020;1:1-2."],
      license: "CC BY 4.0",
      funding: "No external funding.",
    });
    expect(article?.receivedAt).toBeTypeOf("number");
    expect(article?.acceptedAt).toBeTypeOf("number");
    // Only the corresponding author's email is published.
    expect(article?.authors.map((a) => a.email)).toEqual(["ana@example.test", undefined]);
    expect(JSON.stringify(article)).not.toContain("searchText");

    const { manuscript, events } = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(manuscript.status).toBe("published");
    expect(events.at(-1)?.type).toBe("published");

    const toc = await t.query(api.issues.get, { volume: 1, number: 1 });
    expect(toc?.sections).toEqual([
      expect.objectContaining({
        articleType: "original_research",
        articles: [expect.objectContaining({ slug: card.slug })],
      }),
    ]);
  });

  test("only accepted manuscripts can be published", async () => {
    const t = setup();
    const author = await signIn(t);
    const chief = await signIn(t, { roles: ["editor", "admin"] });
    const manuscriptId = await submitted(t, author);
    await expect(
      chief.as.mutation(api.articles.publishFromManuscript, {
        manuscriptId,
        body: "Text",
        references: [],
        featured: false,
      }),
    ).rejects.toThrow(/INVALID_STATE/);
  });

  test("hidden articles and draft issues stay off the public site", async () => {
    const t = setup();
    const { chief, manuscriptId } = await accepted(t);
    const draftIssue = await chief.as.mutation(api.issues.create, { volume: 1, number: 2 });
    const articleId = await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "Text",
      references: [],
      issueId: draftIssue,
      featured: false,
    });

    // In an unpublished issue the article counts as online first.
    expect(await t.query(api.issues.get, { volume: 1, number: 2 })).toBeNull();
    const online = await t.query(api.issues.onlineFirst, {});
    expect(online.map((a) => a._id)).toEqual([articleId]);

    await chief.as.mutation(api.articles.update, { articleId, status: "hidden" });
    const { articles } = await t.query(api.articles.list, {});
    expect(articles).toEqual([]);
    const slug = (await chief.as.query(api.articles.getForEdit, { articleId })).slug;
    expect(await t.query(api.articles.getBySlug, { slug })).toBeNull();
  });

  test("search finds published articles by keyword and author", async () => {
    const t = setup();
    const { chief, manuscriptId } = await accepted(t);
    await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "Text",
      references: [],
      featured: false,
    });
    expect(await t.query(api.articles.search, { query: "mobilization" })).toHaveLength(1);
    expect(await t.query(api.articles.search, { query: "Coauthor" })).toHaveLength(1);
    expect(await t.query(api.articles.search, { query: "oncology" })).toHaveLength(0);
  });

  test("views are counted per article", async () => {
    const t = setup();
    const { chief, manuscriptId } = await accepted(t);
    await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "Text",
      references: [],
      featured: false,
    });
    const [card] = await t.query(api.articles.latest, {});
    await t.mutation(api.articles.recordView, { slug: card.slug });
    await t.mutation(api.articles.recordView, { slug: card.slug });
    await t.mutation(api.articles.recordDownload, { slug: card.slug });
    const { page } = await chief.as.query(api.articles.listAll, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page[0]).toMatchObject({ views: 2, downloads: 1 });
  });

  test("editors can correct the abstract and keywords, but not the headings", async () => {
    const t = setup();
    const { author, chief, manuscriptId } = await accepted(t);
    const articleId = await chief.as.mutation(api.articles.publishFromManuscript, {
      manuscriptId,
      body: "Text",
      references: [],
      featured: false,
    });
    const before = await chief.as.query(api.articles.getForEdit, { articleId });
    await chief.as.mutation(api.articles.update, {
      articleId,
      abstractSections: before.abstractSections.map((s, i) => (i === 0 ? { ...s, text: "Corrected background." } : s)),
      keywords: ["hip fracture", " delirium ", ""],
    });
    const after = await chief.as.query(api.articles.getForEdit, { articleId });
    expect(after.abstractSections[0].text).toBe("Corrected background.");
    expect(after.keywords).toEqual(["hip fracture", "delirium"]);
    expect(await t.query(api.articles.search, { query: "delirium" })).toHaveLength(1);

    await expect(
      chief.as.mutation(api.articles.update, {
        articleId,
        abstractSections: [{ label: "Summary", text: "One paragraph." }],
      }),
    ).rejects.toThrow(/headings/);

    // The author's record links to the published article.
    const detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.articleSlug).toBe(after.slug);

    const issues = await chief.as.query(api.issues.listAll, {});
    expect(issues).toEqual([]);
    const issueId = await chief.as.mutation(api.issues.create, { volume: 1, number: 1 });
    await chief.as.mutation(api.articles.update, { articleId, issueId });
    expect(await chief.as.query(api.issues.listAll, {})).toEqual([
      expect.objectContaining({ _id: issueId, articleCount: 1, status: "draft" }),
    ]);
  });

  test("only editors run production, and only admins manage issues", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    await expect(author.as.query(api.articles.listAll, { paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow(/FORBIDDEN/);
    await expect(editor.as.mutation(api.issues.create, { volume: 1, number: 1 })).rejects.toThrow(/FORBIDDEN/);
  });
});
