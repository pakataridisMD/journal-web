import type { Metadata } from "next";
import { ProfileForm } from "@/components/dashboard/profile-form";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileForm />;
}
