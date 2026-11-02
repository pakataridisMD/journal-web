import { describe, expect, test } from "vitest";
import { classifyUrl, handleFromName, handleProblem, initials, normalizeLink } from "./profileFields";

describe("normalizeLink", () => {
  const ok = (url: string) => ({ ok: true, url });

  test("turns profile addresses into their canonical form", () => {
    expect(normalizeLink("google_scholar", "https://scholar.google.co.uk/citations?hl=en&user=AbCdEfGhIjKl")).toEqual(
      ok("https://scholar.google.com/citations?user=AbCdEfGhIjKl"),
    );
    expect(normalizeLink("researchgate", "researchgate.net/profile/Ana-Ruiz-3/research")).toEqual(
      ok("https://www.researchgate.net/profile/Ana-Ruiz-3"),
    );
    expect(normalizeLink("linkedin", "https://uk.linkedin.com/in/ana-ruiz/")).toEqual(ok("https://www.linkedin.com/in/ana-ruiz"));
    expect(normalizeLink("scopus", "https://www.scopus.com/authid/detail.uri?authorId=57190000000")).toEqual(
      ok("https://www.scopus.com/authid/detail.uri?authorId=57190000000"),
    );
    expect(normalizeLink("x", "https://twitter.com/ana_ruiz")).toEqual(ok("https://x.com/ana_ruiz"));
    expect(normalizeLink("bluesky", "https://bsky.app/profile/ana.bsky.social")).toEqual(ok("https://bsky.app/profile/ana.bsky.social"));
    expect(normalizeLink("pubmed", "https://www.ncbi.nlm.nih.gov/myncbi/ana.ruiz.1/bibliography/public/")).toEqual(
      ok("https://www.ncbi.nlm.nih.gov/myncbi/ana.ruiz.1/bibliography/public/"),
    );
  });

  test("accepts bare IDs and handles where a site has them", () => {
    expect(normalizeLink("google_scholar", "AbCdEfGhIjKl")).toEqual(ok("https://scholar.google.com/citations?user=AbCdEfGhIjKl"));
    expect(normalizeLink("linkedin", "ana-ruiz")).toEqual(ok("https://www.linkedin.com/in/ana-ruiz"));
    expect(normalizeLink("scopus", "57190000000")).toEqual(ok("https://www.scopus.com/authid/detail.uri?authorId=57190000000"));
    expect(normalizeLink("web_of_science", "a-1234-2010")).toEqual(ok("https://www.webofscience.com/wos/author/record/A-1234-2010"));
    expect(normalizeLink("bluesky", "@Ana.bsky.social")).toEqual(ok("https://bsky.app/profile/ana.bsky.social"));
    expect(normalizeLink("x", "@ana_ruiz")).toEqual(ok("https://x.com/ana_ruiz"));
  });

  test("upgrades known sites to https but leaves websites as typed", () => {
    expect(normalizeLink("linkedin", "http://www.linkedin.com/in/ana")).toEqual(ok("https://www.linkedin.com/in/ana"));
    expect(normalizeLink("website", "http://old.example.edu/~ruiz")).toEqual(ok("http://old.example.edu/~ruiz"));
    expect(normalizeLink("website", "example.edu/ruiz")).toEqual(ok("https://example.edu/ruiz"));
  });

  test("refuses other sites, other schemes and credentials", () => {
    for (const [kind, input] of [
      ["linkedin", "https://evil.example/in/ana"],
      ["linkedin", "https://linkedin.com.evil.example/in/ana"],
      ["google_scholar", "https://scholar.google.com/scholar?q=ruiz"],
      ["researchgate", "https://www.researchgate.net/publication/123"],
      ["website", "javascript:alert(1)"],
      ["website", "ftp://example.edu/file"],
      ["website", "https://user:pass@example.edu/"],
      ["website", "not a link"],
      ["scopus", "123"],
      ["pubmed", "ana ruiz"],
    ] as const) {
      expect(normalizeLink(kind, input).ok, `${kind}: ${input}`).toBe(false);
    }
    expect(normalizeLink("website", "")).toMatchObject({ ok: false });
    expect(normalizeLink("website", `https://example.edu/${"a".repeat(400)}`)).toMatchObject({ ok: false });
  });
});

describe("classifyUrl", () => {
  test("recognises the sites profiles link to", () => {
    expect(classifyUrl("https://www.researchgate.net/profile/Ana-Ruiz")).toEqual({
      kind: "researchgate",
      url: "https://www.researchgate.net/profile/Ana-Ruiz",
    });
    expect(classifyUrl("http://example.edu/ruiz")).toEqual({ kind: "website", url: "http://example.edu/ruiz" });
    expect(classifyUrl("mailto:ana@example.edu")).toBeNull();
  });
});

describe("handles", () => {
  test("come from names", () => {
    expect(handleFromName("Dr. Ana María Ruiz-Pérez")).toBe("dr-ana-maria-ruiz-perez");
    expect(handleFromName("李")).toBe("person");
  });

  test("are checked", () => {
    expect(handleProblem("ana-ruiz")).toBeNull();
    expect(handleProblem("an")).toMatch(/3 to 50/);
    expect(handleProblem("Ana Ruiz")).toMatch(/lowercase/);
    expect(handleProblem("ana--ruiz")).toMatch(/lowercase/);
  });
});

describe("initials", () => {
  test("use the first and last names, ignoring titles", () => {
    expect(initials("Ana María Ruiz-Pérez")).toBe("AR");
    expect(initials("Prof. Tomás Ibarra")).toBe("TI");
    expect(initials("Cher")).toBe("CH");
    expect(initials("  ")).toBe("?");
  });
});
