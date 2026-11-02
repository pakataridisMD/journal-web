import Link from "next/link";
import { subjectArt } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import { Plate } from "@/components/art/plate";
import { journal } from "@/config/journal";
import type { BoardPosition } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Portrait } from "./portrait";

type Person = NonNullable<BoardPosition["person"]>;

/** "Ana Ruiz, MD, PhD" with the credentials set quieter. */
export function NameWithCredentials({ name, credentials }: { name: string; credentials?: string }) {
  return (
    <>
      {name}
      {credentials ? <span className="text-muted-foreground">, {credentials}</span> : null}
    </>
  );
}

/** A board member: portrait, position, name and affiliation, linking to their profile. */
export function PersonCard({
  person,
  title,
  subject,
  size = "default",
}: {
  person: Person;
  title: string;
  subject?: string;
  size?: "default" | "lg";
}) {
  const glyph = subject ? subjectArt(subject)?.glyph : undefined;
  const large = size === "lg";
  return (
    <article className={cn("group relative grid items-start gap-x-5", large ? "grid-cols-[7rem_1fr] sm:grid-cols-[10rem_1fr] sm:gap-x-8" : "grid-cols-[4.5rem_1fr]")}>
      <Portrait name={person.name} imageUrl={person.imageUrl} expertise={subject ? [subject, ...person.expertise] : person.expertise} />
      <div className="min-w-0 pt-0.5">
        <p className="meta-label flex items-center gap-1.5 text-muted-foreground">
          {glyph ? <Glyph name={glyph} className="size-4 text-foreground" /> : null}
          <span>{title}</span>
        </p>
        <h4
          className={cn(
            "mt-1.5 font-serif leading-tight tracking-[-0.01em] text-balance",
            large ? "text-title md:text-headline" : "text-[1.3125rem]",
          )}
        >
          {person.handle ? (
            <Link
              href={`/people/${person.handle}`}
              className="decoration-1 underline-offset-[5px] after:absolute after:inset-0 group-hover:underline"
            >
              <NameWithCredentials name={person.name} credentials={person.credentials} />
            </Link>
          ) : (
            <NameWithCredentials name={person.name} credentials={person.credentials} />
          )}
        </h4>
        {person.affiliation ? (
          <p className={cn("mt-1.5 leading-snug text-muted-foreground", large ? "text-[0.9375rem]" : "text-sm")}>
            {person.affiliation}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** A position the journal is still recruiting for. */
export function OpenPosition({ title, subject }: { title: string; subject?: string }) {
  const art = subject ? subjectArt(subject) : undefined;
  return (
    <article className="grid grid-cols-[4.5rem_1fr] items-start gap-x-5">
      <div className="border border-dashed border-input/70 bg-background">
        {art ? (
          <Plate glyph={art.glyph} tone="bone" width={72} height={86} scale={0.62} stroke={2} inset={0.1} />
        ) : (
          <div className="flex aspect-[5/6] items-center justify-center font-serif text-[1.75rem] font-light text-muted-foreground">
            ?
          </div>
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="meta-label text-muted-foreground">Open position</p>
        <h4 className="mt-1.5 font-serif text-[1.3125rem] leading-tight tracking-[-0.01em] text-muted-foreground">{title}</h4>
        <p className="mt-1.5 text-sm">
          <a
            href={`mailto:${journal.contactEmail}?subject=${encodeURIComponent(title)}`}
            className="underline underline-offset-2 hover:decoration-2"
          >
            Express interest
          </a>
        </p>
      </div>
    </article>
  );
}
