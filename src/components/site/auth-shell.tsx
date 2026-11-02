import { Suspense, type ReactNode } from "react";
import { motion } from "@/components/motion/motion";
import { journal } from "@/config/journal";
import { CoverCredit, CoverImage } from "./cover-image";
import type { CoverName } from "./cover-images";
import { Logo } from "./logo";

/**
 * Frame for Clerk's sign-in and sign-up forms. A cover image fills the left
 * half on wide screens, with the journal's label pinned to it, and becomes a
 * band above the form on small ones. The image develops as the page opens,
 * and the label is laid on it.
 */
export function AuthShell({
  title,
  cover = "forearms",
  children,
}: {
  title: string;
  cover?: CoverName;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <CoverImage
        name={cover}
        sizes="(min-width: 1024px) 50vw, 100vw"
        preload
        develop
        className="h-48 border-b sm:h-64 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0"
      >
        <div className="absolute top-4 left-4 bg-background px-3 py-2.5 lg:top-8 lg:left-8">
          <Logo />
        </div>
        <div
          className="absolute bottom-8 left-8 hidden max-w-md rounded-card border bg-background p-7 lg:block"
          {...motion("rise", 360)}
        >
          <p className="meta-label text-muted-foreground">{journal.reviewModel}</p>
          <p className="mt-3 font-serif text-headline">One account for authors, reviewers and editors.</p>
          <p className="mt-3 text-sm text-muted-foreground">{journal.charges}</p>
          <CoverCredit name={cover} className="mt-5 border-t pt-3 text-muted-foreground" />
        </div>
      </CoverImage>
      <main className="flex flex-col items-center px-6 pt-10 pb-8 lg:justify-center lg:p-10">
        <h1 className="sr-only">{title}</h1>
        {/* Clerk's forms read the URL, so they render in the browser. */}
        <Suspense fallback={<FormPlaceholder />}>{children}</Suspense>
        {/* On wide screens the credit sits on the label beside the form. */}
        <CoverCredit name={cover} className="mt-auto max-w-[25rem] pt-12 text-center text-muted-foreground lg:hidden" />
      </main>
    </div>
  );
}

function FormPlaceholder() {
  return <div aria-busy="true" aria-label="Loading" className="h-[30rem] w-full max-w-[25rem] rounded-card border" />;
}
