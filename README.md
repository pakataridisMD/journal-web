# The Journal

The website and editorial system for a peer-reviewed, open-access general medicine journal: a public site for readers, and a dashboard where authors submit, reviewers report, and editors decide and publish.

"The Journal" is a placeholder. The name, manuscript ID prefix, article types, subjects and file rules all live in [`src/config/journal.ts`](src/config/journal.ts), so renaming is a one-file change.

Built with Next.js 16 (App Router, Cache Components), Clerk, Convex, Tailwind CSS 4 and shadcn/ui.

## What it does

**Public site.** Home page with featured and latest articles and the current issue; an article list with type filters and full-text search; article pages with the structured abstract, body, references, a citation to copy, peer review dates and a PDF download; an issue archive; about and author guidelines pages; a **Who we are** page with the mission, the editorial board and the reviewers; public profiles for editors, reviewers and authors, with their ORCID iD, links elsewhere and the articles they published here; a sitemap and robots file.

**Dashboard** (sign-in required). What people see depends on their roles:

| Role | Can |
| --- | --- |
| Author (everyone) | Submit through a five-step wizard that saves as they type: details, authors, files, declarations, final check. Follow the status, read decision letters with the reviewers' comments, revise and resubmit, withdraw. |
| Reviewer | Accept or decline invitations, open the anonymized files, write a report (recommendation, four scores, comments to the authors, confidential comments to the editor) that saves as they type. |
| Editor | Work the editorial queue, take manuscripts, invite reviewers (existing accounts or new people), follow reports, send decisions from letter templates, prepare accepted manuscripts for publication and edit published articles. |
| Editor-in-chief | Everything editors can, plus assign manuscripts to editors, manage volumes and issues, give people roles, and set up the editorial board shown on the Who we are page. |

Everyone also has a **Profile** page: name, degrees, affiliation, bio, specialties, links to Google Scholar, ResearchGate, LinkedIn and others, and their ORCID iD.

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

6. Optional: add sample articles, issues, an editorial board and reviewer profiles to preview the public site. Every sample says it is a sample. Run this on development deployments only.

   ```bash
   npm run seed
   ```

   A development deployment seeded before profiles existed can get just the sample people with `npx convex run seed:people`.

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

## Profiles and ORCID

A profile stays private until its owner switches on **Show my profile on the journal's website**. Editorial board members are shown because they are on the board. A public profile shows the name, degrees, affiliation, bio, specialties, links, ORCID iD and the articles the person published in the journal. It never shows an email address or what someone reviewed. Each person chooses whether to show their photo, the works from their ORCID record, citation counts, and whether to be named among the reviewers.

Published articles link each author to their profile when the author's email belongs to a verified account, or their ORCID iD to a connected one. Publishing does this by itself. On a deployment that already had published articles before profiles existed, run this once (add `--prod` for production):

```bash
npx convex run authorships:backfill
```

The board starts as a list of suggested positions, shown as open on the website. The editor-in-chief edits it under **Editorial board** in the dashboard and appoints people with accounts.

### Connect ORCID (optional)

Without it, people can type their ORCID iD in, and the profile marks it as unauthenticated, as ORCID's display guidelines ask. With it, people press **Connect your ORCID iD**, sign in at ORCID, and come back with a verified iD. The journal then reads their public ORCID record, so the profile can list their recent works, jobs and degrees and offer to fill in the bio, keywords and links.

1. Sign in at [orcid.org](https://orcid.org) with the ORCID account that will own the credentials, open **Developer tools** and register for the free Public API. The Public API is for non-commercial use; a journal that charges fees or is run commercially needs an [ORCID membership](https://info.orcid.org/what-is-orcid/services/member-api/) (Member API) instead.
2. Name the application after the journal, give the website address, and add this redirect URI (and your own domain once you have one):

   ```
   https://journal-web-lovat.vercel.app/dashboard/profile/orcid
   ```

3. Give the credentials to Convex. The Connect button appears once both are set.

   ```bash
   npx convex env set ORCID_CLIENT_ID APP-XXXXXXXXXXXXXXXX
   npx convex env set ORCID_CLIENT_SECRET your-client-secret
   ```

   To try it first, register a client on the [ORCID sandbox](https://sandbox.orcid.org) instead and also set `ORCID_SANDBOX=true`. Sandbox iDs only work with sandbox credentials.

4. Optional: profiles can show works, citation and h-index counts from [OpenAlex](https://openalex.org). This works without a key; a free `OPENALEX_API_KEY` raises OpenAlex's limits.

The journal asks ORCID only for `/authenticate`: it learns the iD and reads what is public. It can't write to anyone's ORCID record. That needs the Member API.

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
| `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` | Convex | Optional. ORCID Public API credentials for connecting iDs (see above). |
| `ORCID_SANDBOX` | Convex | Optional. `true` to use sandbox.orcid.org while testing. |
| `OPENALEX_API_KEY` | Convex | Optional. Raises OpenAlex's limits for citation counts. |

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

Tests use [convex-test](https://docs.convex.dev/testing/convex-test) and cover permissions and the editorial workflow end to end (`convex/*.test.ts`). The illustration data has its own checks (`src/components/art/art.test.ts`).

| Path | Contains |
| --- | --- |
| `src/app/(site)` | Public pages, rendered on the server and cached for up to an hour |
| `src/app/dashboard` | Signed-in pages, rendered in the browser |
| `src/components/site`, `src/components/dashboard` | Page components (`site/people` holds the portraits and board cards) |
| `src/components/ui` | shadcn/ui components, restyled for the journal |
| `src/components/art` | The journal's glyphs, plates and illustrations, drawn as SVG path data (see `/style-guide`) |
| `src/assets/images` | Cover images: public-domain works from The Met, credited in `src/components/site/cover-images.ts` |
| `src/config/journal.ts` | Journal name, article types, subjects, file rules |
| `src/lib/data.ts` | Cached reads for the public pages |
| `convex/` | Schema, queries and mutations, permission checks, tests |

Security lives in Convex: every query and mutation checks who is calling and what their role allows. The Next.js proxy only redirects signed-out visitors away from the dashboard.

## Before launch

- Fill in the name, ISSN, publisher and contact email in `src/config/journal.ts`. Adjust the mission on the Who we are page (`src/app/(site)/who-we-are/page.tsx`) and set up the editorial board from the dashboard.
- The policy text on the about and author guidelines pages is a starting draft. Have it reviewed against COPE, ICMJE and your publisher's requirements.
- The journal doesn't send email yet. Invitations, decisions and revision requests appear in each person's dashboard, so editors need to tell people when something is waiting.
- ORCID iDs are verified when people connect them, but the journal doesn't write works or reviews back to ORCID records; that needs an ORCID membership. Once DOIs are registered with Crossref and include the authors' ORCID iDs, ORCID can add the articles to their records automatically (Crossref auto-update).
- DOIs are typed in by hand. Registering them needs a Crossref membership; there is no automatic deposit or JATS export yet.
- Uploads are limited to 50 MB per file. Files that never get attached to a manuscript are deleted nightly.
