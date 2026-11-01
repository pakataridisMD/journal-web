import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";
import type { Role } from "./lib/validators";

export type T = ReturnType<typeof convexTest<typeof schema.tables>>;

export function setup(): T {
  return convexTest(schema, modules);
}

let counter = 0;

/**
 * Sign a person in the way the app does (Clerk identity + users.ensure) and
 * optionally give them extra roles. Returns their id and a client acting as them.
 */
export async function signIn(
  t: T,
  person: { email?: string; name?: string; roles?: Role[] } = {},
) {
  counter += 1;
  const email = person.email ?? `person${counter}@example.test`;
  const name = person.name ?? `Person ${counter}`;
  const as = t.withIdentity({
    tokenIdentifier: `https://clerk.test|user_${counter}`,
    subject: `user_${counter}`,
    issuer: "https://clerk.test",
    email,
    name,
    emailVerified: true,
  });
  const id = (await as.mutation(api.users.ensure, {})) as Id<"users">;
  if (person.roles) {
    const roles = person.roles;
    await t.run(async (ctx) => {
      const user = await ctx.db.get("users", id);
      const merged = Array.from(new Set([...(user?.roles ?? []), ...roles]));
      await ctx.db.patch("users", id, { roles: merged });
    });
  }
  return { id, as, email, name };
}

export async function storeFile(t: T, contents = "%PDF-1.7 test", type = "application/pdf") {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob([contents], { type })),
  );
}

type Person = Awaited<ReturnType<typeof signIn>>;

export const SAMPLE_ABSTRACT = [
  { label: "Background", text: "Early mobilization may shorten recovery after hip fracture surgery." },
  { label: "Methods", text: "We randomized 240 adults to mobilization within 24 hours or usual care." },
  { label: "Results", text: "Median length of stay fell from 9 to 7 days (P = .01)." },
  { label: "Conclusions", text: "Mobilization within 24 hours was safe and shortened stays." },
];

export const SAMPLE_DECLARATIONS = {
  ethics: "Approved by the regional research ethics committee (ref 2025-114).",
  consent: "All participants gave written informed consent.",
  conflicts: "None declared.",
  funding: "No external funding.",
  dataAvailability: "Deidentified data are available on reasonable request.",
  originality: true,
  aiUse: "No generative AI was used.",
};

/** A draft that passes every submission check, owned by `author`. */
export async function completeDraft(t: T, author: Person, coAuthorEmail = "co.author@example.test") {
  const manuscriptId = await author.as.mutation(api.manuscripts.createDraft, {
    articleType: "original_research",
  });
  await author.as.mutation(api.manuscripts.updateDraft, {
    manuscriptId,
    title: "Early mobilization after hip fracture surgery: a randomized trial",
    abstractSections: SAMPLE_ABSTRACT,
    keywords: ["hip fracture", "early mobilization", "length of stay"],
    subjects: ["Surgery"],
    authors: [
      {
        name: author.name,
        email: author.email,
        affiliation: "General Hospital",
        isCorresponding: true,
      },
      {
        name: "Chris Coauthor",
        email: coAuthorEmail,
        affiliation: "University Medical School",
        isCorresponding: false,
      },
    ],
    declarations: SAMPLE_DECLARATIONS,
    coverLetter: "We believe this trial will interest your readers.",
  });
  for (const kind of ["manuscript", "title_page"] as const) {
    const storageId = await storeFile(t);
    await author.as.mutation(api.files.attach, {
      manuscriptId,
      kind,
      storageId,
      fileName: `${kind}.pdf`,
    });
  }
  return manuscriptId;
}

export async function submitted(t: T, author: Person) {
  const manuscriptId = await completeDraft(t, author);
  await author.as.mutation(api.manuscripts.submit, { manuscriptId });
  return manuscriptId;
}
