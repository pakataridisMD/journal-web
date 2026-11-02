import Link from "next/link";
import { Scene } from "@/components/art/scene";
import { Button } from "@/components/ui/button";

/** The body of every "not found" page: a microscope over an empty slide. */
export function NotFoundContent() {
  return (
    <div className="page-container grid flex-1 items-center gap-y-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-x-12">
      <div className="lg:col-span-6">
        <p className="meta-label text-muted-foreground">404</p>
        <h1 className="mt-3 font-serif text-headline md:text-display">We couldn’t find that page.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          The link may be out of date, or the article may have moved. Try the article list or search.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/articles">Browse articles</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[30rem] lg:col-span-5 lg:col-start-8">
        <Scene name="emptySlide" draw />
      </div>
    </div>
  );
}
