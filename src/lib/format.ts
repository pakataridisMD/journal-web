import { articleTypes, journal, type ArticleTypeKey } from "@/config/journal";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function parts(ms: number) {
  const d = new Date(ms);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

/** 3 September 2026 */
export function formatDate(ms: number) {
  const { day, month, year } = parts(ms);
  return `${day} ${MONTHS[month]} ${year}`;
}

/** 3 Sep 2026 */
export function formatShortDate(ms: number) {
  const { day, month, year } = parts(ms);
  return `${day} ${MONTHS[month].slice(0, 3)} ${year}`;
}

/** September 2026 */
export function formatMonthYear(ms: number) {
  const { month, year } = parts(ms);
  return `${MONTHS[month]} ${year}`;
}

export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const typeLabel = (type: ArticleTypeKey) => articleTypes[type].label;

export function issueLabel(issue: { volume: number; number: number }) {
  return `Volume ${issue.volume}, Issue ${issue.number}`;
}

export function shortIssueLabel(issue: { volume: number; number: number }) {
  return `Vol ${issue.volume} · No ${issue.number}`;
}

/** "Ana Ruiz, Tom Lee and Mei Lin" or "Ana Ruiz, Tom Lee, Mei Lin et al." */
export function authorList(names: readonly string[], max = 3): string {
  if (names.length === 0) return "";
  if (names.length > max) return `${names.slice(0, max).join(", ")} et al.`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** "Helena Marsh" → "Marsh H"; "Mary-Jane O'Neil" → "O'Neil MJ". */
export function vancouverName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const surname = parts.at(-1)!;
  const initials = parts
    .slice(0, -1)
    .flatMap((p) => p.split("-"))
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return `${surname} ${initials}`;
}

type Citable = {
  title: string;
  authors: readonly { name: string }[];
  publishedAt: number;
  articleNumber: string;
  doi?: string;
  issue: { volume: number; number: number } | null;
};

/** Vancouver-style citation, the format most medical journals ask for. */
export function citation(article: Citable): string {
  const names = article.authors.map((a) => vancouverName(a.name));
  const authors = names.length > 6 ? `${names.slice(0, 6).join(", ")}, et al` : names.join(", ");
  const year = new Date(article.publishedAt).getUTCFullYear();
  const where = article.issue
    ? `${year};${article.issue.volume}(${article.issue.number}):${article.articleNumber}`
    : `${year}:${article.articleNumber}`;
  const doi = article.doi ? ` doi:${article.doi}` : "";
  const title = article.title.replace(/[.?!]$/, "");
  return `${authors}. ${title}. ${journal.abbreviation}. ${where}.${doi}`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
