import type { Metadata } from "next";
import { IssuesAdmin } from "@/components/dashboard/admin/issues-admin";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Issues" };

export default function IssuesAdminPage() {
  return (
    <RoleGate role="admin">
      <IssuesAdmin />
    </RoleGate>
  );
}
