import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Convex functions run in a V8 isolate; edge-runtime is the closest match.
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
