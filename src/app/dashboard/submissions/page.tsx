import type { Metadata } from "next";
import { SubmissionsList } from "@/components/dashboard/submission/submissions-list";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "My submissions" };

export default function SubmissionsPage() {
  return <SubmissionsList />;
}
