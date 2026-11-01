import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { setup, signIn } from "./test.helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("users.ensure", () => {
  test("creates an author on first sign-in and is idempotent", async () => {
    const t = setup();
    const { id, as } = await signIn(t, { email: "Ana@Example.test", name: "Ana Ruiz" });
    const again = await as.mutation(api.users.ensure, {});
    expect(again).toBe(id);

    const me = await as.query(api.users.me, {});
    expect(me).toMatchObject({
      _id: id,
      email: "ana@example.test",
      name: "Ana Ruiz",
      roles: ["author"],
    });
  });

  test("claims the placeholder an editor created for the same email", async () => {
    const t = setup();
    const editor = await signIn(t, { roles: ["editor"] });
    const placeholderId = await editor.as.mutation(api.users.addPerson, {
      email: "reviewer@uni.test",
      name: "Dr Placeholder",
      affiliation: "University Hospital",
      role: "reviewer",
    });

    const reviewer = await signIn(t, { email: "reviewer@uni.test", name: "Rita Reviewer" });
    expect(reviewer.id).toBe(placeholderId);
    const me = await reviewer.as.query(api.users.me, {});
    expect(me?.roles.sort()).toEqual(["author", "reviewer"]);
    // The name the person chose wins over the one the editor typed.
    expect(me?.name).toBe("Rita Reviewer");
    expect(me?.affiliation).toBe("University Hospital");
  });

  test("makes JOURNAL_ADMIN_EMAILS admins and editors", async () => {
    vi.stubEnv("JOURNAL_ADMIN_EMAILS", "chief@journal.test, other@journal.test");
    const t = setup();
    const chief = await signIn(t, { email: "chief@journal.test" });
    const me = await chief.as.query(api.users.me, {});
    expect(me?.roles.sort()).toEqual(["admin", "author", "editor"]);
  });

  test("explains what to configure when the token has no email", async () => {
    const t = setup();
    const as = t.withIdentity({ tokenIdentifier: "x|1", subject: "1", issuer: "x" });
    await expect(as.mutation(api.users.ensure, {})).rejects.toThrow(/SETUP_REQUIRED/);
  });

  test("explains what to configure when the token doesn't say the email is verified", async () => {
    const t = setup();
    const as = t.withIdentity({ tokenIdentifier: "x|3", subject: "3", issuer: "x", email: "someone@example.test" });
    await expect(as.mutation(api.users.ensure, {})).rejects.toThrow(/SETUP_REQUIRED/);
  });

  test("refuses unverified email addresses", async () => {
    const t = setup();
    const as = t.withIdentity({
      tokenIdentifier: "x|2",
      subject: "2",
      issuer: "x",
      email: "someone@example.test",
      emailVerified: false,
    });
    await expect(as.mutation(api.users.ensure, {})).rejects.toThrow(/verify/i);
  });

  test("requires a signed-in identity", async () => {
    const t = setup();
    await expect(t.mutation(api.users.ensure, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });
});

describe("users.me", () => {
  test("is null when signed out", async () => {
    const t = setup();
    expect(await t.query(api.users.me, {})).toBeNull();
  });
});

describe("users.updateProfile", () => {
  test("saves name, affiliation and a valid ORCID iD", async () => {
    const t = setup();
    const { as } = await signIn(t);
    await as.mutation(api.users.updateProfile, {
      name: "Dr Ana Ruiz",
      affiliation: "Hospital General",
      orcid: "0000-0002-1825-0097",
    });
    expect(await as.query(api.users.me, {})).toMatchObject({
      name: "Dr Ana Ruiz",
      affiliation: "Hospital General",
      orcid: "0000-0002-1825-0097",
    });
  });

  test("rejects an ORCID iD with a bad check digit", async () => {
    const t = setup();
    const { as } = await signIn(t);
    await expect(
      as.mutation(api.users.updateProfile, {
        name: "Ana",
        orcid: "0000-0002-1825-0098",
      }),
    ).rejects.toThrow(/ORCID/);
  });
});

describe("roles", () => {
  test("only admins change roles, and not their own admin role", async () => {
    const t = setup();
    const admin = await signIn(t, { roles: ["admin", "editor"] });
    const editor = await signIn(t, { roles: ["editor"] });
    const author = await signIn(t);

    await expect(
      editor.as.mutation(api.users.setRoles, { userId: author.id, roles: ["author", "editor"] }),
    ).rejects.toThrow(/FORBIDDEN/);

    await admin.as.mutation(api.users.setRoles, {
      userId: author.id,
      roles: ["author", "editor"],
    });
    expect((await author.as.query(api.users.me, {}))?.roles.sort()).toEqual(["author", "editor"]);

    await expect(
      admin.as.mutation(api.users.setRoles, { userId: admin.id, roles: ["author"] }),
    ).rejects.toThrow(/own admin/);
  });

  test("editors can add reviewers but only admins can add editors", async () => {
    const t = setup();
    const editor = await signIn(t, { roles: ["editor"] });
    await expect(
      editor.as.mutation(api.users.addPerson, {
        email: "new.editor@example.test",
        name: "New Editor",
        role: "editor",
      }),
    ).rejects.toThrow(/FORBIDDEN/);

    const author = await signIn(t);
    await expect(
      author.as.mutation(api.users.addPerson, {
        email: "x@example.test",
        name: "X",
        role: "reviewer",
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  test("editors search people by name or email; authors cannot", async () => {
    const t = setup();
    const editor = await signIn(t, { roles: ["editor"] });
    await signIn(t, { email: "maria.lopez@example.test", name: "Maria Lopez" });
    const author = await signIn(t);

    const results = await editor.as.query(api.users.search, { query: "Lopez" });
    expect(results.map((r) => r.email)).toContain("maria.lopez@example.test");

    await expect(author.as.query(api.users.search, { query: "Lopez" })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });
});
