import type { PublicArticle } from "@/lib/data";

/** Label | text rows, the way structured abstracts are read: by section. */
export function StructuredAbstract({
  sections,
}: {
  sections: PublicArticle["abstractSections"];
}) {
  const structured = sections.length > 1;
  return (
    <section aria-labelledby="abstract-heading" className="border-y border-foreground">
      <h2 id="abstract-heading" className="meta-label py-3 text-foreground">
        Abstract
      </h2>
      <dl className="divide-y border-t">
        {sections.map((section) => (
          <div
            key={section.label}
            className={structured ? "grid gap-1.5 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-6" : "py-4"}
          >
            {structured ? (
              <dt className="meta-label pt-1 text-muted-foreground">{section.label}</dt>
            ) : (
              <dt className="sr-only">{section.label}</dt>
            )}
            <dd className="font-serif text-[1.125rem] leading-relaxed text-pretty">{section.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
