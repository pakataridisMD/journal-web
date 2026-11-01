import type { Metadata } from "next";
import { Overview } from "@/components/dashboard/overview";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <Overview />;
}
