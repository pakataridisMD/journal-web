import { Suspense, type ReactNode } from "react";
import { journal } from "@/config/journal";
import { Logo } from "./logo";

/** Frame for Clerk's sign-in and sign-up forms. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r bg-muted p-10 lg:flex">
        <Logo />
        <div>
          <p className="meta-label text-muted-foreground">{journal.reviewModel}</p>
          <p className="mt-4 max-w-md font-serif text-headline">
            One account for authors, reviewers and editors.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{journal.charges}</p>
      </div>
      <main className="flex flex-col items-center justify-center gap-8 p-6">
        <div className="lg:hidden">
          <Logo />
        </div>
        <h1 className="sr-only">{title}</h1>
        {/* Clerk's forms read the URL, so they render in the browser. */}
        <Suspense fallback={<FormPlaceholder />}>{children}</Suspense>
      </main>
    </div>
  );
}

function FormPlaceholder() {
  return <div aria-busy="true" aria-label="Loading" className="h-[30rem] w-full max-w-[25rem] rounded-card border" />;
}
