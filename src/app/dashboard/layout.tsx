import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell, ShellSkeleton } from "@/components/dashboard/shell";
import { journal } from "@/config/journal";

/**
 * The dashboard renders in the browser once the person is signed in, so the
 * server can't render its pages to check them for instant navigation. Each
 * dashboard page opts out too; navigations still show skeletons immediately.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Dashboard", template: `%s · ${journal.name}` },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader />
      <Suspense fallback={<ShellSkeleton />}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </div>
  );
}
