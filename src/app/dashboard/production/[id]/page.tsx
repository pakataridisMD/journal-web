import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { PublishForm } from "@/components/dashboard/production/publish-form";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Prepare article" };

export default function PublishPage() {
  return (
    <RoleGate role="editor">
      <Suspense fallback={<PageSkeleton />}>
        <PublishForm />
      </Suspense>
    </RoleGate>
  );
}
