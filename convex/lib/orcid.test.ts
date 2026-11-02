import { describe, expect, test } from "vitest";
import {
  cleanDoi,
  parseOpenAlexAuthor,
  parseOrcidRecord,
  suggestionsFromRecord,
  tokenOrcid,
} from "./orcid";
import { SAMPLE_RECORD } from "./orcid.fixture";

describe("parseOrcidRecord", () => {
  const record = parseOrcidRecord(SAMPLE_RECORD);

  test("reads names, biography and keywords", () => {
    expect(record).toMatchObject({
      givenNames: "Ana",
      familyName: "Ruiz",
      creditName: "Ana M. Ruiz",
      biography: "Geriatrician working on falls and frailty.",
      keywords: ["frailty", "falls"],
    });
  });

  test("keeps web addresses only, and identifiers with values", () => {
    expect(record.researcherUrls.map((u) => u.name)).toEqual(["LinkedIn", "Lab", "Scholar"]);
    expect(record.externalIds).toHaveLength(2);
  });

  test("lists current jobs first", () => {
    expect(record.employments[0]).toMatchObject({
      organization: "Northfield General Hospital",
      department: "Department of Geriatric Medicine",
      startYear: 2012,
      endYear: undefined,
    });
    expect(record.employments[1].endYear).toBe(2012);
    expect(record.educations[0]).toMatchObject({ organization: "University of Example", role: "MD", endYear: 2004 });
  });

  test("takes one summary per work, newest first, with clean DOIs", () => {
    expect(record.worksCount).toBe(3);
    expect(record.works).toEqual([
      { title: "Frailty screening in primary care", journal: undefined, year: 2023, type: "journal-article", doi: undefined, url: "https://example.org/frailty" },
      { title: "Falls after hip fracture: a cohort study", journal: "Age and Ageing", year: 2019, type: "journal-article", doi: "10.1000/falls.2019", url: undefined },
    ]);
  });

  test("copes with an empty or odd response", () => {
    expect(parseOrcidRecord(null)).toEqual({
      givenNames: undefined,
      familyName: undefined,
      creditName: undefined,
      biography: undefined,
      keywords: [],
      researcherUrls: [],
      externalIds: [],
      employments: [],
      educations: [],
      works: [],
      worksCount: 0,
    });
    expect(parseOrcidRecord({ person: "nope", "activities-summary": [] }).works).toEqual([]);
  });

  test("suggests profile fields from the record", () => {
    expect(suggestionsFromRecord(record)).toEqual({
      biography: "Geriatrician working on falls and frailty.",
      keywords: ["frailty", "falls"],
      affiliation: "Department of Geriatric Medicine, Northfield General Hospital, Leeds, GB",
      links: [
        { kind: "scopus", url: "https://www.scopus.com/authid/detail.uri?authorId=57190000000" },
        { kind: "web_of_science", url: "https://www.webofscience.com/wos/author/record/A-1234-2010" },
        { kind: "linkedin", url: "https://www.linkedin.com/in/ana-ruiz" },
        { kind: "website", url: "https://geriatrics.example.edu/ruiz" },
        { kind: "google_scholar", url: "https://scholar.google.com/citations?user=AbCdEfGhIjKl" },
      ],
    });
  });
});

describe("tokenOrcid", () => {
  test("accepts only a valid iD", () => {
    expect(tokenOrcid({ orcid: "0000-0002-1825-0097", access_token: "x" })).toBe("0000-0002-1825-0097");
    expect(tokenOrcid({ orcid: "0000-0002-1825-0098" })).toBeNull();
    expect(tokenOrcid({ orcid: null })).toBeNull();
    expect(tokenOrcid("nope")).toBeNull();
  });
});

describe("cleanDoi", () => {
  test("normalizes the forms DOIs come in", () => {
    expect(cleanDoi("10.1000/xyz")).toBe("10.1000/xyz");
    expect(cleanDoi("https://doi.org/10.1000/xyz")).toBe("10.1000/xyz");
    expect(cleanDoi("doi: 10.1000/xyz")).toBe("10.1000/xyz");
    expect(cleanDoi("not a doi")).toBeUndefined();
  });
});

describe("parseOpenAlexAuthor", () => {
  test("reads counts, indices and topics", () => {
    expect(
      parseOpenAlexAuthor({
        id: "https://openalex.org/A5023888391",
        works_count: 42,
        cited_by_count: 1234,
        summary_stats: { h_index: 15, i10_index: 20, "2yr_mean_citedness": 2.1 },
        topics: [{ display_name: "Frailty in Older Adults" }, { display_name: "Hip Fracture Care" }],
      }),
    ).toEqual({
      source: "openalex",
      openAlexId: "https://openalex.org/A5023888391",
      worksCount: 42,
      citedByCount: 1234,
      hIndex: 15,
      i10Index: 20,
      topics: ["Frailty in Older Adults", "Hip Fracture Care"],
    });
  });

  test("returns null for something that isn't an author", () => {
    expect(parseOpenAlexAuthor({ error: "not found" })).toBeNull();
    expect(parseOpenAlexAuthor(null)).toBeNull();
  });
});
