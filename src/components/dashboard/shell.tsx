"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { errorCode, errorMessage } from "@/lib/errors";
import { SidebarNav, TopNav } from "./nav";
import { ViewerContext } from "./viewer-context";

/**
 * Signs the person into Convex, makes sure their user row exists, then
 * renders the dashboard with navigation for the roles they hold.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);
  const [syncError, setSyncError] = useState<unknown>(null);
  const [synced, setSynced] = useState(false);
  const viewer = useQuery(api.users.me, isAuthenticated && synced ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    ensure({})
      .then(() => !cancelled && setSynced(true))
      .catch((e) => !cancelled && setSyncError(e));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ensure]);

  let body: ReactNode;
  if (syncError) {
    body = <SyncProblem error={syncError} />;
  } else if (!isLoading && !isAuthenticated) {
    body = <SignedOut />;
  } else if (!viewer) {
    body = <ShellSkeleton />;
  } else {
    body = (
      <ViewerContext.Provider value={viewer}>
        <div className="page-container grid flex-1 gap-8 lg:grid-cols-[13rem_1fr] lg:gap-12">
          <aside className="hidden border-r py-8 pr-6 lg:block">
            <SidebarNav viewer={viewer} />
          </aside>
          <div className="min-w-0 pb-20">
            <TopNav viewer={viewer} />
            {children}
          </div>
        </div>
      </ViewerContext.Provider>
    );
  }

  return body;
}

export function ShellSkeleton() {
  return (
    <div className="page-container grid flex-1 gap-12 py-8 lg:grid-cols-[13rem_1fr]" aria-busy="true">
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="page-container py-24">
      <h1 className="font-serif text-headline">Sign in to continue</h1>
      <p className="mt-3 text-muted-foreground">Your session has ended.</p>
      <Button asChild className="mt-6">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}

function SyncProblem({ error }: { error: unknown }) {
  const setup = errorCode(error) === "SETUP_REQUIRED";
  return (
    <div className="page-container max-w-2xl py-24">
      <p className="meta-label text-destructive">{setup ? "Setup needed" : "Couldn't load your account"}</p>
      <h1 className="mt-3 font-serif text-headline">
        {setup ? "The sign-in token is missing your email." : "Something went wrong."}
      </h1>
      <p className="mt-4 leading-relaxed">{errorMessage(error)}</p>
      <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
