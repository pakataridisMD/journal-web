import type { Metadata } from "next";
import Link from "next/link";
import { Scene } from "@/components/art/scene";
import { DocPage, DocSection } from "@/components/site/doc-page";
import { journal } from "@/config/journal";

export const metadata: Metadata = {
  title: "About the journal",
  description: `Aims, scope and editorial policies of ${journal.name}.`,
};

const SECTIONS = [
  { id: "aims", label: "Aims and scope" },
  { id: "peer-review", label: "Peer review" },
  { id: "open-access", label: "Open access and licensing" },
  { id: "ethics", label: "Publication ethics" },
  { id: "corrections", label: "Corrections and retractions" },
  { id: "independence", label: "Editorial independence" },
  { id: "contact", label: "Contact" },
] as const;

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="About"
      title={`About ${journal.name}`}
      lede={journal.description}
      sections={SECTIONS}
      art={<Scene name="helix" draw />}
    >
      <DocSection id="aims" title="Aims and scope">
        <p>
          We publish research that helps clinicians make better decisions for their patients:
          clinical trials, observational studies, diagnostic accuracy studies, systematic
          reviews, focused clinical reviews and case reports that teach something new.
        </p>
        <p>
          Our scope is general medicine in its broadest sense, from primary care to hospital
          specialties, medical education and public health. We value careful studies from any
          setting, and we judge work on its question and its methods, not on where it was done.
        </p>
      </DocSection>

      <DocSection id="peer-review" title="Peer review">
        <p>
          Every research article is assessed by an editor and sent to at least two independent
          reviewers. Review is <strong>double-blind</strong>: reviewers do not see the authors’
          names, and authors do not see the reviewers’. Authors upload an anonymized manuscript
          and a separate title page that only the editors can open.
        </p>
        <ol>
          <li>An editor checks scope and completeness, usually within a week.</li>
          <li>Reviewers are invited and given three weeks for their reports.</li>
          <li>The handling editor decides: accept, minor revision, major revision or reject.</li>
          <li>Revised manuscripts return to the same editor and, where needed, the same reviewers.</li>
        </ol>
        <p>
          Each published article shows when it was received, revised and accepted, so readers
          can see its path through review.
        </p>
      </DocSection>

      <DocSection id="open-access" title="Open access and licensing">
        <p>
          Everything we publish is free to read on publication. Articles are licensed under{" "}
          <a href={journal.license.url} rel="license">
            Creative Commons Attribution 4.0
          </a>
          : anyone may share and adapt them, with credit to the authors. Authors keep their
          copyright.
        </p>
        <p>{journal.charges}.</p>
      </DocSection>

      <DocSection id="ethics" title="Publication ethics">
        <p>
          We follow the recommendations of the International Committee of Medical Journal Editors
          and the Committee on Publication Ethics core practices. In particular:
        </p>
        <ul>
          <li>Studies involving people need ethics approval and informed consent, stated in the manuscript.</li>
          <li>Trials must be registered before the first participant is enrolled.</li>
          <li>Every author declares their competing interests and funding.</li>
          <li>Use of generative AI in preparing a manuscript must be disclosed; AI tools cannot be authors.</li>
          <li>Editors and reviewers declare conflicts and step aside from manuscripts they cannot judge fairly.</li>
        </ul>
      </DocSection>

      <DocSection id="corrections" title="Corrections and retractions">
        <p>
          Errors that affect the interpretation of an article are corrected with a linked notice.
          Articles with serious flaws or misconduct are retracted, and the retraction notice
          stays linked to the original article, which remains available and clearly marked.
        </p>
      </DocSection>

      <DocSection id="independence" title="Editorial independence">
        <p>
          Editorial decisions are made by the editors alone, free from the influence of funders,
          advertisers or the publisher. Editors who submit their own work are treated like any
          other author and have no access to its review.
        </p>
      </DocSection>

      <DocSection id="contact" title="Contact">
        <p>
          Write to the editorial office at{" "}
          <a href={`mailto:${journal.contactEmail}`}>{journal.contactEmail}</a>. Authors can
          follow their submissions in the <Link href="/dashboard">author dashboard</Link>.
        </p>
      </DocSection>
    </DocPage>
  );
}
