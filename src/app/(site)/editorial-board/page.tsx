import type { Metadata } from "next";
import { DocPage, DocSection } from "@/components/site/doc-page";
import { journal } from "@/config/journal";

export const metadata: Metadata = {
  title: "Editorial board",
  description: `The editors of ${journal.name}.`,
};

/** Replace with the real board as appointments are made. */
const BOARD = [
  { id: "chief", label: "Editor-in-chief", roles: ["Editor-in-chief"] },
  { id: "deputy", label: "Deputy editors", roles: ["Deputy editor, clinical research", "Deputy editor, reviews and education"] },
  {
    id: "section",
    label: "Section editors",
    roles: ["Cardiology", "Emergency medicine", "General practice", "Infectious diseases", "Oncology", "Pediatrics"],
  },
  { id: "methods", label: "Methods", roles: ["Statistical editor", "Research integrity editor"] },
] as const;

export default function EditorialBoardPage() {
  return (
    <DocPage
      eyebrow="People"
      title="Editorial board"
      lede="Editors handle manuscripts in their field, choose reviewers and make decisions. Every editor sees patients or teaches clinicians."
      sections={[...BOARD.map((b) => ({ id: b.id, label: b.label })), { id: "join", label: "Join us" }]}
    >
      {BOARD.map((group) => (
        <DocSection key={group.id} id={group.id} title={group.label}>
          <ul className="!list-none !space-y-0 divide-y border-y !pl-0">
            {group.roles.map((role) => (
              <li key={role} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 !pl-0">
                <span className="font-medium">{role}</span>
                <span className="meta-label text-muted-foreground">Appointment pending</span>
              </li>
            ))}
          </ul>
        </DocSection>
      ))}
      <DocSection id="join" title="Join us">
        <p>
          We are recruiting section editors and reviewers. If you would like to help build a
          journal for practicing clinicians, write to{" "}
          <a href={`mailto:${journal.contactEmail}`}>{journal.contactEmail}</a> with a short note on
          your field and experience.
        </p>
      </DocSection>
    </DocPage>
  );
}
