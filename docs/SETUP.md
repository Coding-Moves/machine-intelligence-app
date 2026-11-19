# Developer setup

This guide covers the app, RSS ingestion, editor review, and the first magazine draft builder. Public issue pages show a May 2026 sample until the database contains a published edition. The editor desk requires Supabase credentials and an approved editor account.

## 1. Local requirements

Install Node.js 26.13.1, the version recorded in .nvmrc. Then install the project dependencies and make a local environment file:

```bash
git clone https://github.com/Coding-Moves/machine-intelligence-app.git
cd machine-intelligence-app
nvm install
nvm use
npm ci
cp .env.example .env.local
```

Fill the required values in .env.local before using login, the editor desk, or the API routes. The public pages can render the sample preview without a Supabase project.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000. The lint, typecheck, and production build commands are:

```bash
npm run lint
npm run typecheck
npm run build
```

## 2. Create and migrate Supabase

Use the existing MID app Supabase project in Sydney, as selected for this deployment. Copy its project URL, anon or publishable key, and service-role key into .env.local. Vercel functions run in Mumbai (bom1), so database calls cross regions; moving the database later would require updating the project URL, keys, and linked project ref. Keep the service-role key server-only; never add a NEXT_PUBLIC_ prefix.

Use the repository's Supabase CLI dependency. Sign in, link this repository to the project, and preview the migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --remote --dry-run
```

Review the migration plan, then apply the schema:

```bash
npx supabase db push --remote
```

The migrations create the editor, edition, run, source, article, story, and image tables; enable pgvector; apply row-level security; create the public issues and private drafts storage buckets; seed the initial verified RSS sources; and ensure there is one current draft edition. The ingest migration adds a service-role-only database function that stores each article and its story link atomically.

The May LaTeX reference uses the committed `latex/reference/cover-placeholder.png`. Keep real cover art in Supabase Storage's `issues` bucket and only use artwork the project has permission to publish.

Add the first real admin in the Supabase SQL Editor. Replace the sample values before running this statement:

```sql
insert into public.editors (email, name, role)
values ('your-student-email@example.edu', 'Your Name', 'admin')
on conflict (email) do update
set name = excluded.name, role = 'admin';
```

The placeholder editor row in supabase/seed.sql is for local development. The trusted source rows are also included in the production migration. For the hosted project, add the actual admin explicitly as above. Do not apply the development editor seed to a production project.

To run a local Supabase stack, start Docker and use the Supabase CLI:

```bash
npx supabase start
npx supabase db reset
```

For local use, change the placeholder email in supabase/seed.sql before resetting the database. The Supabase CLI prints local API values; use those in .env.local when testing against the local stack.

If the local database is running, regenerate the TypeScript definitions with:

```bash
npm run db:types
```

This command replaces lib/supabase/types.ts with the schema generated from the local database.

## 3. Configure editor sign-in

In Supabase Dashboard, open Authentication → Sign In / Providers and make sure email-and-password sign-in is enabled. In Authentication settings, turn off **Allow new users to sign up**. Existing editor accounts can still sign in; admins create new accounts from the dashboard.

For every editor, do both steps:

1. Add their lowercase email to `public.editors` (or use the admin-only Editors page).
2. In Authentication → Users, create a Supabase Auth user with the same email and a strong password. Mark the email confirmed if the dashboard offers that option.

The email in `public.editors` is the allowlist; the Supabase Auth user and password prove who is signing in. Adding an email to the database alone does not create an Auth account. With email delivery disabled, password-reset emails will not arrive, so an admin must set a new password for an editor in Supabase Auth when needed.

The app checks the password with Supabase Auth, then checks the signed-in user's email against `public.editors` under row-level security. A valid Auth account that is not on the editor list is signed out and denied access. Password sign-in does not need an email sender or redirect URL.

## 4. Fill local environment values

Set these required values in .env.local:

- NEXT_PUBLIC_SITE_URL: http://localhost:3000
- NEXT_PUBLIC_SUPABASE_URL: the Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: the anon or publishable key
- SUPABASE_SERVICE_ROLE_KEY: the private service-role key
- CRON_SECRET: a random value with at least 32 characters

You can generate a local cron secret with:

```bash
openssl rand -hex 32
```

Set `GEMINI_API_KEY` in Vercel if you want the ingest route to summarize and score new stories and the draft builder to arrange approved stories and draft an editor note. The editable template's section slot counts guide Gemini's layout; if a section has more approved stories than slots, the model uses brief presentation for overflow and keeps every approved story. `WRITER_MODEL` and `DESIGNER_MODEL` are optional model overrides; when blank, both use Google's stable `gemini-3.8-flash` model. Do not put the Gemini key in GitHub or the browser. `GITHUB_DISPATCH_TOKEN` is reserved for future PDF compilation and is not used yet. `APP_URL` is used by the GitHub Actions workflow, not by the web app.

## 5. Deploy the app to Vercel

Import Coding-Moves/machine-intelligence-app into Vercel and connect the GitHub organization repository. Add these environment variables in Vercel for the environments you use:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET
- GEMINI_API_KEY (optional; needed for summaries, scoring, AI layout, and an AI editor-note draft)
- WRITER_MODEL (optional)
- DESIGNER_MODEL (optional)

Set NEXT_PUBLIC_SITE_URL to the deployed app URL. The service-role key and CRON_SECRET must remain server-side. The repository config places server functions in Vercel's Mumbai region, bom1.

No custom domain is required for this foundation. If a domain is chosen later, set NEXT_PUBLIC_SITE_URL and the Supabase redirect allowlist to that URL.

## 6. Configure GitHub Actions

In the repository, open Settings → Secrets and variables → Actions and add these repository secrets:

- APP_URL: the deployed app URL, with no trailing slash
- CRON_SECRET: the same value configured in Vercel

The ingest workflow sends only the cron request. The web app uses its server-only Supabase service-role key to fetch feeds, store articles and stories, and write the run record. The LaTeX reference-check workflow needs no secrets.

The workflows are available under the repository Actions tab:

- CI runs lint, typecheck, and build for pull requests and pushes to main.
- Scheduled ingest runs at 01:00, 08:00, and 15:00 UTC, which is 06:00, 13:00, and 20:00 in Pakistan. It can also be started with workflow_dispatch.
- LaTeX check compiles the May reference and a generated special-character magazine fixture when LaTeX or renderer files change. It stores the reference PDF as an artifact.

If APP_URL is empty, the scheduled ingest workflow records a notice and exits without sending a request.

## 7. Foundation route map

- / — public home page
- /issues — archive, with a clearly labeled sample if no published edition exists
- /issues/may-2026 — sample issue and source links
- /about — department, supervisor, editors, correction and contribution information
- /how-its-made — editorial process and source policy
- /privacy — privacy note
- /login — Supabase email-and-password sign-in for allowlisted editors
- /desk — editable issue template and editor note, AI layout rebuild, and private TeX download
- /desk/stories — live story review from Supabase; approval requires a summary and section
- /desk/quarantine — live rejected stories from Supabase
- /desk/sources — read-only list of configured feed URLs and publisher details
- /desk/images — upload control reserved for a later phase
- /desk/issues — editions in Supabase
- /desk/editors — admin-only editor list and real add/remove actions
- /api/health — public health response
- /api/cron/ingest — authenticated RSS collection, safe article extraction, URL deduplication, title grouping, and optional Gemini summary/scoring
- /api/compile/callback — authenticated compile-status callback that records the PDF path and run result

## 8. What is not active yet

RSS ingestion stores articles and candidate stories in Supabase. When `GEMINI_API_KEY` is configured, it also drafts a source-based summary, assigns a section and score, and flags unsupported numbers for editor review. Stories and quarantine are live database views. The draft builder uses approved stories only, validates Gemini's layout JSON, fits all stories to the editable section targets using brief presentation for overflow, preserves the editable masthead and editor note, and writes TeX into private storage. An editor must review and approve the note and verify story claims. PDF compilation and publishing editions to the public archive are not yet connected; source and image administration pages remain limited.
