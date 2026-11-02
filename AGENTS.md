<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This project

- Start with `README.md`. Run `npm run check` (types, lint, tests) before committing; `npm run build` also needs `NEXT_PUBLIC_CONVEX_URL`.
- Permissions are enforced in the Convex functions (`convex/lib/auth.ts`, `convex/lib/manuscripts.ts` and each query and mutation). Hiding something in the UI is never the check.
- `src/config/journal.ts` is imported by both Next.js and Convex, so keep it pure data.
- What the public sees of a person is built only in `convex/lib/profiles.ts` (`personCard`, `publicProfile`): never an email address, review activity or ORCID token. Profiles are hidden unless their owner makes them public or they hold a board position. After a profile or board change, call `refreshPeople` in `src/app/actions.ts`.
- Dashboard pages render in the browser after sign-in and export `instant = false`; public pages are server-rendered with `'use cache'` and refreshed by `refreshPublicContent` in `src/app/actions.ts`.
- `next build` prerenders the public pages by querying Convex, so the Convex functions must be deployed before the site builds. Keep the Vercel build command as `npx convex deploy && npx convex deploy --cmd 'npm run build'` (README → Deploy), and keep build-time queries working on an empty database.
- Design rules (a modern anatomical atlas; `/style-guide` shows it all): warm paper canvas (`--paper`), near-black ink (`--ink`), hairline borders, no shadows, square controls, 8px `rounded-card` panels. The vermillion `brand` button variant is only for the one primary action on a page (and the active nav marker and logo mark). Newsreader for titles and reading text, set light at display sizes; Schibsted Grotesk for UI; Plex Mono `meta-label` for labels.
- Illustration lives in `src/components/art/` as path data rendered by `<Glyph>` (line icon in the text colour), `<Plate>` (glyph on a cut-paper field) and `<Scene>` (the five larger drawings). `catalog.ts` gives every subject and article type a glyph and plate tone, so a new subject in `src/config/journal.ts` needs an entry there (the typecheck fails without one). The `--plate-*` tones are for illustrations only, never text, controls, status or surfaces. Lucide icons stay for UI controls; glyphs are for subject matter. New art keeps the same grammar (grainy field, paper cut-out printed off-register, round-capped ink line) and is drawn for the journal, never traced from someone else's.
- Cover images (the full-bleed pictures on the home page and sign-in) are public-domain works from The Met's Open Access collection (CC0), listed in `src/components/site/cover-images.ts` with their files in `src/assets/images/` (cropped to the artwork, 2000px wide). Show the credit (`<CoverCredit>`) wherever one appears, and only add works that are public domain or CC0. Pick historical science or natural history that sits with the atlas look.
