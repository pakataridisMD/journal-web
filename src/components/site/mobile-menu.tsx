"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { journal } from "@/config/journal";
import { MobileNavList } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open menu" className="md:hidden">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm gap-0 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-serif text-xl font-medium">{journal.name}</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="px-5">
          <MobileNavList onNavigate={() => setOpen(false)} />
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t p-5">
          <Button asChild variant="brand" size="lg">
            <Link href="/dashboard/submissions/new" onClick={() => setOpen(false)}>
              Submit a manuscript
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Author, reviewer and editor sign-in
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
