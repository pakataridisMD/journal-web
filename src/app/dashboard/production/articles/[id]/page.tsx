import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { ArticleEditor } from "@/components/dashboard/production/article-editor";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Edit article" };

export default function EditArticlePage() {
  return (
    <RoleGate role="editor">
      <Suspense fallback={<PageSkeleton />}>
        <ArticleEditor />
      </Suspense>
    </RoleGate>
  );
}
