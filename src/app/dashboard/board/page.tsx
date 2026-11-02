import type { Metadata } from "next";
import { BoardAdmin } from "@/components/dashboard/admin/board-admin";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Editorial board" };

export default function BoardAdminPage() {
  return (
    <RoleGate role="admin">
      <BoardAdmin />
    </RoleGate>
  );
}
