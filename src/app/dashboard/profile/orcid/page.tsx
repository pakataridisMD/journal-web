import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { OrcidCallback } from "@/components/dashboard/profile/orcid-callback";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Connect ORCID" };

/** ORCID sends people here after they sign in there (the registered redirect URI). */
export default function OrcidCallbackPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Connecting your ORCID record…" />}>
      <OrcidCallback />
    </Suspense>
  );
}
