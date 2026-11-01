import { articleTypes, fileKinds, submissionRules } from "../../src/config/journal";
import type { Doc } from "../_generated/dataModel";
import { isValidEmail, isValidOrcid, normalizeEmail, wordCount } from "./text";

export type WizardStep = "type" | "details" | "authors" | "files" | "declarations";
export type ChecklistIssue = { step: WizardStep; message: string };

type Manuscript = Doc<"manuscripts">;
type ManuscriptFile = Pick<Doc<"manuscriptFiles">, "kind" | "version">;

/** Everything that must be true of the metadata before submission. */
export function metadataIssues(m: Manuscript): ChecklistIssue[] {
  const issues: ChecklistIssue[] = [];
  const add = (step: WizardStep, message: string) => issues.push({ step, message });
  const type = articleTypes[m.articleType];

  // Details
  const title = m.title.trim();
  if (!title) add("details", "Add a title.");
  else if (title.length > submissionRules.maxTitleLength) {
    add("details", `Shorten the title to ${submissionRules.maxTitleLength} characters.`);
  }
  const emptySections = m.abstractSections.filter((s) => !s.text.trim());
  if (emptySections.length > 0) {
    const labels = emptySections.map((s) => s.label).join(", ");
    add(
      "details",
      type.abstractSections.length === 1
        ? "Write the abstract."
        : `Complete the abstract (${labels}).`,
    );
  }
  const words = m.abstractSections.reduce((n, s) => n + wordCount(s.text), 0);
  if (words > type.abstractWordLimit) {
    add(
      "details",
      `The abstract is ${words} words; the limit for ${type.label.toLowerCase()} is ${type.abstractWordLimit} words.`,
    );
  }
  const keywords = m.keywords.filter((k) => k.trim());
  if (
    keywords.length < submissionRules.minKeywords ||
    keywords.length > submissionRules.maxKeywords
  ) {
    add(
      "details",
      `Add ${submissionRules.minKeywords} to ${submissionRules.maxKeywords} keywords.`,
    );
  }
  if (m.subjects.length === 0) add("details", "Choose at least one subject area.");

  // Authors
  if (m.authors.length === 0) add("authors", "Add at least one author.");
  if (m.authors.some((a) => !a.name.trim())) add("authors", "Every author needs a name.");
  if (m.authors.some((a) => !isValidEmail(normalizeEmail(a.email)))) {
    add("authors", "Every author needs a valid email address.");
  }
  if (m.authors.some((a) => !a.affiliation.trim())) {
    add("authors", "Every author needs an affiliation.");
  }
  if (m.authors.some((a) => a.orcid && !isValidOrcid(a.orcid.trim().toUpperCase()))) {
    add("authors", "One of the ORCID iDs isn't valid.");
  }
  const corresponding = m.authors.filter((a) => a.isCorresponding).length;
  if (m.authors.length > 0 && corresponding !== 1) {
    add("authors", "Mark exactly one corresponding author.");
  }
  const emails = m.authors.map((a) => normalizeEmail(a.email)).filter(Boolean);
  if (new Set(emails).size !== emails.length) {
    add("authors", "Two authors share an email address.");
  }

  // Declarations
  const d = m.declarations;
  const missing = (
    [
      ["ethics approval", d.ethics],
      ["consent", d.consent],
      ["competing interests", d.conflicts],
      ["funding", d.funding],
      ["data availability", d.dataAvailability],
      ["use of AI tools", d.aiUse],
    ] as const
  )
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  if (missing.length > 0) {
    add("declarations", `Complete the statements on ${missing.join(", ")}.`);
  }
  if (!d.originality) {
    add("declarations", "Confirm the work is original and not under consideration elsewhere.");
  }
  const authorEmails = new Set(emails);
  if (
    m.suggestedReviewers.some(
      (r) => !r.name.trim() || !isValidEmail(normalizeEmail(r.email)),
    )
  ) {
    add("declarations", "Each suggested reviewer needs a name and a valid email address.");
  }
  if (m.suggestedReviewers.some((r) => authorEmails.has(normalizeEmail(r.email)))) {
    add("declarations", "Authors can't be suggested as reviewers.");
  }

  return issues;
}

function hasFile(files: readonly ManuscriptFile[], version: number, kind: ManuscriptFile["kind"]) {
  return files.some((f) => f.version === version && f.kind === kind);
}

export function submissionIssues(
  m: Manuscript,
  files: readonly ManuscriptFile[],
): ChecklistIssue[] {
  const issues = metadataIssues(m);
  if (!hasFile(files, m.version, "manuscript")) {
    issues.push({ step: "files", message: `Upload the ${fileKinds.manuscript.label.toLowerCase()}.` });
  }
  if (!hasFile(files, m.version, "title_page")) {
    issues.push({ step: "files", message: "Upload the title page." });
  }
  return issues;
}

export function revisionIssues(
  m: Manuscript,
  files: readonly ManuscriptFile[],
): ChecklistIssue[] {
  const issues = submissionIssues(m, files);
  if (!hasFile(files, m.version, "response_to_reviewers")) {
    issues.push({ step: "files", message: "Upload your response to reviewers." });
  }
  return issues;
}

export function describeIssues(issues: readonly ChecklistIssue[]): string {
  const shown = issues.slice(0, 3).map((i) => i.message);
  const more = issues.length > 3 ? ` (and ${issues.length - 3} more)` : "";
  return `Before submitting: ${shown.join(" ")}${more}`;
}
