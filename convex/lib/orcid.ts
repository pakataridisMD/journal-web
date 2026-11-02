/**
 * ORCID and OpenAlex: addresses, and turning their JSON into the small,
 * bounded shapes the journal stores. Pure functions, so they are tested
 * against sample responses and can run anywhere.
 *
 * ORCID record format: https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/
 * (v3.0 JSON). OpenAlex authors: https://docs.openalex.org/api-entities/authors
 */

import { classifyUrl, normalizeLink } from "./profileFields";
import { isValidOrcid } from "./text";
import type {
  LinkKind,
  OrcidAffiliation,
  OrcidRecord,
  OrcidWork,
  ResearchMetrics,
} from "./validators";

export function orcidHosts(sandbox: boolean) {
  return sandbox
    ? { site: "https://sandbox.orcid.org", api: "https://pub.sandbox.orcid.org" }
    : { site: "https://orcid.org", api: "https://pub.orcid.org" };
}

/** The address an ORCID iD is shown as, per ORCID's display guidelines. */
export const orcidUrl = (orcid: string) => `https://orcid.org/${orcid}`;

const LIMITS = {
  text: 300,
  biography: 1500,
  keywords: 20,
  urls: 15,
  externalIds: 10,
  employments: 15,
  educations: 10,
  works: 50,
} as const;

// ORCID wraps most values as { value: "..." }; anything may be null.
type Json = unknown;

function get(obj: Json, ...path: string[]): Json {
  let current = obj;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, Json>)[key];
  }
  return current;
}

function text(value: Json, max: number = LIMITS.text): string | undefined {
  const raw = value !== null && typeof value === "object" && "value" in value ? (value as { value: Json }).value : value;
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const cleaned = String(raw).replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function list(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function year(date: Json): number | undefined {
  const y = Number(text(get(date, "year")));
  return Number.isInteger(y) && y > 1900 && y < 2200 ? y : undefined;
}

function httpUrl(value: Json): string | undefined {
  const url = text(value, 500);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** "10.1000/xyz" from a DOI, its URL or "doi:" form; undefined if it isn't one. */
export function cleanDoi(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const doi = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : undefined;
}

function affiliations(section: Json, summaryKey: string, max: number): OrcidAffiliation[] {
  const out: OrcidAffiliation[] = [];
  for (const group of list(get(section, "affiliation-group"))) {
    for (const item of list(get(group, "summaries"))) {
      const summary = get(item, summaryKey);
      const organization = text(get(summary, "organization", "name"));
      if (!organization) continue;
      out.push({
        organization,
        department: text(get(summary, "department-name")),
        role: text(get(summary, "role-title")),
        city: text(get(summary, "organization", "address", "city")),
        country: text(get(summary, "organization", "address", "country")),
        startYear: year(get(summary, "start-date")),
        endYear: year(get(summary, "end-date")),
      });
    }
  }
  // Current positions first, then the most recent.
  out.sort((a, b) => {
    const current = Number(b.endYear === undefined) - Number(a.endYear === undefined);
    if (current !== 0) return current;
    return (b.endYear ?? b.startYear ?? 0) - (a.endYear ?? a.startYear ?? 0);
  });
  return out.slice(0, max);
}

function works(section: Json): { works: OrcidWork[]; count: number } {
  const groups = list(get(section, "group"));
  const all: OrcidWork[] = [];
  for (const group of groups) {
    // A group is one work as several sources list it; the first summary is the preferred one.
    const summary = list(get(group, "work-summary"))[0];
    const title = text(get(summary, "title", "title"));
    if (!title) continue;
    const ids = list(get(summary, "external-ids", "external-id"));
    const doiId = ids.find((id) => text(get(id, "external-id-type"))?.toLowerCase() === "doi");
    const doi = cleanDoi(text(get(doiId, "external-id-value")));
    all.push({
      title,
      journal: text(get(summary, "journal-title")),
      year: year(get(summary, "publication-date")),
      type: text(get(summary, "type"), 40),
      doi,
      url: doi ? undefined : httpUrl(get(summary, "url")),
    });
  }
  all.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return { works: all.slice(0, LIMITS.works), count: groups.length };
}

/** The parts of a v3.0 record (`GET /v3.0/{iD}/record`, JSON) that profiles use. */
export function parseOrcidRecord(json: Json): OrcidRecord {
  const person = get(json, "person");
  const activities = get(json, "activities-summary");
  const keywords = list(get(person, "keywords", "keyword"))
    .map((k) => text(get(k, "content"), 60))
    .filter((k): k is string => !!k);
  const researcherUrls = list(get(person, "researcher-urls", "researcher-url"))
    .map((u) => ({ name: text(get(u, "url-name"), 80) ?? "", url: httpUrl(get(u, "url")) }))
    .filter((u): u is { name: string; url: string } => !!u.url)
    .slice(0, LIMITS.urls);
  const externalIds = list(get(person, "external-identifiers", "external-identifier"))
    .map((id) => ({
      type: text(get(id, "external-id-type"), 60) ?? "",
      value: text(get(id, "external-id-value"), 120) ?? "",
      url: httpUrl(get(id, "external-id-url")),
    }))
    .filter((id) => id.type && id.value)
    .slice(0, LIMITS.externalIds);
  const { works: recent, count } = works(get(activities, "works"));

  return {
    givenNames: text(get(person, "name", "given-names"), 120),
    familyName: text(get(person, "name", "family-name"), 120),
    creditName: text(get(person, "name", "credit-name"), 200),
    biography: text(get(person, "biography", "content"), LIMITS.biography),
    keywords: Array.from(new Set(keywords)).slice(0, LIMITS.keywords),
    researcherUrls,
    externalIds,
    employments: affiliations(get(activities, "employments"), "employment-summary", LIMITS.employments),
    educations: affiliations(get(activities, "educations"), "education-summary", LIMITS.educations),
    works: recent,
    worksCount: count,
  };
}

/** The iD a token response names, if it is a valid one. */
export function tokenOrcid(json: Json): string | null {
  const orcid = get(json, "orcid");
  return typeof orcid === "string" && isValidOrcid(orcid) ? orcid : null;
}

/** An OpenAlex author (`GET /authors/orcid:{iD}`), or null if it isn't one. */
export function parseOpenAlexAuthor(json: Json): ResearchMetrics | null {
  const id = text(get(json, "id"), 120);
  const worksCount = Number(get(json, "works_count"));
  const citedByCount = Number(get(json, "cited_by_count"));
  if (!id || !Number.isFinite(worksCount) || !Number.isFinite(citedByCount)) return null;
  const whole = (value: Json) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };
  return {
    source: "openalex",
    openAlexId: id,
    worksCount,
    citedByCount,
    hIndex: whole(get(json, "summary_stats", "h_index")),
    i10Index: whole(get(json, "summary_stats", "i10_index")),
    topics: list(get(json, "topics"))
      .map((t) => text(get(t, "display_name"), 80))
      .filter((t): t is string => !!t)
      .slice(0, 5),
  };
}

/** "Department of Medicine, Harbor University, Boston, US" from a job. */
export function affiliationLine(a: OrcidAffiliation): string {
  return [a.department, a.organization, a.city, a.country].filter(Boolean).join(", ");
}

const ID_LINKS: Record<string, (value: string) => string> = {
  "scopus author id": (v) => `https://www.scopus.com/authid/detail.uri?authorId=${v}`,
  researcherid: (v) => `https://www.webofscience.com/wos/author/record/${v}`,
};
const ID_KINDS: Record<string, LinkKind> = { "scopus author id": "scopus", researcherid: "web_of_science" };

/**
 * What a record suggests for a profile: biography, keywords, current
 * affiliation and links (from its websites and its Scopus and Web of
 * Science identifiers). The profile form offers these; nothing is copied
 * without the person saving.
 */
export function suggestionsFromRecord(record: OrcidRecord) {
  const links = new Map<LinkKind, string>();
  const add = (kind: LinkKind, url: string) => {
    if (links.has(kind)) return;
    // Only what the profile form would accept.
    const result = normalizeLink(kind, url);
    if (result.ok) links.set(kind, result.url);
  };
  for (const id of record.externalIds) {
    const key = id.type.toLowerCase();
    const kind = ID_KINDS[key];
    if (kind) add(kind, ID_LINKS[key](id.value));
  }
  for (const item of record.researcherUrls) {
    const found = classifyUrl(item.url);
    if (found) add(found.kind, found.url);
  }
  const current = record.employments.find((e) => e.endYear === undefined) ?? record.employments[0];
  return {
    biography: record.biography,
    keywords: record.keywords,
    affiliation: current ? affiliationLine(current) : undefined,
    links: [...links].map(([kind, url]) => ({ kind, url })),
  };
}
