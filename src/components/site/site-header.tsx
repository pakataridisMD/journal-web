import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "./auth-buttons";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavList } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="page-container flex h-[72px] items-center justify-between gap-6">
        <Logo />
        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden md:block">
            <AuthButtons />
          </div>
          <Button asChild variant="brand" className="hidden sm:inline-flex">
            <Link href="/dashboard/submissions/new">Submit a manuscript</Link>
          </Button>
          <MobileMenu />
        </div>
      </div>
      <nav aria-label="Main" className="hidden border-t md:block">
        <div className="page-container flex items-center justify-between">
          <Suspense fallback={<NavList pathname={null} />}>
            <NavLinks />
          </Suspense>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Search articles">
            <Link href="/articles#search">
              <SearchIcon />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
