import type { ArticleTypeKey, subjects } from "@/config/journal";
import type { GlyphName } from "./glyph-paths";
import type { PlateTone } from "./plate";

/**
 * Which glyph and plate tone stand for each subject and article type. Tones
 * follow an anatomical atlas's colour code loosely: artery red for the heart
 * and blood, nerve yellow for the brain and mind, and so on.
 */

export type Subject = (typeof subjects)[number];
export type Art = { glyph: GlyphName; tone: PlateTone };

export const SUBJECT_ART: Record<Subject, Art> = {
  Cardiology: { glyph: "cardiology", tone: "artery" },
  Dermatology: { glyph: "dermatology", tone: "eosin" },
  "Emergency medicine": { glyph: "emergency", tone: "artery" },
  Endocrinology: { glyph: "endocrinology", tone: "lymph" },
  Gastroenterology: { glyph: "gastroenterology", tone: "lymph" },
  "General practice": { glyph: "general-practice", tone: "vein" },
  Geriatrics: { glyph: "geriatrics", tone: "bone" },
  Hematology: { glyph: "hematology", tone: "artery" },
  "Infectious diseases": { glyph: "infectious-diseases", tone: "lymph" },
  "Internal medicine": { glyph: "internal-medicine", tone: "nerve" },
  "Medical education": { glyph: "medical-education", tone: "bone" },
  Nephrology: { glyph: "nephrology", tone: "vein" },
  Neurology: { glyph: "neurology", tone: "nerve" },
  "Obstetrics and gynecology": { glyph: "obstetrics-gynecology", tone: "eosin" },
  Oncology: { glyph: "oncology", tone: "eosin" },
  Pediatrics: { glyph: "pediatrics", tone: "nerve" },
  Psychiatry: { glyph: "psychiatry", tone: "nerve" },
  "Public health": { glyph: "public-health", tone: "vein" },
  "Respiratory medicine": { glyph: "respiratory-medicine", tone: "vein" },
  Rheumatology: { glyph: "rheumatology", tone: "bone" },
  Surgery: { glyph: "surgery", tone: "bone" },
};

export const TYPE_ART: Record<ArticleTypeKey, Art> = {
  original_research: { glyph: "original-research", tone: "vein" },
  systematic_review: { glyph: "systematic-review", tone: "lymph" },
  review: { glyph: "review", tone: "bone" },
  case_report: { glyph: "case-report", tone: "artery" },
  short_communication: { glyph: "short-communication", tone: "nerve" },
  editorial: { glyph: "editorial", tone: "eosin" },
  letter: { glyph: "letter", tone: "vein" },
};

const BY_LOWERCASE = new Map(
  Object.entries(SUBJECT_ART).map(([subject, art]) => [subject.toLowerCase(), art]),
);

/** The art for a subject name, ignoring case; undefined for subjects outside the list. */
export function subjectArt(subject: string): Art | undefined {
  return BY_LOWERCASE.get(subject.trim().toLowerCase());
}

/** An article's art: its first listed subject that has some, else its type's. */
export function articleArt(article: { subjects?: readonly string[]; articleType: ArticleTypeKey }): Art {
  for (const subject of article.subjects ?? []) {
    const art = subjectArt(subject);
    if (art) return art;
  }
  return TYPE_ART[article.articleType];
}

/** Cover art cycles through these, one a month, so each issue looks different. */
const COVER_SUBJECTS: readonly Subject[] = [
  "Cardiology",
  "Neurology",
  "Respiratory medicine",
  "Hematology",
  "Nephrology",
  "Infectious diseases",
  "Oncology",
  "Gastroenterology",
  "Endocrinology",
  "Rheumatology",
  "Dermatology",
  "Obstetrics and gynecology",
];

/** An issue's cover art, fixed by its volume and number alone. */
export function issueArt(issue: { volume: number; number: number }): Art {
  const n = COVER_SUBJECTS.length;
  const index = ((((issue.volume - 1) * 12 + issue.number - 1) % n) + n) % n;
  return SUBJECT_ART[COVER_SUBJECTS[index]];
}
