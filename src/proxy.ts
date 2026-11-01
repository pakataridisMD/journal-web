import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Sends signed-out visitors of the dashboard to sign-in before anything
 * renders. This is a convenience, not the security boundary: every Convex
 * query and mutation checks the caller's identity and role itself.
 */
export default clerkMiddleware(
  async (auth, request) => {
    if (request.nextUrl.pathname.startsWith("/dashboard")) await auth.protect();
  },
  // The journal's own sign-in pages, not Clerk's hosted ones.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
