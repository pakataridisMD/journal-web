"use client";

import { ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function SignInLink() {
  return (
    <Link
      href="/sign-in"
      className="text-sm font-medium underline-offset-4 hover:underline"
    >
      Sign in
    </Link>
  );
}

/** Auth controls run in the browser so public pages stay static. */
export function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <ClerkLoading>
        <SignInLink />
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-out">
          <SignInLink />
        </Show>
        <Show when="signed-in">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <UserButton />
        </Show>
      </ClerkLoaded>
    </div>
  );
}
