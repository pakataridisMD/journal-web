# The Journal

The website and editorial system for a peer-reviewed, open-access general medicine journal: a public site for readers, and a dashboard where authors submit, reviewers report, and editors decide and publish.

"The Journal" is a placeholder. The name, manuscript ID prefix, article types, subjects and file rules all live in [`src/config/journal.ts`](src/config/journal.ts), so renaming is a one-file change.

Built with Next.js 16 (App Router, Cache Components), Clerk, Convex, Tailwind CSS 4 and shadcn/ui.

## What it does

**Public site.** Home page with featured and latest articles and the current issue; an article list with type filters and full-text search; article pages with the structured abstract, body, references, a citation to copy, peer review dates and a PDF download; an issue archive; about, editorial board and author guidelines pages; a sitemap and robots file.

**Dashboard** (sign-in required). What people see depends on their roles:

| Role | Can |
| --- | --- |
| Author (everyone) | Submit through a five-step wizard that saves as they type: details, authors, files, declarations, final check. Follow the status, read decision letters with the reviewers' comments, revise and resubmit, withdraw. |
| Reviewer | Accept or decline invitations, open the anonymized files, write a report (recommendation, four scores, comments to the authors, confidential comments to the editor) that saves as they type. |
| Editor | Work the editorial queue, take manuscripts, invite reviewers (existing accounts or new people), follow reports, send decisions from letter templates, prepare accepted manuscripts for publication and edit published articles. |
| Editor-in-chief | Everything editors can, plus assign manuscripts to editors, manage volumes and issues, and give people roles. |

Peer review is double-blind. Reviewers never see the title page or author names, and authors see reviewers only as "Reviewer 1", "Reviewer 2", after a decision. Editors can't handle or review a manuscript they wrote.

A manuscript moves through: draft → submitted → under review → revision requested (a revision becomes the next version) → accepted → published, or rejected or withdrawn. Sending a decision closes open review invitations. Every step is recorded in the manuscript's history.

## Run it locally

You need Node.js 20 or newer, a [Clerk](https://clerk.com) account and a [Convex](https://convex.dev) account (both have free tiers).

1. Install dependencies.

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. Start Convex in its own terminal and leave it running. The first run asks you to log in and create a project, then writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

   ```bash
   npx convex dev
   ```

3. Connect Clerk (next section).

4. Make yourself editor-in-chief, using the email you will sign in with:

   ```bash
   npx convex env set JOURNAL_ADMIN_EMAILS you@example.org
   ```

5. Start the site and open http://localhost:3000.

   ```bash
   npm run dev
   ```

6. Optional: add sample articles and issues to preview the public site. Every sample says it is a sample. Run this on development deployments only.

   ```bash
   npm run seed
   ```

## Connect Clerk

1. In the [Clerk dashboard](https://dashboard.clerk.com), create an application with email sign-in. Keep email verification on (the default): invited reviewers are matched to accounts by email, so the app only accepts verified addresses.

2. Copy the keys from the **API keys** page into `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

3. Give Convex a token it trusts, with the person's email in it. Use one of these:

   - **JWT template (simplest).** On the **JWT templates** page, create a template from the **Convex** preset and keep its name, `convex`. The preset already includes `email`, `email_verified` and `name`.
   - **Convex integration.** If you activate Clerk's Convex integration instead, Convex receives the session token, so add the claims to it on the **Sessions** page, under **Customize session token**:

     ```json
     {
       "email": "{{user.primary_email_address}}",
       "email_verified": "{{user.email_verified}}",
       "name": "{{user.full_name}}",
       "picture": "{{user.image_url}}"
     }
     ```

   If the email claims are missing, the dashboard says so after you sign in.

4. Tell Convex who issues the tokens. The value is your Clerk Frontend API URL, shown on the **API keys** page and as the template's issuer:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   ```

The app uses its own `/sign-in` and `/sign-up` pages and sends people to the dashboard afterwards; that is set in code, so there is nothing to configure for it.

## Environment variables

| Name | Set in | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local`, Vercel | Convex deployment URL. Written by `npx convex dev`; set by `npx convex deploy` during Vercel builds. |
| `CONVEX_DEPLOYMENT` | `.env.local` | Development deployment name, written by `npx convex dev`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local`, Vercel | Clerk publishable key. |
| `CLERK_SECRET_KEY` | `.env.local`, Vercel | Clerk secret key. |
| `NEXT_PUBLIC_SITE_URL` | `.env.local`, Vercel | Public address for the sitemap, citations and link previews. On Vercel it defaults to the production domain. |
| `CONVEX_DEPLOY_KEY` | Vercel | Production deploy key from the Convex dashboard, so builds can deploy the functions. |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Clerk Frontend API URL (see above). |
| `JOURNAL_ADMIN_EMAILS` | Convex | Comma-separated emails that become editors-in-chief when they sign in. Others get roles from the **People and roles** page. |

## Deploy

The site runs well on [Vercel](https://vercel.com) with a production Convex deployment.

1. In Clerk, create a production instance for your domain and copy its keys. No domain yet? Clerk's production keys don't work on a `vercel.app` address, so use the development instance's keys until you have one.
2. In the Convex dashboard, open the production deployment and set `CLERK_JWT_ISSUER_DOMAIN` (the Clerk Frontend API URL; for a production instance usually `https://clerk.your-domain`) and `JOURNAL_ADMIN_EMAILS`. Generate a production deploy key.
3. Import the repository in Vercel. Set the build command to:

   ```bash
   npx convex deploy && npx convex deploy --cmd 'npm run build'
   ```

   The first `convex deploy` uploads the Convex functions. The second builds the site with `NEXT_PUBLIC_CONVEX_URL` set, then uploads again. Both are needed: `--cmd` runs the build before uploading, and the public pages query Convex while they prerender. So on a new deployment, a single `npx convex deploy --cmd 'npm run build'` fails with `Server Error`, then `Failed to collect page data`.

4. Add `CONVEX_DEPLOY_KEY` (Production only) and the two Clerk keys as environment variables. `NEXT_PUBLIC_SITE_URL` is optional; without it the site uses the Vercel production domain.

Don't run the seed on production; the journal should start empty.

## Development

```bash
npm run dev         # Next.js on http://localhost:3000
npm run dev:convex  # Convex functions, watching for changes
npm run check       # typecheck, lint and tests
npm run build       # production build (needs NEXT_PUBLIC_CONVEX_URL)
```

Tests use [convex-test](https://docs.convex.dev/testing/convex-test) and cover permissions and the editorial workflow end to end (`convex/*.test.ts`).

| Path | Contains |
| --- | --- |
| `src/app/(site)` | Public pages, rendered on the server and cached for up to an hour |
| `src/app/dashboard` | Signed-in pages, rendered in the browser |
| `src/components/site`, `src/components/dashboard` | Page components |
| `src/components/ui` | shadcn/ui components, restyled for the journal |
| `src/config/journal.ts` | Journal name, article types, subjects, file rules |
| `src/lib/data.ts` | Cached reads for the public pages |
| `convex/` | Schema, queries and mutations, permission checks, tests |

Security lives in Convex: every query and mutation checks who is calling and what their role allows. The Next.js proxy only redirects signed-out visitors away from the dashboard.

## Before launch

- Fill in the name, ISSN, publisher and contact email in `src/config/journal.ts`, and the editorial board in `src/app/(site)/editorial-board/page.tsx`.
- The policy text on the about and author guidelines pages is a starting draft. Have it reviewed against COPE, ICMJE and your publisher's requirements.
- The journal doesn't send email yet. Invitations, decisions and revision requests appear in each person's dashboard, so editors need to tell people when something is waiting.
- DOIs are typed in by hand. Registering them needs a Crossref membership; there is no automatic deposit or JATS export yet.
- Uploads are limited to 50 MB per file. Files that never get attached to a manuscript are deleted nightly.
