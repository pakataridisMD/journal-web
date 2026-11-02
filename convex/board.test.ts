import { describe, expect, test } from "vitest";
import { suggestedBoard } from "../src/config/journal";
import { api, internal } from "./_generated/api";
import { setup, signIn } from "./test.helpers";

describe("editorial board", () => {
  test("shows the suggested positions as open until the board is set up", async () => {
    const t = setup();
    const board = await t.query(api.board.publicBoard, {});
    expect(board.configured).toBe(false);
    expect(board.positions.map((p) => p.title)).toEqual(suggestedBoard.map((p) => p.title));
    expect(board.positions.every((p) => p.person === null)).toBe(true);
  });

  test("only the editor-in-chief manages it", async () => {
    const t = setup();
    const editor = await signIn(t, { roles: ["editor"] });
    await expect(editor.as.query(api.board.list, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(editor.as.mutation(api.board.addSuggested, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(
      editor.as.mutation(api.board.addPosition, { group: "section", title: "Section editor" }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  test("appointing someone puts their profile on the website", async () => {
    const t = setup();
    const chief = await signIn(t, { roles: ["admin", "editor"] });
    const ana = await signIn(t, { name: "Ana Ruiz", email: "ana@example.test" });

    await chief.as.mutation(api.board.addSuggested, {});
    await expect(chief.as.mutation(api.board.addSuggested, {})).rejects.toThrow(/already has positions/);
    const positions = await chief.as.query(api.board.list, {});
    expect(positions).toHaveLength(suggestedBoard.length);

    const cardiology = positions.find((p) => p.subject === "Cardiology")!;
    await chief.as.mutation(api.board.assign, { positionId: cardiology._id, userId: ana.id });

    const board = await t.query(api.board.publicBoard, {});
    expect(board.configured).toBe(true);
    const filled = board.positions.find((p) => p._id === cardiology._id);
    expect(filled?.person).toMatchObject({ name: "Ana Ruiz", handle: "ana-ruiz" });
    expect(JSON.stringify(board)).not.toContain("ana@example.test");

    // Public by appointment, though Ana never chose to show her profile.
    const profile = await t.query(api.profiles.getByHandle, { handle: "ana-ruiz" });
    expect(profile?.positions).toEqual([
      { group: "section", title: "Section editor, cardiology", subject: "Cardiology" },
    ]);
    expect(await t.query(api.profiles.publicHandles, {})).toEqual(["ana-ruiz"]);
    expect((await ana.as.query(api.profiles.mine, {})).visible).toBe(true);

    // Leaving the board takes the profile down again.
    await chief.as.mutation(api.board.assign, { positionId: cardiology._id });
    expect(await t.query(api.profiles.getByHandle, { handle: "ana-ruiz" })).toBeNull();
  });

  test("adds, edits, orders and removes positions", async () => {
    const t = setup();
    const chief = await signIn(t, { roles: ["admin", "editor"] });
    const first = await chief.as.mutation(api.board.addPosition, { group: "advisory", title: "  Advisor   one " });
    const second = await chief.as.mutation(api.board.addPosition, {
      group: "advisory",
      title: "Advisor two",
      subject: "Neurology",
    });
    await expect(
      chief.as.mutation(api.board.addPosition, { group: "advisory", title: "Advisor", subject: "Astrology" }),
    ).rejects.toThrow(/from the list/);
    await expect(chief.as.mutation(api.board.addPosition, { group: "advisory", title: " " })).rejects.toThrow(
      /title/,
    );

    const titles = async () => (await chief.as.query(api.board.list, {})).map((p) => p.title);
    expect(await titles()).toEqual(["Advisor one", "Advisor two"]);
    await chief.as.mutation(api.board.move, { positionId: second, direction: "up" });
    expect(await titles()).toEqual(["Advisor two", "Advisor one"]);
    await chief.as.mutation(api.board.move, { positionId: second, direction: "up" });
    expect(await titles()).toEqual(["Advisor two", "Advisor one"]);

    await chief.as.mutation(api.board.updatePosition, { positionId: first, title: "Chair", group: "chief", subject: null });
    const rows = await chief.as.query(api.board.list, {});
    expect(rows.map((p) => [p.group, p.title])).toEqual([
      ["chief", "Chair"],
      ["advisory", "Advisor two"],
    ]);

    await chief.as.mutation(api.board.removePosition, { positionId: first });
    expect(await titles()).toEqual(["Advisor two"]);
  });
});

describe("sample content", () => {
  test("seeds a board, reviewers and profiles that link their articles", async () => {
    const t = setup();
    await t.mutation(internal.seed.run, {});
    const board = await t.query(api.board.publicBoard, {});
    expect(board.configured).toBe(true);
    expect(board.positions.find((p) => p.group === "chief")?.person?.name).toBe("Ingrid Solberg");

    const reviewers = await t.query(api.profiles.listedReviewers, {});
    expect(reviewers.length).toBeGreaterThan(3);

    const helena = await t.query(api.profiles.getByHandle, { handle: "helena-marsh" });
    expect(helena?.orcid).toEqual({ id: "0000-0002-1825-0097", authenticated: true });
    expect(helena?.articles.length).toBe(1);
    expect(helena?.orcidRecord?.works.length).toBe(3);
    expect(helena?.metrics?.hIndex).toBe(14);

    // Seeding twice adds nothing.
    await t.mutation(internal.seed.run, {});
    expect((await t.query(api.board.publicBoard, {})).positions).toHaveLength(board.positions.length);
  });
});
