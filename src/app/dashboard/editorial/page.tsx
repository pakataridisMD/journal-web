import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorialQueue } from "@/components/dashboard/editorial/queue";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Editorial queue" };

export default function EditorialPage() {
  return (
    <RoleGate role="editor">
      <Suspense fallback={<PageSkeleton />}>
        <EditorialQueue />
      </Suspense>
    </RoleGate>
  );
}
