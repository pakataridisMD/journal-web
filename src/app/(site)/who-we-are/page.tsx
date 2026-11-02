import type { Metadata } from "next";
import Link from "next/link";
import { Glyph } from "@/components/art/glyph";
import type { GlyphName } from "@/components/art/glyph-paths";
import { Plate } from "@/components/art/plate";
import { NameWithCredentials, OpenPosition, PersonCard } from "@/components/site/people/person-card";
import { PlateCluster } from "@/components/site/people/plate-cluster";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { boardGroupOrder, boardGroups, journal } from "@/config/journal";
import { getBoard, getListedReviewers, type BoardPosition, type PersonCard as Person } from "@/lib/data";

export const metadata: Metadata = {
  title: "Who we are",
  description: `The mission, editors and reviewers of ${journal.name}.`,
  alternates: { canonical: "/who-we-are" },
};

/** Draft wording; edit freely. */
const MISSION =
  "We publish the research that changes what happens at the bedside, and we review it the way we would want our own work reviewed: carefully, quickly and in the open.";

const PRINCIPLES: readonly { glyph: GlyphName; title: string; text: string }[] = [
  {
    glyph: "general-practice",
    title: "Questions from the clinic",
    text: "We look for studies that answer questions clinicians face, from any setting, judged on the question and the methods rather than where the work was done.",
  },
  {
    glyph: "review",
    title: "Review by people who practice",
    text: "Every manuscript is read by an editor in its field and by reviewers who see patients. Review is double-blind.",
  },
  {
    glyph: "short-communication",
    title: "Decisions you can plan around",
    text: "A first decision within 30 days of submission, and a clear reason with every decision we send.",
  },
  {
    glyph: "public-health",
    title: "Open to everyone",
    text: `Free to read and free to publish. Articles are licensed under ${journal.license.name}, and authors keep their copyright.`,
  },
];

const ON_THIS_PAGE = [
  { id: "mission", label: "Mission" },
  { id: "editorial-board", label: "Editorial board" },
  { id: "reviewers", label: "Reviewers" },
  { id: "how-we-work", label: "How we work" },
  { id: "join", label: "Join us" },
] as const;

export default async function WhoWeArePage() {
  const [board, reviewers] = await Promise.all([getBoard(), getListedReviewers()]);
  const groups = boardGroupOrder
    .map((key) => ({ key, ...boardGroups[key], positions: board.positions.filter((p) => p.group === key) }))
    .filter((g) => g.positions.length > 0);
  const openCount = board.positions.filter((p) => !p.person).length;

  return (
    <div className="page-container pb-24">
      <header className="grid items-center gap-x-12 gap-y-10 border-b py-10 md:py-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="meta-label text-muted-foreground">Who we are</p>
          <h1 className="mt-3 max-w-3xl font-serif text-headline md:text-display">
            Clinicians, editing for clinicians
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-relaxed text-pretty">
            {journal.name} is run by doctors who see patients. These are the people who choose what
            we publish, the reviewers who check it, and the principles they work to.
          </p>
          <nav aria-label="On this page" className="mt-8">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {ON_THIS_PAGE.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
          <PlateCluster />
        </div>
      </header>

      <section id="mission" aria-labelledby="mission-heading" className="scroll-mt-6 grid gap-x-12 gap-y-10 border-b py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="mission-heading" className="meta-label text-muted-foreground">
            Our mission
          </h2>
          <p className="mt-4 font-serif text-title leading-snug text-pretty md:text-[1.75rem] md:leading-[1.3]">{MISSION}</p>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:col-span-7">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="border-t pt-5 pb-7">
              <Glyph name={p.glyph} className="size-8" />
              <h3 className="mt-4 font-medium">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="editorial-board" aria-labelledby="board-heading" className="scroll-mt-6 pt-12 md:pt-16">
        <SectionHeading id="board-heading" href="#join" linkLabel={openCount > 0 ? `${openCount} open ${openCount === 1 ? "position" : "positions"}` : "Join us"}>
          Editorial board
        </SectionHeading>
        {!board.configured ? (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The journal is new and its first editors are being appointed. These are the positions we
            are filling.
          </p>
        ) : null}
        <div className="divide-y">
          {groups.map((group) => (
            <BoardGroup key={group.key} label={group.label} description={group.description} positions={group.positions} lead={group.key === "chief"} />
          ))}
        </div>
      </section>

      <section id="reviewers" aria-labelledby="reviewers-heading" className="scroll-mt-6 pt-12 md:pt-16">
        <SectionHeading id="reviewers-heading">Our reviewers</SectionHeading>
        <div className="grid gap-x-12 gap-y-8 py-8 lg:grid-cols-12">
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground lg:col-span-3">
            Peer review is the most important work done for the journal. We thank everyone who
            reviews for us; those who agree are named here.
          </p>
          <div className="lg:col-span-9">
            {reviewers.length > 0 ? (
              <ReviewerList reviewers={reviewers} />
            ) : (
              <p className="border-y py-6 font-serif text-[1.0625rem] text-muted-foreground">
                Our first reviewers will be thanked here. Reviewers can choose to be named from their
                profile.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="how-we-work" aria-labelledby="how-heading" className="scroll-mt-6 pt-8 md:pt-12">
        <SectionHeading id="how-heading" href="/about" linkLabel="Policies in full">
          How we work
        </SectionHeading>
        <dl className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { term: "Peer review", detail: `${journal.reviewModel}. Editors never handle or review their own work.`, href: "/about#peer-review" },
            { term: "Independence", detail: "Decisions are made by the editors alone, free of funders, advertisers and the publisher.", href: "/about#independence" },
            { term: "Ethics", detail: "We follow ICMJE recommendations and COPE core practices, and correct the record openly.", href: "/about#ethics" },
            { term: "Access", detail: `${journal.charges}. Everything is free to read under ${journal.license.name}.`, href: "/about#open-access" },
            { term: "Conflicts of interest", detail: "Editors and reviewers declare their interests and step aside when they can't judge fairly.", href: "/about#ethics" },
            { term: "Publisher", detail: `${journal.publisher}. ISSN ${journal.issnOnline.toLowerCase()}.`, href: "/about#contact" },
          ].map((item) => (
            <div key={item.term} className="border-b py-5">
              <dt className="meta-label text-muted-foreground">{item.term}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed">
                {item.detail}{" "}
                <Link href={item.href} className="whitespace-nowrap underline underline-offset-2">
                  More
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="join" aria-labelledby="join-heading" className="scroll-mt-6 pt-12 md:pt-16">
        <div className="grid items-center gap-x-12 gap-y-8 rounded-card border bg-card p-6 md:p-10 lg:grid-cols-12">
          <div className="mx-auto w-full max-w-[16rem] lg:col-span-3 lg:max-w-none">
            <Plate glyph="medical-education" tone="nerve" width={240} height={200} scale={0.58} />
          </div>
          <div className="lg:col-span-8 lg:col-start-5">
            <p className="meta-label text-muted-foreground">Join us</p>
            <h2 id="join-heading" className="mt-3 font-serif text-headline">
              Review or edit with us
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed">
              We are recruiting section editors and reviewers who practice what they review. Create a
              profile with your areas of expertise and connect your ORCID iD, so editors can find you
              when a manuscript in your field arrives. To apply for an editorial position, write to{" "}
              <a href={`mailto:${journal.contactEmail}`} className="underline underline-offset-2">
                {journal.contactEmail}
              </a>
              .
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="brand">
                <Link href="/dashboard/profile">Create your profile</Link>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${journal.contactEmail}?subject=${encodeURIComponent("Editorial positions")}`}>
                  Email the editorial office
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BoardGroup({
  label,
  description,
  positions,
  lead,
}: {
  label: string;
  description: string;
  positions: BoardPosition[];
  lead: boolean;
}) {
  return (
    <div className="grid gap-x-12 gap-y-6 py-8 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <h3 className="font-serif text-title">{label}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ul className={lead ? "grid gap-8 lg:col-span-9" : "grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3"}>
        {positions.map((position) => (
          <li key={position._id}>
            {position.person ? (
              <PersonCard person={position.person} title={position.title} subject={position.subject} size={lead ? "lg" : "default"} />
            ) : (
              <OpenPosition title={position.title} subject={position.subject} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewerList({ reviewers }: { reviewers: Person[] }) {
  return (
    <ul className="columns-1 gap-x-10 border-t sm:columns-2 xl:columns-3">
      {reviewers.map((person) => (
        <li key={person.userId} className="break-inside-avoid border-b py-3">
          <p className="font-serif text-[1.0625rem] leading-snug">
            {person.handle ? (
              <Link href={`/people/${person.handle}`} className="underline-offset-4 hover:underline">
                <NameWithCredentials name={person.name} credentials={person.credentials} />
              </Link>
            ) : (
              <NameWithCredentials name={person.name} credentials={person.credentials} />
            )}
          </p>
          {person.affiliation ? <p className="mt-0.5 text-sm text-muted-foreground">{person.affiliation}</p> : null}
        </li>
      ))}
    </ul>
  );
}
