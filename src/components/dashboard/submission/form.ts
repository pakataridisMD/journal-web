import { articleTypes, type ArticleTypeKey } from "@/config/journal";
import type { ChecklistIssue, WizardStep } from "@/convex/lib/submission";
import type {
  AbstractSection,
  Declarations,
  ManuscriptAuthor,
  SuggestedReviewer,
} from "@/convex/lib/validators";
import type { ManuscriptDoc } from "../types";

/** The editable part of a draft, kept in the browser and autosaved. */
export type DraftForm = {
  title: string;
  articleType: ArticleTypeKey;
  abstractSections: AbstractSection[];
  keywords: string[];
  subjects: string[];
  authors: ManuscriptAuthor[];
  coverLetter: string;
  declarations: Declarations;
  suggestedReviewers: SuggestedReviewer[];
};

export type UpdateForm = (patch: Partial<DraftForm>) => void;

export function formFrom(m: ManuscriptDoc): DraftForm {
  return {
    title: m.title,
    articleType: m.articleType,
    abstractSections: m.abstractSections,
    keywords: m.keywords,
    subjects: m.subjects,
    authors: m.authors,
    coverLetter: m.coverLetter ?? "",
    declarations: m.declarations,
    suggestedReviewers: m.suggestedReviewers,
  };
}

/**
 * Move abstract text onto another type's headings without losing any:
 * matching headings keep their text, and text under headings the new type
 * doesn't have is appended to its first heading, labelled.
 */
export function remapAbstract(
  type: ArticleTypeKey,
  sections: readonly AbstractSection[],
): AbstractSection[] {
  const labels = articleTypes[type].abstractSections;
  const byLabel = new Map(sections.map((s) => [s.label, s.text]));
  const next = labels.map((label) => ({ label, text: byLabel.get(label) ?? "" }));
  const leftovers = sections.filter((s) => !labels.includes(s.label) && s.text.trim());
  if (leftovers.length > 0) {
    const carried = leftovers
      .map((s) => (sections.length > 1 && labels.length > 1 ? `${s.label}: ${s.text.trim()}` : s.text.trim()))
      .join("\n\n");
    next[0] = { ...next[0], text: [next[0].text.trim(), carried].filter(Boolean).join("\n\n") };
  }
  return next;
}

export type StepKey = "decision" | WizardStep | "review";

export const STEP_LABELS: Record<StepKey, string> = {
  decision: "Decision letter",
  type: "Article type",
  details: "Details",
  authors: "Authors",
  files: "Files",
  declarations: "Declarations",
  review: "Review and submit",
};

export function issuesByStep(issues: readonly ChecklistIssue[]) {
  const map = new Map<StepKey, string[]>();
  for (const issue of issues) {
    const step: StepKey = issue.step === "type" ? "details" : issue.step;
    map.set(step, [...(map.get(step) ?? []), issue.message]);
  }
  return map;
}

export const emptyAuthor = (): ManuscriptAuthor => ({
  name: "",
  email: "",
  affiliation: "",
  orcid: undefined,
  isCorresponding: false,
});

export const emptyReviewer = (): SuggestedReviewer => ({
  name: "",
  email: "",
  affiliation: "",
  reason: "",
});
