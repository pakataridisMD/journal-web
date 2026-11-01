import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AuthShell } from "@/components/site/auth-shell";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthShell title="Create an account" scene="breath">
      <SignUp />
    </AuthShell>
  );
}
