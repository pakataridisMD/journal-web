import { ArrowUpRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { subjectArt } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import { ArticleList } from "@/components/site/article-row";
import { OrcidId } from "@/components/site/orcid";
import { Portrait } from "@/components/site/people/portrait";
import { Skeleton } from "@/components/ui/skeleton";
import { journal } from "@/config/journal";
import { affiliationLine, orcidUrl } from "@/convex/lib/orcid";
import { LINK_KINDS, LINK_ORDER } from "@/convex/lib/profileFields";
import type { OrcidAffiliation } from "@/convex/lib/validators";
import { getProfile, getProfileHandles, type PublicProfile } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site";

const PLACEHOLDER = "__placeholder__";

export async function generateStaticParams() {
  const handles = await getProfileHandles();
  // Cache Components needs at least one param; the placeholder 404s.
  return handles.length > 0 ? handles.map((handle) => ({ handle })) : [{ handle: PLACEHOLDER }];
}

async function load(handle: string) {
  return handle === PLACEHOLDER ? null : await getProfile(handle);
}

/** "Section editor, cardiology · Reviewer", or what the person does here. */
function roleLine(profile: PublicProfile): string {
  const roles: string[] = profile.positions.map((p) => p.title);
  if (profile.isReviewer) roles.push("Reviewer");
  if (roles.length === 0 && profile.articles.length > 0) roles.push("Author");
  return roles.join(" · ");
}

function summary(profile: PublicProfile): string {
  const bio = profile.bio?.replace(/\s+/g, " ").trim();
  if (bio) return bio.length > 200 ? `${bio.slice(0, 199).trimEnd()}…` : bio;
  const role = roleLine(profile);
  return [profile.name, role ? `${role} at ${journal.name}` : `at ${journal.name}`, profile.affiliation]
    .filter(Boolean)
    .join(", ");
}

export async function generateMetadata({ params }: PageProps<"/people/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await load(handle);
  if (!profile) return { title: "Profile not found", robots: { index: false } };
  return {
    title: profile.name,
    description: summary(profile),
    alternates: { canonical: `/people/${profile.handle}` },
    openGraph: { type: "profile", title: profile.name, description: summary(profile), url: `${siteUrl}/people/${profile.handle}` },
  };
}

export default function ProfilePage({ params }: PageProps<"/people/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}

async function ProfileContent({ params }: { params: PageProps<"/people/[handle]">["params"] }) {
  const { handle } = await params;
  const profile = await load(handle);
  if (!profile) notFound();

  const role = roleLine(profile);
  const links = LINK_ORDER.flatMap((kind) => profile.links.filter((l) => l.kind === kind));
  const paragraphs = profile.bio?.split(/\n{2,}/) ?? [];
  const record = profile.orcidRecord;
  const hasCareer = record && (record.employments.length > 0 || record.educations.length > 0);

  return (
    <div className="page-container pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(profile) }} />
      <nav aria-label="Breadcrumb" className="border-b py-3">
        <Link href="/who-we-are" className="meta-label text-muted-foreground underline-offset-4 hover:underline">
          <span aria-hidden>←</span> Who we are
        </Link>
      </nav>

      <header className="grid items-end gap-x-12 gap-y-8 border-b py-10 md:py-14 lg:grid-cols-12">
        <div className="w-32 sm:w-44 lg:col-span-3 lg:w-full lg:max-w-[15rem]">
          <Portrait name={profile.name} imageUrl={profile.imageUrl} expertise={profile.expertise} />
        </div>
        <div className="min-w-0 lg:col-span-9">
          {role ? <p className="meta-label text-muted-foreground">{role}</p> : null}
          <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-[320] tracking-[-0.025em] text-balance md:text-[3rem]">
            {profile.name}
          </h1>
          {profile.credentials ? (
            <p className="mt-2 font-serif text-title text-muted-foreground">{profile.credentials}</p>
          ) : null}
          {profile.affiliation ? <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed">{profile.affiliation}</p> : null}
          {profile.orcid || links.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {profile.orcid ? (
                <OrcidId orcid={profile.orcid.id} authenticated={profile.orcid.authenticated} name={profile.name} />
              ) : null}
              {links.length > 0 ? (
                <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Profiles elsewhere">
                  {links.map((link) => (
                    <li key={link.kind}>
                      <a
                        href={link.url}
                        rel="noopener noreferrer me"
                        target="_blank"
                        className="inline-flex items-center gap-0.5 text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {LINK_KINDS[link.kind].label}
                        <ArrowUpRightIcon aria-hidden className="size-3.5 text-muted-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-x-12 gap-y-12 pt-10 lg:grid-cols-12">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          {paragraphs.length > 0 ? (
            <section aria-labelledby="about-heading">
              <SectionLabel id="about-heading">About</SectionLabel>
              <div className="mt-5 max-w-[42rem] space-y-4 font-serif text-[1.1875rem] leading-relaxed text-pretty">
                {paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {profile.articles.length > 0 ? (
            <section aria-labelledby="articles-heading">
              <SectionLabel id="articles-heading">Published in {journal.name}</SectionLabel>
              <ArticleList articles={profile.articles} showSnippet={false} />
            </section>
          ) : null}

          {record && record.works.length > 0 ? (
            <section aria-labelledby="works-heading">
              <SectionLabel id="works-heading">Selected works</SectionLabel>
              <ol className="divide-y border-b">
                {record.works.map((work, i) => (
                  <li key={i} className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[4rem_1fr]">
                    <span className="meta-label pt-1 text-muted-foreground">{work.year ?? "—"}</span>
                    <div>
                      <p className="font-serif text-[1.125rem] leading-snug">
                        {work.doi || work.url ? (
                          <a
                            href={work.doi ? `https://doi.org/${work.doi}` : work.url}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="underline-offset-4 hover:underline"
                          >
                            {work.title}
                          </a>
                        ) : (
                          work.title
                        )}
                      </p>
                      {work.journal || work.doi ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {work.journal ? <i>{work.journal}</i> : null}
                          {work.journal && work.doi ? " · " : null}
                          {work.doi ? <span className="font-mono text-[0.8125rem]">doi:{work.doi}</span> : null}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                From {profile.name}’s ORCID record, updated {formatDate(record.syncedAt)}.{" "}
                {profile.orcid && record.worksCount > record.works.length ? (
                  <a href={orcidUrl(profile.orcid.id)} rel="noopener noreferrer" target="_blank" className="text-foreground underline underline-offset-2">
                    All {record.worksCount} works on ORCID
                  </a>
                ) : null}
              </p>
            </section>
          ) : null}

          {hasCareer ? (
            <section aria-labelledby="career-heading">
              <SectionLabel id="career-heading">Career</SectionLabel>
              <div className="grid gap-x-10 gap-y-8 pt-5 md:grid-cols-2">
                {record.employments.length > 0 ? <Timeline title="Positions" items={record.employments} /> : null}
                {record.educations.length > 0 ? <Timeline title="Education" items={record.educations} /> : null}
              </div>
            </section>
          ) : null}

          {paragraphs.length === 0 && profile.articles.length === 0 && !record ? (
            <p className="border-y py-8 font-serif text-[1.0625rem] text-muted-foreground">
              {profile.name} hasn’t added more to this profile yet.
            </p>
          ) : null}
        </div>

        <aside className="lg:col-span-4" aria-label="Profile details">
          <div className="space-y-9 lg:sticky lg:top-6">
            {profile.positions.length > 0 || profile.isReviewer || profile.articles.length > 0 ? (
              <section aria-labelledby="journal-heading">
                <SectionLabel id="journal-heading">At {journal.name}</SectionLabel>
                <ul className="divide-y">
                  {profile.positions.map((p) => {
                    const glyph = p.subject ? subjectArt(p.subject)?.glyph : undefined;
                    return (
                      <li key={p.title} className="flex items-center gap-2.5 py-3 text-[0.9375rem]">
                        {glyph ? <Glyph name={glyph} className="size-5" /> : null}
                        {p.title}
                      </li>
                    );
                  })}
                  {profile.isReviewer ? <li className="py-3 text-[0.9375rem]">Reviewer</li> : null}
                  {profile.articles.length > 0 ? (
                    <li className="py-3 text-[0.9375rem]">
                      Author of {profile.articles.length} {profile.articles.length === 1 ? "article" : "articles"}
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {profile.expertise.length > 0 || profile.keywords.length > 0 ? (
              <section aria-labelledby="expertise-heading">
                <SectionLabel id="expertise-heading">Expertise</SectionLabel>
                {profile.expertise.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {profile.expertise.map((subject) => {
                      const glyph = subjectArt(subject)?.glyph;
                      return (
                        <li key={subject} className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-sm">
                          {glyph ? <Glyph name={glyph} className="-ml-0.5 size-4" /> : null}
                          {subject}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {profile.keywords.length > 0 ? (
                  <p className="mt-3 text-sm leading-relaxed">{profile.keywords.join(" · ")}</p>
                ) : null}
              </section>
            ) : null}

            {profile.metrics ? (
              <section aria-labelledby="metrics-heading">
                <SectionLabel id="metrics-heading">Research output</SectionLabel>
                <dl className="mt-3 grid grid-cols-3 divide-x border-y">
                  {[
                    { label: "Works", value: profile.metrics.worksCount },
                    { label: "Citations", value: profile.metrics.citedByCount },
                    { label: "h-index", value: profile.metrics.hIndex },
                  ].map((m) => (
                    <div key={m.label} className="px-3 py-3 first:pl-0">
                      <dt className="meta-label text-muted-foreground">{m.label}</dt>
                      <dd className="mt-1 font-serif text-title tabular-nums">
                        {m.value === undefined ? "—" : m.value.toLocaleString("en-US")}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Counted by{" "}
                  <a href={profile.metrics.openAlexId} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">
                    OpenAlex
                  </a>{" "}
                  on {formatDate(profile.metrics.syncedAt)}. Counts vary between databases.
                </p>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="meta-label border-b border-foreground pb-2.5 text-foreground">
      {children}
    </h2>
  );
}

function years(item: OrcidAffiliation) {
  if (!item.startYear && !item.endYear) return "";
  if (!item.endYear) return `${item.startYear}–`;
  if (!item.startYear || item.startYear === item.endYear) return String(item.endYear);
  return `${item.startYear}–${item.endYear}`;
}

function Timeline({ title, items }: { title: string; items: OrcidAffiliation[] }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ol className="mt-3 space-y-4 border-l pl-4">
        {items.map((item, i) => (
          <li key={i} className="relative">
            <span aria-hidden className="absolute top-1.5 -left-[1.3125rem] size-2 border border-foreground bg-background" />
            <p className="meta-label text-muted-foreground">{years(item) || "Dates not given"}</p>
            {item.role ? <p className="mt-1 text-[0.9375rem] font-medium">{item.role}</p> : null}
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{affiliationLine(item)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function jsonLd(profile: PublicProfile): string {
  const sameAs = [
    ...(profile.orcid?.authenticated ? [orcidUrl(profile.orcid.id)] : []),
    ...profile.links.map((l) => l.url),
  ];
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/people/${profile.handle}`,
    dateModified: new Date(profile.updatedAt).toISOString(),
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      ...(profile.credentials ? { honorificSuffix: profile.credentials } : {}),
      ...(profile.affiliation ? { affiliation: { "@type": "Organization", name: profile.affiliation } } : {}),
      ...(profile.positions.length > 0
        ? { jobTitle: profile.positions.map((p) => p.title).join(", "), worksFor: { "@type": "Periodical", name: journal.name } }
        : {}),
      ...(profile.expertise.length + profile.keywords.length > 0 ? { knowsAbout: [...profile.expertise, ...profile.keywords] } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
      ...(profile.orcid?.authenticated ? { identifier: { "@type": "PropertyValue", propertyID: "ORCID", value: profile.orcid.id } } : {}),
    },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function ProfileSkeleton() {
  return (
    <div className="page-container pb-24" aria-busy="true" aria-label="Loading profile">
      <div className="border-b py-3">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="grid gap-12 border-b py-10 md:py-14 lg:grid-cols-12">
        <Skeleton className="aspect-[5/6] w-32 sm:w-44 lg:col-span-3 lg:w-full lg:max-w-[15rem]" />
        <div className="space-y-4 lg:col-span-9 lg:self-end">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid gap-12 pt-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full lg:col-span-4" />
      </div>
    </div>
  );
}
