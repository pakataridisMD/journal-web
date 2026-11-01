"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { errorCode, errorMessage } from "@/lib/errors";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = errorCode(error);
  const missing = code === "NOT_FOUND" || (error instanceof Error && /ArgumentValidationError|Invalid ID|not a valid ID/i.test(error.message));
  const forbidden = code === "FORBIDDEN";

  return (
    <div className="max-w-2xl py-16">
      <p className="meta-label text-muted-foreground">
        {missing ? "Not found" : forbidden ? "No access" : "Something went wrong"}
      </p>
      <h1 className="mt-3 font-serif text-headline text-balance">
        {missing
          ? "We couldn't find that page."
          : forbidden
            ? "This page isn't available to your account."
            : "This page didn't load."}
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {missing
          ? "It may have been deleted, or the link may be incomplete."
          : errorMessage(error)}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {!missing && !forbidden ? <Button onClick={() => retry()}>Try again</Button> : null}
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
