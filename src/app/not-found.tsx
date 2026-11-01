import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page-container flex-1 py-24">
        <p className="meta-label text-muted-foreground">404</p>
        <h1 className="mt-3 font-serif text-display">We couldn’t find that page.</h1>
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
      </main>
      <SiteFooter />
    </>
  );
}
