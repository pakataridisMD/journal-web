import type { AuthConfig } from "convex/server";

/**
 * Convex accepts JWTs issued by the journal's Clerk instance.
 *
 * Set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment to the Clerk Frontend
 * API URL (Clerk dashboard → Configure → API keys, e.g.
 * https://verb-noun-00.clerk.accounts.dev). See README → "Connect Clerk".
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
