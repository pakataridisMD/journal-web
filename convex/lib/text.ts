export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Trim, drop empties and drop case-insensitive duplicates, keeping order. */
export function cleanList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, " ");
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** ORCID iD format plus its ISO 7064 11,2 check digit. */
export function isValidOrcid(orcid: string): boolean {
  if (!ORCID_PATTERN.test(orcid)) return false;
  const digits = orcid.replace(/-/g, "");
  let total = 0;
  for (const ch of digits.slice(0, 15)) {
    total = (total + Number(ch)) * 2;
  }
  const result = (12 - (total % 11)) % 11;
  const check = result === 10 ? "X" : String(result);
  return digits[15] === check;
}

/** URL-safe slug from a title, cut at a word boundary. */
export function slugify(title: string, maxLength = 80): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= maxLength) return base || "article";
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Keep a display-safe file name: no paths, no control characters. */
export function cleanFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "file").slice(0, 200);
}

export function userSearchText(person: {
  name: string;
  email: string;
  affiliation?: string;
}): string {
  return [person.name, person.email, person.affiliation ?? ""]
    .join(" ")
    .trim();
}

export function articleSearchText(article: {
  title: string;
  abstractSections: readonly { label: string; text: string }[];
  keywords: readonly string[];
  subjects: readonly string[];
  authors: readonly { name: string }[];
}): string {
  return [
    article.title,
    article.authors.map((a) => a.name).join(" "),
    article.keywords.join(" "),
    article.subjects.join(" "),
    article.abstractSections.map((s) => s.text).join(" "),
  ].join("\n");
}
