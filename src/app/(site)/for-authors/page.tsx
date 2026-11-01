import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/site/doc-page";
import { Button } from "@/components/ui/button";
import { articleTypes, fileKinds, journal, submissionRules, type ArticleTypeKey } from "@/config/journal";

export const metadata: Metadata = {
  title: "Guide for authors",
  description: `How to prepare and submit a manuscript to ${journal.name}.`,
};

const SECTIONS = [
  { id: "types", label: "Article types" },
  { id: "preparing", label: "Preparing your manuscript" },
  { id: "statements", label: "Required statements" },
  { id: "reporting", label: "Reporting guidelines" },
  { id: "process", label: "After you submit" },
  { id: "fees", label: "Fees and licensing" },
] as const;

const SUBMITTABLE = (Object.keys(articleTypes) as ArticleTypeKey[]).filter(
  (t) => articleTypes[t].submittable,
);

const GUIDELINES = [
  ["Randomized trials", "CONSORT"],
  ["Observational studies", "STROBE"],
  ["Systematic reviews", "PRISMA 2020"],
  ["Diagnostic accuracy studies", "STARD"],
  ["Case reports", "CARE"],
  ["Quality improvement", "SQUIRE 2.0"],
  ["Qualitative research", "SRQR or COREQ"],
] as const;

export default function ForAuthorsPage() {
  return (
    <DocPage
      eyebrow="For authors"
      title="Guide for authors"
      lede="Everything you need to prepare a submission. If anything here is unclear, write to the editorial office before you submit."
      sections={SECTIONS}
      aside={
        <Button asChild variant="brand" className="w-full">
          <Link href="/dashboard/submissions/new">Submit a manuscript</Link>
        </Button>
      }
    >
      <DocSection id="types" title="Article types">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-y border-foreground text-left">
                <th scope="col" className="py-2.5 pr-4 font-medium">Type</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Abstract</th>
                <th scope="col" className="py-2.5 font-medium">Limit</th>
              </tr>
            </thead>
            <tbody>
              {SUBMITTABLE.map((type) => {
                const config = articleTypes[type];
                return (
                  <tr key={type} className="border-b align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="font-medium">{config.label}</span>
                      <span className="mt-1 block text-muted-foreground">{config.description}</span>
                    </th>
                    <td className="py-3 pr-4">
                      {config.abstractSections.length > 1
                        ? `Structured: ${config.abstractSections.join(", ")}`
                        : "Unstructured"}
                    </td>
                    <td className="py-3 font-mono text-[0.8125rem] whitespace-nowrap">
                      {config.abstractWordLimit} words
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>Editorials are commissioned by the editors. Letters respond to articles we have published.</p>
      </DocSection>

      <DocSection id="preparing" title="Preparing your manuscript">
        <p>Review is double-blind, so you upload two separate files:</p>
        <ul>
          <li>
            <strong>{fileKinds.manuscript.label}</strong>: {fileKinds.manuscript.help} Remove names
            from file properties and refer to your own earlier work in the third person.
          </li>
          <li>
            <strong>{fileKinds.title_page.label}</strong>: {fileKinds.title_page.help} Only the
            editors see it.
          </li>
          <li>
            <strong>Figures and supplementary files</strong>, uploaded separately, each up to{" "}
            {submissionRules.maxFileBytes / 1024 / 1024} MB.
          </li>
        </ul>
        <p>
          You will also enter the title, abstract, {submissionRules.minKeywords} to{" "}
          {submissionRules.maxKeywords} keywords, every author’s affiliation and email, and one
          corresponding author. ORCID iDs are encouraged for all authors.
        </p>
      </DocSection>

      <DocSection id="statements" title="Required statements">
        <p>Every submission includes these statements, entered in the submission form:</p>
        <ul>
          <li><strong>Ethics approval</strong>, naming the committee and reference, or why it was not needed.</li>
          <li><strong>Consent</strong> from participants, or from patients described in case reports.</li>
          <li><strong>Competing interests</strong> for every author, including “None declared”.</li>
          <li><strong>Funding</strong>, with the role of the funder.</li>
          <li><strong>Data availability</strong>: where and how the data can be obtained.</li>
          <li><strong>Use of generative AI</strong> in preparing the manuscript, if any.</li>
        </ul>
      </DocSection>

      <DocSection id="reporting" title="Reporting guidelines">
        <p>Report your study to the guideline for its design and upload the completed checklist as a supplementary file.</p>
        <dl className="divide-y border-y">
          {GUIDELINES.map(([design, guideline]) => (
            <div key={design} className="flex justify-between gap-4 py-2.5">
              <dt>{design}</dt>
              <dd className="font-mono text-[0.8125rem]">{guideline}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection id="process" title="After you submit">
        <ol>
          <li>You receive a manuscript ID (for example {journal.codePrefix}-2026-0001) and can follow its status in your dashboard.</li>
          <li>An editor checks scope and completeness and either sends it for review or returns it with reasons.</li>
          <li>Reviewers have three weeks. We aim for a first decision within 30 days.</li>
          <li>With a revision decision, you upload revised files and a point-by-point response to the reviewers.</li>
          <li>Accepted articles are published online first, then collected into an issue.</li>
        </ol>
        <p>You can withdraw a manuscript at any time before a decision.</p>
      </DocSection>

      <DocSection id="fees" title="Fees and licensing">
        <p>
          {journal.charges}. Articles are published open access under{" "}
          <a href={journal.license.url} rel="license">{journal.license.name}</a>, and authors keep
          their copyright.
        </p>
      </DocSection>
    </DocPage>
  );
}
