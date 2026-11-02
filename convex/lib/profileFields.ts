/**
 * Rules for the fields of a public profile: the links people can add, how a
 * typed link becomes a canonical address, and profile addresses (handles).
 * Pure functions with no Convex imports, so the profile form can check
 * input as people type, with the same rules the server enforces.
 */

import { slugify } from "./text";
import type { LinkKind } from "./validators";

type LinkKindSpec = {
  label: string;
  /** Shown under the field. */
  hint: string;
  placeholder: string;
  /** Recognises the kind's own addresses; returns the canonical form or null. */
  fromUrl: (url: URL) => string | null;
  /** Accepts a bare identifier (user ID, handle) instead of a full address. */
  fromId?: (id: string) => string | null;
};

const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, "");
const firstSegment = (url: URL) => url.pathname.split("/").filter(Boolean);

export const LINK_KINDS: Record<LinkKind, LinkKindSpec> = {
  google_scholar: {
    label: "Google Scholar",
    hint: "The address of your Scholar profile. It contains citations?user=.",
    placeholder: "https://scholar.google.com/citations?user=…",
    fromUrl(url) {
      if (!/^scholar\.google\.[a-z.]+$/.test(host(url))) return null;
      const user = url.searchParams.get("user");
      return user && /^[A-Za-z0-9_-]{6,20}$/.test(user)
        ? `https://scholar.google.com/citations?user=${user}`
        : null;
    },
    fromId: (id) => (/^[A-Za-z0-9_-]{12}$/.test(id) ? `https://scholar.google.com/citations?user=${id}` : null),
  },
  researchgate: {
    label: "ResearchGate",
    hint: "The address of your ResearchGate profile.",
    placeholder: "https://www.researchgate.net/profile/…",
    fromUrl(url) {
      if (host(url) !== "researchgate.net") return null;
      const [section, name] = firstSegment(url);
      return section === "profile" && name ? `https://www.researchgate.net/profile/${name}` : null;
    },
  },
  linkedin: {
    label: "LinkedIn",
    hint: "The address of your LinkedIn profile, or the part after /in/.",
    placeholder: "https://www.linkedin.com/in/…",
    fromUrl(url) {
      if (!/^([a-z]{2}\.)?linkedin\.com$/.test(host(url))) return null;
      const [section, name] = firstSegment(url);
      return section === "in" && name ? `https://www.linkedin.com/in/${name}` : null;
    },
    fromId: (id) =>
      /^[A-Za-z0-9][A-Za-z0-9_%-]{2,99}$/.test(id) ? `https://www.linkedin.com/in/${id}` : null,
  },
  scopus: {
    label: "Scopus",
    hint: "Your Scopus author ID (digits only), or the address of your author page.",
    placeholder: "57190000000",
    fromUrl(url) {
      if (host(url) !== "scopus.com") return null;
      const id = url.searchParams.get("authorId");
      return id && /^\d{5,15}$/.test(id) ? `https://www.scopus.com/authid/detail.uri?authorId=${id}` : null;
    },
    fromId: (id) => (/^\d{5,15}$/.test(id) ? `https://www.scopus.com/authid/detail.uri?authorId=${id}` : null),
  },
  web_of_science: {
    label: "Web of Science",
    hint: "Your ResearcherID (like A-1234-2010), or the address of your Web of Science profile.",
    placeholder: "A-1234-2010",
    fromUrl(url) {
      const h = host(url);
      if (h === "webofscience.com" || h === "publons.com") return `https://${url.hostname}${url.pathname}`;
      return null;
    },
    fromId: (id) =>
      /^[A-Z]{1,3}-\d{4}-\d{4}$/.test(id.toUpperCase())
        ? `https://www.webofscience.com/wos/author/record/${id.toUpperCase()}`
        : null,
  },
  pubmed: {
    label: "PubMed",
    hint: "A public My Bibliography list from My NCBI, or a PubMed search for your name.",
    placeholder: "https://www.ncbi.nlm.nih.gov/myncbi/…/bibliography/public/",
    fromUrl(url) {
      const h = host(url);
      if (h !== "pubmed.ncbi.nlm.nih.gov" && h !== "ncbi.nlm.nih.gov") return null;
      return `https://${url.hostname}${url.pathname}${url.search}`;
    },
  },
  website: {
    label: "Website",
    hint: "A personal or departmental page.",
    placeholder: "https://",
    fromUrl: (url) => url.toString(),
  },
  bluesky: {
    label: "Bluesky",
    hint: "Your handle, like name.bsky.social, or your profile address.",
    placeholder: "name.bsky.social",
    fromUrl(url) {
      if (host(url) !== "bsky.app") return null;
      const [section, handle] = firstSegment(url);
      return section === "profile" && handle ? `https://bsky.app/profile/${handle}` : null;
    },
    fromId(id) {
      const handle = id.replace(/^@/, "");
      return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(handle) ? `https://bsky.app/profile/${handle.toLowerCase()}` : null;
    },
  },
  x: {
    label: "X",
    hint: "Your handle, like @name, or your profile address.",
    placeholder: "@name",
    fromUrl(url) {
      const h = host(url);
      if (h !== "x.com" && h !== "twitter.com") return null;
      const [handle] = firstSegment(url);
      return handle && /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : null;
    },
    fromId(id) {
      const handle = id.replace(/^@/, "");
      return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : null;
    },
  },
};

/** The order links are shown in, on profiles and in the form. */
export const LINK_ORDER: readonly LinkKind[] = [
  "google_scholar",
  "researchgate",
  "scopus",
  "web_of_science",
  "pubmed",
  "linkedin",
  "website",
  "bluesky",
  "x",
];

const MAX_URL = 300;

function parseUrl(input: string): URL | null {
  // People paste addresses without the scheme ("linkedin.com/in/ana").
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : /^[^\s/]+\.[^\s/]+(\/|$)/.test(input) ? `https://${input}` : null;
  if (!withScheme) return null;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export type LinkResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Turn what someone typed into the link's canonical address: a full address
 * on the right site, or a bare ID where the site has one.
 */
export function normalizeLink(kind: LinkKind, raw: string): LinkResult {
  const spec = LINK_KINDS[kind];
  const input = raw.trim();
  if (!input) return { ok: false, message: `Add your ${spec.label} address.` };
  if (input.length > MAX_URL) return { ok: false, message: "That address is too long." };

  const url = parseUrl(input);
  if (url) {
    const canonical = spec.fromUrl(url);
    if (canonical && canonical.length <= MAX_URL) {
      // Only the website may stay on plain http.
      return { ok: true, url: kind === "website" ? canonical : canonical.replace(/^http:/, "https:") };
    }
  }
  const fromId = spec.fromId?.(input);
  if (fromId) return { ok: true, url: fromId };
  return { ok: false, message: `That doesn't look like a ${spec.label} address. ${spec.hint}` };
}

/** Which kind of link an address is, for links imported from an ORCID record. */
export function classifyUrl(raw: string): { kind: LinkKind; url: string } | null {
  const url = parseUrl(raw.trim());
  if (!url) return null;
  for (const kind of LINK_ORDER) {
    if (kind === "website") continue;
    const canonical = LINK_KINDS[kind].fromUrl(url);
    if (canonical) return { kind, url: canonical.replace(/^http:/, "https:") };
  }
  return { kind: "website", url: url.toString() };
}

/** The profile address a name suggests, before making it unique. */
export function handleFromName(name: string): string {
  const base = slugify(name, 40);
  return base === "article" || base.length < 3 ? "person" : base;
}

export const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function handleProblem(handle: string): string | null {
  if (handle.length < 3 || handle.length > 50) return "Use 3 to 50 characters.";
  if (!HANDLE_PATTERN.test(handle)) return "Use lowercase letters, numbers and single hyphens.";
  return null;
}

/** "Ana María Ruiz-Pérez" → "AR"; one name → its first two letters. */
export function initials(name: string): string {
  const words = name
    .replace(/\b(Dr|Prof|Professor|Mr|Mrs|Ms)\.?\s+/gi, "")
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const first = words[0][0];
  const last = words[words.length - 1].split("-")[0][0];
  return `${first}${last}`.toUpperCase();
}
