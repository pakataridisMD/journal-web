import type { ReactNode } from "react";

/**
 * Policy and guidance pages: ruled header, in-page index, readable column.
 * `art` (usually a <Scene>) sits beside the header on wide screens.
 */
export function DocPage({
  eyebrow,
  title,
  lede,
  sections,
  children,
  aside,
  art,
}: {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  sections: readonly { id: string; label: string }[];
  children: ReactNode;
  aside?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <div className="page-container pb-24">
      <header className="grid items-center gap-x-12 border-b py-10 md:py-14 lg:grid-cols-12">
        <div className={art ? "lg:col-span-7" : "lg:col-span-12"}>
          <p className="meta-label text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl font-serif text-headline md:text-display">{title}</h1>
          {lede ? (
            <div className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-relaxed text-pretty">{lede}</div>
          ) : null}
        </div>
        {art ? <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">{art}</div> : null}
      </header>
      <div className="grid gap-12 pt-10 lg:grid-cols-12">
        <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-6">
            <p className="meta-label text-muted-foreground">On this page</p>
            <ul className="mt-4 space-y-2.5 border-l pl-4">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm underline-offset-4 hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            {aside ? <div className="mt-10">{aside}</div> : null}
          </div>
        </nav>
        <div className="min-w-0 lg:col-span-8 lg:col-start-5">{children}</div>
      </div>
    </div>
  );
}

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6 border-t border-foreground pt-5 pb-12 first:border-t-0 first:pt-0">
      <h2 id={`${id}-heading`} className="font-serif text-title md:text-headline">
        {title}
      </h2>
      <div className="mt-5 max-w-[42rem] space-y-4 leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
