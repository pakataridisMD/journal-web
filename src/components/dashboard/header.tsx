"use client";

import { ClerkLoaded, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/site/logo";

export function DashboardHeader() {
  return (
    <header className="border-b">
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo size="sm" />
          <span className="meta-label hidden border-l pl-4 text-muted-foreground sm:inline">Dashboard</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/" className="text-sm underline-offset-4 hover:underline">
            Journal site
          </Link>
          <div className="flex size-8 items-center justify-center">
            <ClerkLoaded>
              <UserButton />
            </ClerkLoaded>
          </div>
        </div>
      </div>
    </header>
  );
}
