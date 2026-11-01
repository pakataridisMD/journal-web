import Link from "next/link";
import { journal } from "@/config/journal";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Journal",
    links: [
      { href: "/articles", label: "All articles" },
      { href: "/issues", label: "Issue archive" },
      { href: "/about", label: "About the journal" },
      { href: "/editorial-board", label: "Editorial board" },
    ],
  },
  {
    title: "Authors and reviewers",
    links: [
      { href: "/for-authors", label: "Guide for authors" },
      { href: "/dashboard/submissions/new", label: "Submit a manuscript" },
      { href: "/about#peer-review", label: "Peer review" },
      { href: "/dashboard", label: "Sign in" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/about#open-access", label: "Open access and licensing" },
      { href: "/about#ethics", label: "Publication ethics" },
      { href: "/about#corrections", label: "Corrections and retractions" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="page-container grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo size="sm" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {journal.description}
          </p>
          <dl className="mt-6 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="meta-label pt-px text-muted-foreground">ISSN</dt>
              <dd>{journal.issnOnline}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="meta-label pt-px text-muted-foreground">Contact</dt>
              <dd>
                <a href={`mailto:${journal.contactEmail}`} className="underline-offset-4 hover:underline">
                  {journal.contactEmail}
                </a>
              </dd>
            </div>
          </dl>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="md:col-span-2 lg:col-span-2 md:col-start-auto">
            <h2 className="meta-label text-muted-foreground">{column.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="page-container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {journal.foundedYear} {journal.publisher}. Articles are published under{" "}
            <a href={journal.license.url} className="underline underline-offset-2" rel="license">
              {journal.license.name}
            </a>
            .
          </p>
          <p>{journal.reviewModel} · {journal.charges}</p>
        </div>
      </div>
    </footer>
  );
}
