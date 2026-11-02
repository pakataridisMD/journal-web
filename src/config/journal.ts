/**
 * Everything that names or describes the journal lives here, so renaming it
 * later is a one-file change. Pure data only: this module is imported by both
 * the Next.js app and the Convex functions.
 */

export const journal = {
  /** Placeholder until the journal has a name. */
  name: "The Journal",
  /** ISO 4-style abbreviation used in citations. */
  abbreviation: "J",
  /** Prefix for manuscript IDs, e.g. TJ-2026-0001. */
  codePrefix: "TJ",
  tagline: "Peer-reviewed, open-access general medicine",
  description:
    "An open-access journal publishing peer-reviewed clinical research, reviews and case reports across general medicine.",
  foundedYear: 2026,
  issnOnline: "Pending",
  publisher: "The Journal Editorial Office",
  contactEmail: "editorial@example.org",
  reviewModel: "Double-blind peer review",
  charges: "No submission or publication fees",
  license: {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
} as const;

export type ArticleTypeKey =
  | "original_research"
  | "systematic_review"
  | "review"
  | "case_report"
  | "short_communication"
  | "editorial"
  | "letter";

type ArticleTypeConfig = {
  label: string;
  /** Plural, used for issue table-of-contents sections. */
  plural: string;
  /** Shown to authors choosing a type. */
  description: string;
  /** Headings of the structured abstract; one entry means unstructured. */
  abstractSections: readonly string[];
  abstractWordLimit: number;
  /** Authors can submit this type; editorials are commissioned. */
  submittable: boolean;
};

export const articleTypes: Record<ArticleTypeKey, ArticleTypeConfig> = {
  original_research: {
    label: "Original research",
    plural: "Original research",
    description:
      "Trials, cohort, case-control, cross-sectional and diagnostic accuracy studies.",
    abstractSections: ["Background", "Methods", "Results", "Conclusions"],
    abstractWordLimit: 300,
    submittable: true,
  },
  systematic_review: {
    label: "Systematic review",
    plural: "Systematic reviews",
    description:
      "Systematic reviews and meta-analyses reported to PRISMA 2020.",
    abstractSections: ["Background", "Methods", "Results", "Conclusions"],
    abstractWordLimit: 300,
    submittable: true,
  },
  review: {
    label: "Review",
    plural: "Reviews",
    description: "Narrative and clinical reviews of a focused question.",
    abstractSections: ["Abstract"],
    abstractWordLimit: 250,
    submittable: true,
  },
  case_report: {
    label: "Case report",
    plural: "Case reports",
    description:
      "Single cases or short series that teach something new, reported to CARE.",
    abstractSections: ["Introduction", "Case presentation", "Conclusions"],
    abstractWordLimit: 250,
    submittable: true,
  },
  short_communication: {
    label: "Short communication",
    plural: "Short communications",
    description: "Brief reports of preliminary or focused findings.",
    abstractSections: ["Background", "Methods", "Results", "Conclusions"],
    abstractWordLimit: 200,
    submittable: true,
  },
  editorial: {
    label: "Editorial",
    plural: "Editorials",
    description: "Commissioned commentary from the editors.",
    abstractSections: ["Abstract"],
    abstractWordLimit: 150,
    submittable: false,
  },
  letter: {
    label: "Letter",
    plural: "Letters",
    description: "Responses to articles published in the journal.",
    abstractSections: ["Abstract"],
    abstractWordLimit: 150,
    submittable: true,
  },
};

/** Order of sections in an issue's table of contents. */
export const tocOrder: readonly ArticleTypeKey[] = [
  "editorial",
  "original_research",
  "systematic_review",
  "short_communication",
  "review",
  "case_report",
  "letter",
];

export const subjects = [
  "Cardiology",
  "Dermatology",
  "Emergency medicine",
  "Endocrinology",
  "Gastroenterology",
  "General practice",
  "Geriatrics",
  "Hematology",
  "Infectious diseases",
  "Internal medicine",
  "Medical education",
  "Nephrology",
  "Neurology",
  "Obstetrics and gynecology",
  "Oncology",
  "Pediatrics",
  "Psychiatry",
  "Public health",
  "Respiratory medicine",
  "Rheumatology",
  "Surgery",
] as const;

export type FileKindKey =
  | "manuscript"
  | "title_page"
  | "figure"
  | "supplement"
  | "response_to_reviewers";

type FileKindConfig = {
  label: string;
  help: string;
  /** Lower-case extensions without the dot. */
  extensions: readonly string[];
  /** One file of this kind per version (a new upload replaces it). */
  single: boolean;
  /** Reviewers may open it. Title pages identify the authors, so never. */
  visibleToReviewers: boolean;
};

export const fileKinds: Record<FileKindKey, FileKindConfig> = {
  manuscript: {
    label: "Anonymized manuscript",
    help: "Main text with names, affiliations and acknowledgements removed.",
    extensions: ["docx", "doc", "odt", "pdf", "tex"],
    single: true,
    visibleToReviewers: true,
  },
  title_page: {
    label: "Title page",
    help: "Authors, affiliations, acknowledgements, funding and conflicts.",
    extensions: ["docx", "doc", "odt", "pdf"],
    single: true,
    visibleToReviewers: false,
  },
  figure: {
    label: "Figure",
    help: "One file per figure; at least 300 dpi.",
    extensions: ["png", "jpg", "jpeg", "tif", "tiff", "pdf", "eps"],
    single: false,
    visibleToReviewers: true,
  },
  supplement: {
    label: "Supplementary material",
    help: "Appendices, extra tables, data, reporting checklists.",
    extensions: [
      "pdf",
      "docx",
      "doc",
      "xlsx",
      "xls",
      "csv",
      "zip",
      "png",
      "jpg",
      "jpeg",
    ],
    single: false,
    visibleToReviewers: true,
  },
  response_to_reviewers: {
    label: "Response to reviewers",
    help: "Point-by-point reply to every comment, required with a revision.",
    extensions: ["docx", "doc", "odt", "pdf"],
    single: true,
    visibleToReviewers: true,
  },
};

export const submissionRules = {
  maxFileBytes: 50 * 1024 * 1024,
  minKeywords: 3,
  maxKeywords: 6,
  maxTitleLength: 250,
  maxAuthors: 40,
  maxSuggestedReviewers: 5,
  /** Days a reviewer has to submit after an invitation, by default. */
  defaultReviewDays: 21,
} as const;

/**
 * The editorial board, shown on the Who we are page. People are appointed to
 * positions from the dashboard (Editorial board); these are the groups the
 * positions sit in, in page order.
 */
export type BoardGroupKey = "chief" | "deputy" | "section" | "methods" | "advisory" | "office";

export const boardGroups: Record<BoardGroupKey, { label: string; description: string }> = {
  chief: {
    label: "Editor-in-chief",
    description: "Sets the journal's direction and has the final word on every decision.",
  },
  deputy: {
    label: "Deputy editors",
    description: "Lead the research and the review and education sections.",
  },
  section: {
    label: "Section editors",
    description: "Handle manuscripts in their specialty, choose reviewers and recommend decisions.",
  },
  methods: {
    label: "Statistics and research integrity",
    description: "Check the methods and statistics of research papers and look into concerns.",
  },
  advisory: {
    label: "Advisory board",
    description: "Advise on scope and policy, and review for the journal.",
  },
  office: {
    label: "Editorial office",
    description: "Runs peer review and production, and answers authors' questions.",
  },
};

export const boardGroupOrder: readonly BoardGroupKey[] = [
  "chief",
  "deputy",
  "section",
  "methods",
  "advisory",
  "office",
];

/**
 * The board the journal is recruiting for. Shown as open positions until the
 * editor-in-chief sets up the board in the dashboard, which can start from it.
 * `subject` must be one of `subjects` (it gives the position its glyph).
 */
export const suggestedBoard: readonly { group: BoardGroupKey; title: string; subject?: (typeof subjects)[number] }[] = [
  { group: "chief", title: "Editor-in-chief" },
  { group: "deputy", title: "Deputy editor, clinical research" },
  { group: "deputy", title: "Deputy editor, reviews and education" },
  { group: "section", title: "Section editor, cardiology", subject: "Cardiology" },
  { group: "section", title: "Section editor, emergency medicine", subject: "Emergency medicine" },
  { group: "section", title: "Section editor, general practice", subject: "General practice" },
  { group: "section", title: "Section editor, infectious diseases", subject: "Infectious diseases" },
  { group: "section", title: "Section editor, oncology", subject: "Oncology" },
  { group: "section", title: "Section editor, pediatrics", subject: "Pediatrics" },
  { group: "methods", title: "Statistical editor" },
  { group: "methods", title: "Research integrity editor" },
  { group: "office", title: "Managing editor" },
];

/** Limits for public profiles. */
export const profileRules = {
  maxBio: 1500,
  maxCredentials: 80,
  maxExpertise: 5,
  maxKeywords: 10,
  maxKeywordLength: 60,
  /** Works from ORCID shown on a profile. */
  maxWorksShown: 10,
} as const;
