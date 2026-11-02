import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { completeDraft, setup, signIn, storeFile, submitted } from "./test.helpers";

describe("drafts", () => {
  test("a new draft lists the submitter as corresponding author with the type's abstract headings", async () => {
    const t = setup();
    const author = await signIn(t, { name: "Ana Ruiz", email: "ana@example.test" });
    const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "case_report",
    });
    const detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.view).toBe("author");
    expect(detail.manuscript.status).toBe("draft");
    expect(detail.manuscript.authors).toEqual([
      expect.objectContaining({ name: "Ana Ruiz", email: "ana@example.test", isCorresponding: true }),
    ]);
    expect(detail.manuscript.abstractSections.map((s) => s.label)).toEqual([
      "Introduction",
      "Case presentation",
      "Conclusions",
    ]);
  });

  test("commissioned-only article types cannot be submitted", async () => {
    const t = setup();
    const author = await signIn(t);
    await expect(
      author.as.mutation(api.manuscripts.createDraft, { articleType: "editorial" }),
    ).rejects.toThrow(/INVALID_INPUT/);
  });

  test("changing the article type remaps abstract headings and keeps matching text", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    await author.as.mutation(api.manuscripts.updateDraft, {
      manuscriptId,
      abstractSections: [
        { label: "Background", text: "Why" },
        { label: "Methods", text: "How" },
        { label: "Results", text: "What" },
        { label: "Conclusions", text: "So what" },
      ],
    });
    await author.as.mutation(api.manuscripts.updateDraft, {
      manuscriptId,
      articleType: "case_report",
    });
    const { manuscript } = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(manuscript.abstractSections).toEqual([
      { label: "Introduction", text: "" },
      { label: "Case presentation", text: "" },
      { label: "Conclusions", text: "So what" },
    ]);
  });

  test("drafts are private to their submitter, even from editors", async () => {
    const t = setup();
    const author = await signIn(t);
    const other = await signIn(t);
    const editor = await signIn(t, { roles: ["editor", "admin"] });
    const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    await expect(other.as.query(api.manuscripts.get, { manuscriptId })).rejects.toThrow(/NOT_FOUND/);
    await expect(editor.as.query(api.manuscripts.get, { manuscriptId })).rejects.toThrow(/NOT_FOUND/);
    await expect(
      other.as.mutation(api.manuscripts.updateDraft, { manuscriptId, title: "Mine now" }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(t.query(api.manuscripts.get, { manuscriptId })).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("deleting a draft removes its files from storage", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await completeDraft(t, author);
    await author.as.mutation(api.manuscripts.deleteDraft, { manuscriptId });
    const remaining = await t.run(async (ctx) => ({
      files: await ctx.db.query("manuscriptFiles").collect(),
      blobs: await ctx.db.system.query("_storage").collect(),
      manuscripts: await ctx.db.query("manuscripts").collect(),
    }));
    expect(remaining).toEqual({ files: [], blobs: [], manuscripts: [] });
  });
});

describe("submission", () => {
  test("an incomplete draft reports what is missing, step by step", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    const { checklist } = await author.as.query(api.manuscripts.get, { manuscriptId });
    const steps = new Set(checklist.map((issue) => issue.step));
    expect(steps).toEqual(new Set(["details", "authors", "files", "declarations"]));
    await expect(author.as.mutation(api.manuscripts.submit, { manuscriptId })).rejects.toThrow(
      /INVALID_INPUT/,
    );
  });

  test("abstracts over the word limit are rejected", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await completeDraft(t, author);
    const long = Array.from({ length: 301 }, () => "word").join(" ");
    await author.as.mutation(api.manuscripts.updateDraft, {
      manuscriptId,
      abstractSections: [
        { label: "Background", text: long },
        { label: "Methods", text: "m" },
        { label: "Results", text: "r" },
        { label: "Conclusions", text: "c" },
      ],
    });
    const { checklist } = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(checklist).toEqual([
      expect.objectContaining({ step: "details", message: expect.stringMatching(/300 words/) }),
    ]);
  });

  test("submitting assigns sequential manuscript IDs and locks the draft", async () => {
    const t = setup();
    const author = await signIn(t);
    const first = await submitted(t, author);
    const second = await submitted(t, author);
    const year = new Date().getUTCFullYear();

    const a = await author.as.query(api.manuscripts.get, { manuscriptId: first });
    const b = await author.as.query(api.manuscripts.get, { manuscriptId: second });
    expect(a.manuscript.code).toBe(`TJ-${year}-0001`);
    expect(b.manuscript.code).toBe(`TJ-${year}-0002`);
    expect(a.manuscript.status).toBe("submitted");
    expect(a.manuscript.firstSubmittedAt).toBeTypeOf("number");
    expect(a.events.map((e) => e.type)).toEqual(["created", "submitted"]);

    await expect(
      author.as.mutation(api.manuscripts.updateDraft, { manuscriptId: first, title: "Changed" }),
    ).rejects.toThrow(/INVALID_STATE/);
  });

  test("the author's list shows their manuscripts, newest activity first", async () => {
    const t = setup();
    const author = await signIn(t);
    const other = await signIn(t);
    const older = await submitted(t, author);
    const newer = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "review",
    });
    await submitted(t, other);
    const mine = await author.as.query(api.manuscripts.listMine, {});
    expect(mine.map((m) => m._id)).toEqual([newer, older]);
  });

  test("the submitter can withdraw before a decision", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await submitted(t, author);
    await author.as.mutation(api.manuscripts.withdraw, {
      manuscriptId,
      reason: "Found an error in the analysis.",
    });
    const { manuscript, events } = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(manuscript.status).toBe("withdrawn");
    expect(events.at(-1)).toMatchObject({ type: "withdrawn", note: "Found an error in the analysis." });
  });
});

describe("files", () => {
  test("rejects file types that do not fit the slot", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    const storageId = await storeFile(t, "binary", "application/x-msdownload");
    await expect(
      author.as.mutation(api.files.attach, {
        manuscriptId,
        kind: "manuscript",
        storageId,
        fileName: "paper.exe",
      }),
    ).rejects.toThrow(/INVALID_INPUT/);
  });

  test("a new title page replaces the old one and frees its storage", async () => {
    const t = setup();
    const author = await signIn(t);
    const manuscriptId = await completeDraft(t, author);
    const replacement = await storeFile(t, "%PDF new title page");
    await author.as.mutation(api.files.attach, {
      manuscriptId,
      kind: "title_page",
      storageId: replacement,
      fileName: "title-v2.pdf",
    });
    const { files } = await author.as.query(api.manuscripts.get, { manuscriptId });
    const titlePages = files.filter((f) => f.kind === "title_page");
    expect(titlePages).toHaveLength(1);
    expect(titlePages[0].fileName).toBe("title-v2.pdf");
    const blobs = await t.run((ctx) => ctx.db.system.query("_storage").collect());
    expect(blobs).toHaveLength(2); // manuscript + new title page
  });

  test("only the submitter can attach files, and an upload can be attached once", async () => {
    const t = setup();
    const author = await signIn(t);
    const other = await signIn(t);
    const mine = await author.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    const theirs = await other.as.mutation(api.manuscripts.createDraft, {
      articleType: "original_research",
    });
    const storageId = await storeFile(t);
    await expect(
      other.as.mutation(api.files.attach, {
        manuscriptId: mine,
        kind: "manuscript",
        storageId,
        fileName: "x.pdf",
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    await author.as.mutation(api.files.attach, {
      manuscriptId: mine,
      kind: "manuscript",
      storageId,
      fileName: "x.pdf",
    });
    await expect(
      other.as.mutation(api.files.attach, {
        manuscriptId: theirs,
        kind: "manuscript",
        storageId,
        fileName: "x.pdf",
      }),
    ).rejects.toThrow(/CONFLICT/);
  });
});
