"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useViewer } from "./viewer-context";

/** Renders children only for editors (or admins); others get a short explanation. */
export function RoleGate({ role, children }: { role: "editor" | "admin"; children: ReactNode }) {
  const viewer = useViewer();
  const allowed = role === "admin" ? viewer.isAdmin : viewer.isEditor;
  if (allowed) return <>{children}</>;
  return (
    <div className="max-w-2xl py-16">
      <p className="meta-label text-muted-foreground">No access</p>
      <h1 className="mt-3 font-serif text-headline text-balance">
        {role === "admin" ? "Only the editor-in-chief can open this page." : "This page is for the editors."}
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        If you should have access, ask the editor-in-chief to add the role to your account.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/dashboard">Back to the dashboard</Link>
      </Button>
    </div>
  );
}
