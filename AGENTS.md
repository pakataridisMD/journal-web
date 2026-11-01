<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This project

- Start with `README.md`. Run `npm run check` (types, lint, tests) before committing; `npm run build` also needs `NEXT_PUBLIC_CONVEX_URL`.
- Permissions are enforced in the Convex functions (`convex/lib/auth.ts`, `convex/lib/manuscripts.ts` and each query and mutation). Hiding something in the UI is never the check.
- `src/config/journal.ts` is imported by both Next.js and Convex, so keep it pure data.
- Dashboard pages render in the browser after sign-in and export `instant = false`; public pages are server-rendered with `'use cache'` and refreshed by `refreshPublicContent` in `src/app/actions.ts`.
- `next build` prerenders the public pages by querying Convex, so the Convex functions must be deployed before the site builds. Keep the Vercel build command as `npx convex deploy && npx convex deploy --cmd 'npm run build'` (README → Deploy), and keep build-time queries working on an empty database.
- Design rules: white canvas, black ink, hairline borders, no shadows, square controls, 8px `rounded-card` panels. The vermillion `brand` button variant is only for the one primary action on a page (and the active nav marker). Newsreader for titles and reading text, IBM Plex Sans for UI, Plex Mono `meta-label` for labels.
