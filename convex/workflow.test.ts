import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { setup, signIn, storeFile, submitted, type T } from "./test.helpers";

const REPORT = {
  recommendation: "minor_revision" as const,
  scores: { originality: 4, methodology: 3, clarity: 4, significance: 4 },
  commentsToAuthor: "A well-run trial. Please report the allocation concealment method.",
  confidentialComments: "Possible overlap with a 2024 conference abstract.",
};

/** Submitted manuscript with a handling editor and one accepted reviewer. */
async function inReview(t: T) {
  const author = await signIn(t, { email: "author@example.test", name: "Ana Author" });
  const editor = await signIn(t, { email: "editor@journal.test", name: "Ed Editor", roles: ["editor"] });
  const reviewer = await signIn(t, { email: "rev@uni.test", name: "Rita Reviewer" });
  const manuscriptId = await submitted(t, author);
  await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
  const assignmentId = await editor.as.mutation(api.reviews.invite, {
    manuscriptId,
    reviewerId: reviewer.id,
    dueInDays: 14,
  });
  await reviewer.as.mutation(api.reviews.respond, { assignmentId, accept: true });
  return { author, editor, reviewer, manuscriptId, assignmentId };
}

describe("handling editor", () => {
  test("editors take unassigned manuscripts; others cannot take them over; admins reassign", async () => {
    const t = setup();
    const author = await signIn(t);
    const first = await signIn(t, { roles: ["editor"] });
    const second = await signIn(t, { roles: ["editor"] });
    const chief = await signIn(t, { roles: ["editor", "admin"] });
    const manuscriptId = await submitted(t, author);

    await first.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: first.id });
    let detail = await first.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.manuscript.status).toBe("with_editor");

    await expect(
      second.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: second.id }),
    ).rejects.toThrow(/FORBIDDEN/);

    await chief.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: second.id });
    detail = await second.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.view === "editor" && detail.handlingEditor?._id).toBe(second.id);

    await expect(
      author.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: author.id }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  test("an editor who is a listed co-author is kept out of the manuscript", async () => {
    const t = setup();
    const author = await signIn(t);
    const coAuthorEditor = await signIn(t, {
      email: "co.author@example.test",
      roles: ["editor"],
    });
    const chief = await signIn(t, { roles: ["editor", "admin"] });
    const manuscriptId = await submitted(t, author);

    await expect(coAuthorEditor.as.query(api.manuscripts.get, { manuscriptId })).rejects.toThrow(
      /NOT_FOUND/,
    );
    const queue = await coAuthorEditor.as.query(api.manuscripts.queue, { bucket: "new" });
    expect(queue.map((m) => m._id)).not.toContain(manuscriptId);
    await expect(
      chief.as.mutation(api.editorial.assignEditor, {
        manuscriptId,
        editorId: coAuthorEditor.id,
      }),
    ).rejects.toThrow(/conflict/i);
  });

  test("the new-submissions queue lists unassigned manuscripts for editors only", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const manuscriptId = await submitted(t, author);
    const queue = await editor.as.query(api.manuscripts.queue, { bucket: "new" });
    expect(queue).toEqual([
      expect.objectContaining({ _id: manuscriptId, status: "submitted", handlingEditorName: null }),
    ]);
    await expect(author.as.query(api.manuscripts.queue, { bucket: "new" })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  test("desk rejection closes the manuscript without review", async () => {
    const t = setup();
    const author = await signIn(t);
    const chief = await signIn(t, { roles: ["editor", "admin"] });
    const manuscriptId = await submitted(t, author);
    await chief.as.mutation(api.editorial.decide, {
      manuscriptId,
      decision: "desk_reject",
      letter: "Thank you. The topic is outside our scope.",
    });
    const detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.manuscript.status).toBe("rejected");
    expect(detail.decisions).toEqual([
      expect.objectContaining({ decision: "desk_reject", version: 1 }),
    ]);
  });
});

describe("peer review", () => {
  test("inviting a reviewer starts review and grants the reviewer role", async () => {
    const t = setup();
    const { editor, reviewer, manuscriptId } = await inReview(t);
    const detail = await editor.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.manuscript.status).toBe("under_review");
    expect((await reviewer.as.query(api.users.me, {}))?.roles).toContain("reviewer");
  });

  test("editors can invite someone without an account by email", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const manuscriptId = await submitted(t, author);
    await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
    await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      newReviewer: { email: "new.person@uni.test", name: "New Person", affiliation: "Uni" },
      dueInDays: 21,
    });
    const newcomer = await signIn(t, { email: "new.person@uni.test" });
    const assignments = await newcomer.as.query(api.reviews.listMine, {});
    expect(assignments).toEqual([expect.objectContaining({ status: "invited" })]);
  });

  test("authors and their co-authors cannot be invited to review their own work", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const manuscriptId = await submitted(t, author);
    await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
    await expect(
      editor.as.mutation(api.reviews.invite, { manuscriptId, reviewerId: author.id, dueInDays: 14 }),
    ).rejects.toThrow(/conflict/i);
    await expect(
      editor.as.mutation(api.reviews.invite, {
        manuscriptId,
        newReviewer: { email: "co.author@example.test", name: "Chris" },
        dueInDays: 14,
      }),
    ).rejects.toThrow(/conflict/i);
  });

  test("only the handling editor or an admin can invite reviewers", async () => {
    const t = setup();
    const author = await signIn(t);
    const handling = await signIn(t, { roles: ["editor"] });
    const bystander = await signIn(t, { roles: ["editor"] });
    const reviewer = await signIn(t);
    const manuscriptId = await submitted(t, author);
    await handling.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: handling.id });
    await expect(
      bystander.as.mutation(api.reviews.invite, { manuscriptId, reviewerId: reviewer.id, dueInDays: 14 }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  test("reviewers see an anonymized manuscript, and files only after accepting", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const reviewer = await signIn(t);
    const manuscriptId = await submitted(t, author);
    await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
    const assignmentId = await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      reviewerId: reviewer.id,
      dueInDays: 14,
    });

    const invited = await reviewer.as.query(api.reviews.getAssignment, { assignmentId });
    expect(invited.manuscript.title).toMatch(/hip fracture/);
    expect(invited.files).toEqual([]);
    const serialized = JSON.stringify(invited);
    expect(serialized).not.toContain(author.email);
    expect(serialized).not.toContain("co.author@example.test");
    expect(serialized).not.toContain("coverLetter");
    expect(serialized).not.toContain("We believe this trial");
    expect(serialized).not.toContain('"funding"');
    expect(serialized).not.toContain('"conflicts"');

    await reviewer.as.mutation(api.reviews.respond, { assignmentId, accept: true });
    const accepted = await reviewer.as.query(api.reviews.getAssignment, { assignmentId });
    expect(accepted.files.map((f) => f.kind)).toEqual(["manuscript"]);
    expect(accepted.files[0].url).toMatch(/^https:/);

    // Reviewers never get the editor's view of the manuscript.
    await expect(reviewer.as.query(api.manuscripts.get, { manuscriptId })).rejects.toThrow(/NOT_FOUND/);
  });

  test("a reviewer cannot open someone else's assignment", async () => {
    const t = setup();
    const { assignmentId } = await inReview(t);
    const stranger = await signIn(t);
    await expect(stranger.as.query(api.reviews.getAssignment, { assignmentId })).rejects.toThrow(
      /NOT_FOUND/,
    );
  });

  test("reports need an accepted invitation and can only be submitted once", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const reviewer = await signIn(t);
    const manuscriptId = await submitted(t, author);
    await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
    const assignmentId = await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      reviewerId: reviewer.id,
      dueInDays: 14,
    });
    await expect(
      reviewer.as.mutation(api.reviews.submit, { assignmentId, ...REPORT }),
    ).rejects.toThrow(/INVALID_STATE/);
    await reviewer.as.mutation(api.reviews.respond, { assignmentId, accept: true });
    await reviewer.as.mutation(api.reviews.saveDraft, {
      assignmentId,
      commentsToAuthor: "Draft so far",
    });
    expect(
      (await reviewer.as.query(api.reviews.getAssignment, { assignmentId })).assignment
        .commentsToAuthor,
    ).toBe("Draft so far");
    await reviewer.as.mutation(api.reviews.submit, { assignmentId, ...REPORT });
    await expect(
      reviewer.as.mutation(api.reviews.submit, { assignmentId, ...REPORT }),
    ).rejects.toThrow(/INVALID_STATE/);
  });

  test("declining records the reason and keeps the files closed", async () => {
    const t = setup();
    const author = await signIn(t);
    const editor = await signIn(t, { roles: ["editor"] });
    const reviewer = await signIn(t);
    const manuscriptId = await submitted(t, author);
    await editor.as.mutation(api.editorial.assignEditor, { manuscriptId, editorId: editor.id });
    const assignmentId = await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      reviewerId: reviewer.id,
      dueInDays: 14,
    });
    await reviewer.as.mutation(api.reviews.respond, {
      assignmentId,
      accept: false,
      declineReason: "Conflict: I know the senior author.",
    });
    const view = await reviewer.as.query(api.reviews.getAssignment, { assignmentId });
    expect(view.assignment.status).toBe("declined");
    expect(view.files).toEqual([]);
    const editorView = await editor.as.query(api.manuscripts.get, { manuscriptId });
    expect(editorView.view === "editor" && editorView.reviews[0].declineReason).toBe(
      "Conflict: I know the senior author.",
    );
  });
});

describe("decisions and revisions", () => {
  async function reviewed(t: T) {
    const ctx = await inReview(t);
    await ctx.reviewer.as.mutation(api.reviews.submit, {
      assignmentId: ctx.assignmentId,
      ...REPORT,
    });
    return ctx;
  }

  test("authors see anonymized reviewer comments only after a decision", async () => {
    const t = setup();
    const { author, editor, manuscriptId } = await reviewed(t);

    let detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.view === "author" && detail.reviews).toEqual([]);

    await editor.as.mutation(api.editorial.decide, {
      manuscriptId,
      decision: "minor_revision",
      letter: "Please address the reviewer's comments.",
    });
    detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    if (detail.view !== "author") throw new Error("expected author view");
    expect(detail.reviews).toEqual([
      expect.objectContaining({
        label: "Reviewer 1",
        version: 1,
        commentsToAuthor: REPORT.commentsToAuthor,
      }),
    ]);
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain(REPORT.confidentialComments);
    expect(serialized).not.toContain("Rita Reviewer");
    expect(serialized).not.toContain("rev@uni.test");
  });

  test("a revision decision opens version 2 with the previous files carried over", async () => {
    const t = setup();
    const { author, editor, manuscriptId } = await reviewed(t);
    await editor.as.mutation(api.editorial.decide, {
      manuscriptId,
      decision: "major_revision",
      letter: "Major revision required.",
    });
    const detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.manuscript).toMatchObject({ status: "revision_requested", version: 2 });
    const v2 = detail.files.filter((f) => f.version === 2).map((f) => f.kind).sort();
    expect(v2).toEqual(["manuscript", "title_page"]);
  });

  test("a revision needs a response to reviewers and goes back to the handling editor", async () => {
    const t = setup();
    const { author, editor, reviewer, manuscriptId } = await reviewed(t);
    await editor.as.mutation(api.editorial.decide, {
      manuscriptId,
      decision: "minor_revision",
      letter: "Minor revision.",
    });
    await expect(
      author.as.mutation(api.manuscripts.submitRevision, { manuscriptId }),
    ).rejects.toThrow(/response to reviewers/i);

    const storageId = await storeFile(t, "%PDF response");
    await author.as.mutation(api.files.attach, {
      manuscriptId,
      kind: "response_to_reviewers",
      storageId,
      fileName: "response.pdf",
    });
    await author.as.mutation(api.manuscripts.submitRevision, { manuscriptId });
    const detail = await editor.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.manuscript).toMatchObject({ status: "with_editor", version: 2 });
    expect(detail.manuscript.revisedAt).toBeTypeOf("number");

    // Re-inviting the same reviewer for round two is allowed.
    const second = await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      reviewerId: reviewer.id,
      dueInDays: 7,
    });
    await reviewer.as.mutation(api.reviews.respond, { assignmentId: second, accept: true });
    const round2 = await reviewer.as.query(api.reviews.getAssignment, { assignmentId: second });
    expect(round2.files.map((f) => f.kind).sort()).toEqual(["manuscript", "response_to_reviewers"]);
  });

  test("decisions cancel invitations still outstanding", async () => {
    const t = setup();
    const { editor, manuscriptId } = await reviewed(t);
    const late = await signIn(t);
    const lateAssignment = await editor.as.mutation(api.reviews.invite, {
      manuscriptId,
      reviewerId: late.id,
      dueInDays: 14,
    });
    await editor.as.mutation(api.editorial.decide, {
      manuscriptId,
      decision: "accept",
      letter: "Accepted.",
    });
    const view = await late.as.query(api.reviews.getAssignment, { assignmentId: lateAssignment });
    expect(view.assignment.status).toBe("cancelled");
    expect(view.files).toEqual([]);
  });

  test("withdrawal cancels open reviews", async () => {
    const t = setup();
    const { author, reviewer, manuscriptId, assignmentId } = await inReview(t);
    await author.as.mutation(api.manuscripts.withdraw, { manuscriptId, reason: "Duplicate." });
    const view = await reviewer.as.query(api.reviews.getAssignment, { assignmentId });
    expect(view.assignment.status).toBe("cancelled");
    await expect(
      reviewer.as.mutation(api.reviews.submit, { assignmentId, ...REPORT }),
    ).rejects.toThrow(/INVALID_STATE/);
  });

  test("bystander editors cannot decide; reviewers' identities stay hidden in the author timeline", async () => {
    const t = setup();
    const { author, manuscriptId } = await reviewed(t);
    const bystander = await signIn(t, { roles: ["editor"] });
    await expect(
      bystander.as.mutation(api.editorial.decide, {
        manuscriptId,
        decision: "accept",
        letter: "Accepted.",
      }),
    ).rejects.toThrow(/FORBIDDEN/);
    const detail = await author.as.query(api.manuscripts.get, { manuscriptId });
    expect(detail.events.map((e) => e.type)).toEqual(["created", "submitted", "editor_assigned"]);
  });
});

export type { Id };
