import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AuthShell } from "@/components/site/auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <AuthShell title="Sign in">
      <SignIn />
    </AuthShell>
  );
}
