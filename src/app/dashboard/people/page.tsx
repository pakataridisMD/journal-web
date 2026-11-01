import type { Metadata } from "next";
import { PeopleAdmin } from "@/components/dashboard/admin/people-admin";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "People and roles" };

export default function PeoplePage() {
  return (
    <RoleGate role="admin">
      <PeopleAdmin />
    </RoleGate>
  );
}
