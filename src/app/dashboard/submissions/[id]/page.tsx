import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { SubmissionWorkspace } from "@/components/dashboard/submission/workspace";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Submission" };

export default function SubmissionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubmissionWorkspace />
    </Suspense>
  );
}
