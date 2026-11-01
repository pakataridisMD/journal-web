import type { Metadata } from "next";
import { ProductionOverview } from "@/components/dashboard/production/production-overview";
import { RoleGate } from "@/components/dashboard/role-gate";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Production" };

export default function ProductionPage() {
  return (
    <RoleGate role="editor">
      <ProductionOverview />
    </RoleGate>
  );
}
