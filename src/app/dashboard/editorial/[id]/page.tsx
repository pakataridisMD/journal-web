import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorWorkspace } from "@/components/dashboard/editorial/workspace";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Manuscript" };

export default function EditorialManuscriptPage() {
  return (
    <RoleGate role="editor">
      <Suspense fallback={<PageSkeleton />}>
        <EditorWorkspace />
      </Suspense>
    </RoleGate>
  );
}
