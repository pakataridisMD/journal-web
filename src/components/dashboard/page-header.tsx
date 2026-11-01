import type { ReactNode } from "react";
import type { Art } from "@/components/art/catalog";
import { Plate } from "@/components/art/plate";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b py-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="meta-label text-pretty text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="mt-2 font-serif text-headline text-balance">{title}</h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  art,
  children,
  action,
}: {
  title: string;
  /** A small plate above the title, chosen to suit the page. */
  art?: Art;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed px-6 py-12 text-center">
      {art ? (
        <div className="mx-auto mb-5 w-32">
          <Plate glyph={art.glyph} tone={art.tone} width={128} height={96} scale={0.68} stroke={2.4} />
        </div>
      ) : null}
      <p className="font-serif text-title">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
