import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Addresses that match no route: the page brings its own header and footer. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
