import { journal } from "../src/config/journal";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { DAY } from "./lib/manuscripts";
import { articleSearchText, slugify } from "./lib/text";
import type { AbstractSection, ArticleAuthor, ArticleType } from "./lib/validators";

/**
 * Sample content for previewing the site locally:
 *   npx convex run seed:run
 * Every article says it is a sample. Never run this on production.
 */

const SAMPLE_NOTE =
  "> **Sample article.** This text was written to preview the journal's layout. It is not real research and must not inform clinical care.\n\n";

type SampleArticle = {
  title: string;
  articleType: ArticleType;
  authors: ArticleAuthor[];
  abstractSections: AbstractSection[];
  keywords: string[];
  subjects: string[];
  body: string;
  references: string[];
  /** Days before now. */
  received?: number;
  revised?: number;
  accepted?: number;
  published: number;
  issue: 1 | null;
  featured?: boolean;
  funding?: string;
  conflicts?: string;
  dataAvailability?: string;
};

const SAMPLES: SampleArticle[] = [
  {
    title: "Why another journal? Our commitments to authors and readers",
    articleType: "editorial",
    authors: [
      { name: "The Editors", affiliation: journal.name, isCorresponding: true, email: journal.contactEmail },
    ],
    abstractSections: [
      {
        label: "Abstract",
        text: "We launch with three commitments: decisions within 30 days, double-blind review by clinicians who practice what they review, and free access to everything we publish.",
      },
    ],
    keywords: ["editorial", "peer review", "open access"],
    subjects: ["Medical education"],
    body:
      SAMPLE_NOTE +
      "## A journal for practicing clinicians\n\nMost of what changes practice in general medicine is published far from the clinicians who need it. We want a place where a careful study from a district hospital gets the same reading as one from a large trial network.\n\n## Three commitments\n\n1. **Fast, accountable decisions.** A first decision within 30 days, or an explanation of the delay.\n2. **Review by peers who practice.** Reviews are double-blind and every reviewer sees patients in the field they review.\n3. **Free to read, free to publish.** Everything is open access under CC BY 4.0, with no fees for authors.\n\n## What we ask of authors\n\nReport what you did and what you found, including the results you did not expect. Share your data where you can. Tell us about every interest that a reader would want to know.",
    references: [],
    published: 60,
    issue: 1,
  },
  {
    title: "Early mobilization after hip fracture surgery in adults over 65: a pragmatic randomized trial",
    articleType: "original_research",
    authors: [
      { name: "Helena Marsh", affiliation: "Department of Geriatric Medicine, Northfield General Hospital", orcid: "0000-0002-1825-0097", isCorresponding: true, email: "h.marsh@northfield.example" },
      { name: "Tomás Ibarra", affiliation: "Department of Orthopaedic Surgery, Northfield General Hospital", isCorresponding: false },
      { name: "Aiko Nakamura", affiliation: "Clinical Trials Unit, Harbor University", isCorresponding: false },
      { name: "Daniel Osei", affiliation: "Physiotherapy Service, Northfield General Hospital", isCorresponding: false },
    ],
    abstractSections: [
      { label: "Background", text: "Guidelines recommend mobilization within 36 hours of hip fracture surgery, but whether earlier mobilization improves recovery in the oldest patients is uncertain." },
      { label: "Methods", text: "In this pragmatic trial at four hospitals, 412 adults aged 65 or older were randomly assigned to supervised mobilization within 12 hours of surgery or usual care (mobilization within 36 hours). The primary outcome was independent walking at 30 days." },
      { label: "Results", text: "Independent walking at 30 days was achieved by 61.2% of patients in the early group and 52.4% in the usual-care group (risk difference 8.8 percentage points; 95% CI 0.4 to 17.2). Delirium occurred in 18.0% and 24.5%, respectively. There was no difference in falls or wound complications." },
      { label: "Conclusions", text: "Mobilization within 12 hours of hip fracture surgery was safe and modestly increased independent walking at 30 days in adults over 65." },
    ],
    keywords: ["hip fracture", "early mobilization", "older adults", "rehabilitation", "delirium"],
    subjects: ["Geriatrics", "Surgery"],
    body:
      SAMPLE_NOTE +
      "## Introduction\n\nHip fracture is among the most common reasons for emergency surgery in older adults, and one in four patients never regains the ability to walk independently. Mobilization within 36 hours is a quality standard in many countries, yet observational data suggest that each hour of delay matters most for the frailest patients.\n\n## Methods\n\n### Design and participants\n\nWe conducted a pragmatic, parallel-group randomized trial at four hospitals. Adults aged 65 or older undergoing surgery for a fragility hip fracture were eligible. We excluded patients who could not walk before the fracture.\n\n### Intervention\n\nPatients in the early group were helped to stand and walk by a physiotherapist within 12 hours of leaving the operating room, including overnight. Usual care followed each hospital's existing pathway.\n\n### Outcomes\n\nThe primary outcome was independent walking, with or without an aid, at 30 days. Secondary outcomes included delirium, falls, length of stay and 90-day mortality.\n\n## Results\n\nOf 498 patients screened, 412 were randomized (206 per group). Baseline characteristics were balanced.\n\n| Outcome | Early (n = 206) | Usual care (n = 206) | Difference (95% CI) |\n| --- | --- | --- | --- |\n| Independent walking at 30 days | 126 (61.2%) | 108 (52.4%) | 8.8 (0.4 to 17.2) |\n| Delirium during admission | 37 (18.0%) | 50 (24.5%) | −6.5 (−14.2 to 1.2) |\n| Falls in hospital | 9 (4.4%) | 11 (5.3%) | −0.9 (−5.0 to 3.1) |\n| Median length of stay, days | 9 | 10 | −1 (−2 to 0) |\n\n## Discussion\n\nEarly mobilization increased independent walking without an increase in falls. The effect on delirium was consistent with observational studies but imprecise. Overnight physiotherapy cover was the main practical barrier.\n\n## Conclusions\n\nHospitals that can provide physiotherapy within 12 hours of hip fracture surgery should consider doing so for patients over 65.",
    references: [
      "Okafor N, Lindqvist M. Timing of mobilization after hip fracture surgery: a cohort study. Example J Orthop Res. 2023;18(2):101-109.",
      "Brennan P, Achebe C, Ruiz A. Functional recovery after hip fracture in adults over 80. Example Age Ageing Rev. 2022;7(4):220-231.",
      "Hart L, Moreau J. Delirium prevention bundles in orthogeriatric care: a systematic review. Example Geriatr Med. 2021;12(1):14-29.",
      "Nwosu E, Fischer K. Physiotherapy staffing and outcomes after hip fracture. Example Health Serv J. 2024;5(3):77-85.",
    ],
    received: 140,
    revised: 95,
    accepted: 80,
    published: 58,
    issue: 1,
    featured: true,
    funding: "Supported by a regional research-for-patient-benefit grant (sample).",
    conflicts: "None declared.",
    dataAvailability: "Deidentified participant data are available from the corresponding author on reasonable request.",
  },
  {
    title: "Point-of-care ultrasound to guide fluid therapy in emergency department sepsis: a multicenter cohort study",
    articleType: "original_research",
    authors: [
      { name: "Rafael Quintero", affiliation: "Emergency Department, Harbor University Hospital", isCorresponding: true, email: "r.quintero@harbor.example" },
      { name: "Grace Whitfield", affiliation: "Intensive Care Unit, Lakeside Medical Center", isCorresponding: false },
      { name: "Samir Haddad", affiliation: "Emergency Department, Lakeside Medical Center", isCorresponding: false },
    ],
    abstractSections: [
      { label: "Background", text: "Fixed-volume fluid resuscitation in sepsis may cause harm in patients who are not fluid responsive." },
      { label: "Methods", text: "We studied 1,108 adults with sepsis and hypotension in three emergency departments, comparing ultrasound-guided fluid therapy with fixed-volume resuscitation using propensity-score weighting." },
      { label: "Results", text: "Ultrasound-guided patients received a median of 1.6 L in the first six hours versus 2.4 L. Need for mechanical ventilation was lower (8.1% vs 11.9%; adjusted odds ratio 0.68, 95% CI 0.49 to 0.94), with no difference in 28-day mortality." },
      { label: "Conclusions", text: "Ultrasound-guided resuscitation was associated with less fluid and less mechanical ventilation, without a difference in mortality. A randomized trial is warranted." },
    ],
    keywords: ["sepsis", "point-of-care ultrasound", "fluid therapy", "emergency medicine"],
    subjects: ["Emergency medicine", "Infectious diseases"],
    body:
      SAMPLE_NOTE +
      "## Introduction\n\nGuidelines suggest 30 mL/kg of crystalloid for sepsis-induced hypotension, but fluid responsiveness varies widely.\n\n## Methods\n\nWe included adults meeting Sepsis-3 criteria with a systolic blood pressure below 90 mm Hg. Exposure was documented ultrasound assessment of the inferior vena cava and left ventricular outflow before each bolus.\n\n## Results\n\nPatients in the ultrasound group were similar in age and illness severity after weighting. They received less fluid and fewer required ventilation.\n\n## Discussion\n\nObservational designs cannot exclude confounding by clinician skill. Our findings support a trial of ultrasound-guided resuscitation.",
    references: [
      "Lindgren S, Patel R. Fluid responsiveness in septic shock: a review. Example Crit Care Rev. 2022;9(2):55-70.",
      "Adeyemi T, Costa M. Inferior vena cava ultrasound in the emergency department. Example Emerg Med J. 2023;31(5):301-308.",
      "Kowalski P, Ng H. Fluid overload and outcomes in sepsis. Example Intensive Care Res. 2021;4(1):1-12.",
    ],
    received: 170,
    revised: 120,
    accepted: 90,
    published: 57,
    issue: 1,
    conflicts: "RQ has received speaker fees from an ultrasound manufacturer (sample).",
    dataAvailability: "Analysis code is available from the authors.",
  },
  {
    title: "Deprescribing interventions in older adults with polypharmacy: a systematic review and meta-analysis",
    articleType: "systematic_review",
    authors: [
      { name: "Ingrid Solberg", affiliation: "Institute of General Practice, Fjordland University", isCorresponding: true, email: "i.solberg@fjordland.example" },
      { name: "Kwame Asante", affiliation: "School of Pharmacy, Harbor University", isCorresponding: false },
    ],
    abstractSections: [
      { label: "Background", text: "Polypharmacy is common in older adults and linked to falls, hospital admission and death." },
      { label: "Methods", text: "We searched four databases to March 2025 for randomized trials of deprescribing interventions in adults aged 65 or older taking five or more medicines, and pooled results with random-effects models." },
      { label: "Results", text: "Thirty-one trials (9,842 participants) were included. Interventions reduced the number of medicines by 1.2 (95% CI 0.8 to 1.6) and potentially inappropriate prescriptions (risk ratio 0.71), but had no clear effect on mortality or hospital admission." },
      { label: "Conclusions", text: "Deprescribing reliably reduces medication burden; effects on clinical outcomes remain uncertain and need larger trials." },
    ],
    keywords: ["deprescribing", "polypharmacy", "older adults", "meta-analysis"],
    subjects: ["General practice", "Geriatrics"],
    body:
      SAMPLE_NOTE +
      "## Introduction\n\nOne in three adults over 75 takes ten or more medicines.\n\n## Methods\n\nThe review followed PRISMA 2020 and was registered in advance.\n\n## Results\n\nMost trials were pharmacist-led. Heterogeneity was moderate.\n\n## Discussion\n\nDeprescribing is feasible and safe in the short term.",
    references: [
      "Reyes D, Holm K. Polypharmacy prevalence in Europe. Example Eur J Gen Pract. 2022;28(1):12-19.",
      "Okonkwo A, Bauer F. Pharmacist-led medication review: a cluster trial. Example Prim Care Res. 2023;14(2):88-97.",
    ],
    received: 200,
    revised: 130,
    accepted: 85,
    published: 56,
    issue: 1,
    featured: true,
  },
  {
    title: "Recurrent hypoglycemia unmasking an insulinoma in a 34-year-old endurance runner",
    articleType: "case_report",
    authors: [
      { name: "Lucía Ferreira", affiliation: "Department of Endocrinology, Lakeside Medical Center", isCorresponding: true, email: "l.ferreira@lakeside.example" },
      { name: "Owen Gallagher", affiliation: "Department of Endocrinology, Lakeside Medical Center", isCorresponding: false },
    ],
    abstractSections: [
      { label: "Introduction", text: "Exercise-associated hypoglycemia in athletes is usually attributed to inadequate intake." },
      { label: "Case presentation", text: "A 34-year-old runner had three episodes of confusion after long runs. A supervised fast ended at 14 hours with glucose of 2.1 mmol/L and inappropriately high insulin. Endoscopic ultrasound found a 1.4 cm pancreatic lesion, which was enucleated." },
      { label: "Conclusions", text: "Recurrent neuroglycopenia in an athlete warrants biochemical evaluation for endogenous hyperinsulinism." },
    ],
    keywords: ["insulinoma", "hypoglycemia", "athletes", "case report"],
    subjects: ["Endocrinology"],
    body:
      SAMPLE_NOTE +
      "## Introduction\n\nInsulinomas are rare and diagnosis is often delayed by years.\n\n## Case presentation\n\nThe patient was referred after a third episode. Whipple's triad was documented during a supervised fast.\n\n## Discussion\n\nClinicians should not attribute recurrent hypoglycemia in athletes to diet without evaluation.",
    references: [
      "Morales V, Chen L. Diagnostic delay in insulinoma. Example Endocr Pract Rev. 2021;6(3):140-147.",
    ],
    received: 120,
    accepted: 75,
    published: 55,
    issue: 1,
  },
  {
    title: "Managing hypertension in pregnancy: an update for general practitioners",
    articleType: "review",
    authors: [
      { name: "Fatima Rahman", affiliation: "Department of Obstetrics, Northfield General Hospital", isCorresponding: true, email: "f.rahman@northfield.example" },
    ],
    abstractSections: [
      { label: "Abstract", text: "Hypertensive disorders affect up to one in ten pregnancies. This review summarizes current thresholds for treatment, first-line drugs, aspirin prophylaxis and postpartum follow-up, with a focus on decisions that fall to general practitioners." },
    ],
    keywords: ["hypertension", "pregnancy", "preeclampsia", "primary care"],
    subjects: ["Obstetrics and gynecology", "General practice"],
    body:
      SAMPLE_NOTE +
      "## Thresholds\n\nTreat persistent blood pressure of 140/90 mm Hg or higher.\n\n## Drugs\n\nLabetalol, nifedipine and methyldopa are first-line options.\n\n## After birth\n\nWomen with preeclampsia have a higher lifetime cardiovascular risk and need annual review.",
    references: [
      "Adebayo O, Lund S. Tight versus less tight control in pregnancy hypertension. Example Obstet Rev. 2020;3(2):45-58.",
    ],
    received: 110,
    accepted: 70,
    published: 54,
    issue: 1,
  },
  {
    title: "Uptake of shingles vaccination after automated text-message reminders in primary care",
    articleType: "short_communication",
    authors: [
      { name: "Benjamin Clarke", affiliation: "Riverside Family Practice", isCorresponding: true, email: "b.clarke@riverside.example" },
      { name: "Mei Lin", affiliation: "Department of Public Health, Harbor University", isCorresponding: false },
    ],
    abstractSections: [
      { label: "Background", text: "Shingles vaccine uptake among eligible adults remains below 50% in many practices." },
      { label: "Methods", text: "Six practices sent automated text reminders to 4,210 eligible patients; six matched practices did not." },
      { label: "Results", text: "Uptake at 12 weeks was 31.4% with reminders and 19.8% without (difference 11.6 points)." },
      { label: "Conclusions", text: "A single automated reminder was associated with a substantial increase in uptake." },
    ],
    keywords: ["herpes zoster", "vaccination", "text messaging", "primary care"],
    subjects: ["Public health", "General practice"],
    body:
      SAMPLE_NOTE +
      "## Background\n\nReminders are cheap and scalable.\n\n## Findings\n\nThe effect was largest in patients aged 70 to 79.",
    references: [],
    received: 60,
    accepted: 25,
    published: 12,
    issue: null,
  },
  {
    title: "Early mobilization after hip fracture: who provides the overnight physiotherapy?",
    articleType: "letter",
    authors: [
      { name: "Priya Natarajan", affiliation: "Physiotherapy Department, Eastbrook Hospital", isCorresponding: true, email: "p.natarajan@eastbrook.example" },
    ],
    abstractSections: [
      { label: "Abstract", text: "A response to Marsh and colleagues on the staffing needed to deliver mobilization within 12 hours of surgery." },
    ],
    keywords: ["hip fracture", "physiotherapy", "workforce"],
    subjects: ["Geriatrics"],
    body:
      SAMPLE_NOTE +
      "Marsh and colleagues report a clear benefit of early mobilization. In our hospital, half of hip fracture operations finish after 6 pm. Delivering their intervention would need overnight physiotherapy cover that few services have. We would welcome the authors' estimate of the staffing cost per patient.",
    references: [],
    received: 20,
    accepted: 8,
    published: 4,
    issue: null,
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("articles").first();
    if (existing) return "Skipped: articles already exist.";

    const now = Date.now();
    const ago = (days: number) => now - days * DAY;
    const issueId: Id<"issues"> = await ctx.db.insert("issues", {
      volume: 1,
      number: 1,
      title: "Inaugural issue",
      description: "Sample issue for previewing the site. Replace before launch.",
      status: "published",
      publishedAt: ago(50),
    });
    await ctx.db.insert("issues", { volume: 1, number: 2, status: "draft" });

    const year = new Date(now).getUTCFullYear();
    let sequence = 0;
    // Oldest first, so article numbers follow publication order.
    for (const sample of [...SAMPLES].sort((a, b) => b.published - a.published)) {
      sequence += 1;
      const content = {
        title: sample.title,
        abstractSections: sample.abstractSections,
        keywords: sample.keywords,
        subjects: sample.subjects,
        authors: sample.authors,
      };
      await ctx.db.insert("articles", {
        ...content,
        articleType: sample.articleType,
        slug: slugify(sample.title),
        articleNumber: `e${year}${String(sequence).padStart(3, "0")}`,
        body: sample.body,
        references: sample.references,
        issueId: sample.issue === 1 ? issueId : undefined,
        status: "published",
        featured: sample.featured ?? false,
        receivedAt: sample.received ? ago(sample.received) : undefined,
        revisedAt: sample.revised ? ago(sample.revised) : undefined,
        acceptedAt: sample.accepted ? ago(sample.accepted) : undefined,
        publishedAt: ago(sample.published),
        license: journal.license.name,
        funding: sample.funding,
        conflicts: sample.conflicts,
        dataAvailability: sample.dataAvailability,
        searchText: articleSearchText(content),
      });
    }
    const name = `article-${year}`;
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (counter) await ctx.db.patch("counters", counter._id, { value: sequence });
    else await ctx.db.insert("counters", { name, value: sequence });
    return `Seeded ${sequence} sample articles.`;
  },
});
