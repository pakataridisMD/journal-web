import type { Metadata } from "next";
import { NewSubmission } from "@/components/dashboard/submission/new-submission";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "New submission" };

export default function NewSubmissionPage() {
  return <NewSubmission />;
}
