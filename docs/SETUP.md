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

The migrations create the editor, edition, run, source, article, story, and image tables; enable pgvector; apply row-level security; create the public issues and private drafts storage buckets; seed the initial RSS sources; mark only reviewed feeds as trusted; and ensure there is one current draft edition. The automatic eligibility migration adds a `ready` story status, promotes only legacy approvals that already meet the automatic checks, and queues other recent stories for a fresh AI review. It caps coverage at 30 rolling days and starts a seven-day review period for the current issue when the migration is applied; each later draft also gets its own seven-day date. It makes generated publication-owned illustrations available automatically and invalidates the old TeX/PDF so the next ingest rebuilds the draft with eligible stories. The database publish function still checks source coverage, AI checks, the complete issue plan, reviewed editor's note, and current PDF in one transaction.

Always apply pending migrations before starting an ingest run after updating the app. The editorial review migration adds the explanation field shown beside each AI story score; the source migration changes the existing arXiv rows to the supported RSS host without losing their trust settings or article history.

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

Set `GEMINI_API_KEY` in Vercel Production for the web app's draft builder to arrange eligible stories and draft the editor note. The scheduled worker also needs the key in GitHub Actions to screen and summarize fetched stories. Without it, pending stories stay queued. The editable template's section slot counts guide Gemini's layout; stories over a target become briefs, and no eligible story is dropped. `WRITER_MODEL` and `DESIGNER_MODEL` are optional model overrides; when blank, both use Google's configured default. Keep the Gemini key in Vercel and GitHub Actions secrets only; never expose it in the browser or commit it. `APP_URL` is used by GitHub Actions, not by the web app.

## 5. Deploy the app to Vercel

Import Coding-Moves/machine-intelligence-app into Vercel and connect the GitHub organization repository. Add these environment variables to Vercel Production:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET
- GEMINI_API_KEY (optional; needed for summaries, scoring, AI layout, and an AI editor-note draft)
- WRITER_MODEL (optional)
- DESIGNER_MODEL (optional)
- GITHUB_DISPATCH_TOKEN (required for PDF rebuilds after an editor changes the draft; use a fine-grained token from `Muawiya-contact` with Actions: write access, and add it to Production only)
- RESEND_API_KEY (optional; required only to email an approved published issue)
- PUBLICATION_FROM_EMAIL (optional; the verified publication sender address for Resend)

Set NEXT_PUBLIC_SITE_URL to the deployed app URL. Keep production credentials in Vercel's Production environment. Do not copy the production service-role key, cron secret, or Gemini key into branch Preview deployments: public pull request builds can execute changed code. Use a separate staging Supabase project and staging-only credentials if Preview deployments need a working editor desk. Without Preview Supabase settings, the public site still works and editor login displays a setup message. The repository config places server functions in Vercel's Mumbai region, bom1.

No custom domain is required for this foundation. If a domain is chosen later, set NEXT_PUBLIC_SITE_URL and the Supabase redirect allowlist to that URL.

## 6. Configure issue email (optional)

Email delivery is separate from automatic ingest and publishing. To enable it, create a Resend account,
verify a domain and sender address that the publication is authorized to use, then add
`RESEND_API_KEY` and `PUBLICATION_FROM_EMAIL` to Vercel Production and redeploy. Use the publication's
own verified sender; do not send as a professor or use a personal address without authorization.

After applying the publication email migration, an admin can save the recipient list, reusable subject,
and message on the Draft page. Only add recipients who explicitly agreed to receive recurring issue
emails; the admin must attest to that in the form. The faculty-approval checkbox is tied to a hash of
the exact recipient list and message, so changing either clears the approval. After publication, an
admin sends from the Issues page and confirms faculty approval of that exact PDF and saved message.
The app sends one message per recipient, includes a visible unsubscribe link and one-click unsubscribe headers, and keeps an
unsubscribe suppression so later issues skip that address. If sending fails, the published issue
remains available and its Issues page provides per-recipient status and a safe retry path. For uncertain
provider responses, check Resend's delivery log for every affected recipient before confirming a retry.

## 7. Configure GitHub Actions

In the repository, open Settings → Secrets and variables → Actions and add these repository secrets:

- APP_URL: the deployed app URL, with no trailing slash
- CRON_SECRET: the same value configured in Vercel
- NEXT_PUBLIC_SUPABASE_URL: the Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: the project's anon or publishable key
- SUPABASE_SERVICE_ROLE_KEY: the private service-role key
- GEMINI_API_KEY: the Gemini API key

The scheduled ingest runs directly on a GitHub Actions runner. This avoids Vercel Hobby's 60-second function limit. It uses the Supabase service-role key to fetch trusted feeds, store articles and stories, run Gemini checks, and write the run record. `NEXT_PUBLIC_SITE_URL` is set from `APP_URL` for the worker's shared environment validation. Optional model overrides can be added as Actions variables named `WRITER_MODEL` and `DESIGNER_MODEL`. The scheduled compile workflow uses short-lived signed storage URLs and needs only `APP_URL` and `CRON_SECRET`. The app's editor actions use `GITHUB_DISPATCH_TOKEN` in Vercel to request the same compile workflow after a note, story, image, or template edit.

The workflows are available under the repository Actions tab:

- CI runs lint, typecheck, and build for pull requests and pushes to main.
- Scheduled ingest runs at 03:00 and 15:00 UTC, which is 08:00 and 20:00 in Pakistan. It fetches and processes the trusted feeds directly on GitHub Actions; a follow-up workflow compiles the current draft PDF after each non-cancelled attempt. Publishing requires the latest pass to succeed across the current trusted-source list. Ingest can also be started with workflow_dispatch on `main`.
- LaTeX check compiles the May reference and a generated special-character magazine fixture when LaTeX or renderer files change. It stores the reference PDF as an artifact.

The ingest runner requires all four Supabase/Gemini secrets above. The compile workflow needs `APP_URL` and the same `CRON_SECRET` configured in Vercel Production. Never paste secret values into chat. After applying migrations, adding these secrets, and deploying, run Scheduled ingest once from Actions and check its result and the Compile current magazine draft workflow. `public.runs` should show `ok = true`, and the Draft page should have a current PDF preview.

## 8. Foundation route map

- / — public home page
- /issues — archive, with a clearly labeled sample if no published edition exists
- /issues/may-2026 — sample issue and source links
- /about — department, supervisor, editors, correction and contribution information
- /how-its-made — editorial process and source policy
- /privacy — privacy note
- /login — Supabase email-and-password sign-in for allowlisted editors
- /desk — editable issue template, approved email settings, AI layout rebuild, TeX download, embedded current PDF preview/download, and a seven-day gated publish checklist
- /desk/stories — automatically screened stories from Supabase; eligible stories enter the draft automatically, while editors can reject them or edit the text
- /desk/quarantine — live rejected stories from Supabase
- /desk/sources — read-only list of configured feed URLs, trust status, and publisher details
- /desk/images — upload control reserved for a later phase
- /desk/issues — editions, PDF email status, and faculty-confirmed delivery actions
- /desk/editors — admin-only editor list and real add/remove actions
- /api/health — public health response
- /api/cron/ingest — authenticated collection from trusted feeds, safe article extraction, URL deduplication, title grouping, and Gemini evidence-based summary/scoring
- /api/cron/compile/prepare — authenticated short-lived TeX download and PDF upload URLs for GitHub Actions
- /api/compile/callback — authenticated compile-status callback that records the PDF path and run result

## 9. Current editorial and publishing behavior

RSS ingestion stores trusted-source articles and candidate stories in Supabase. Gemini keeps AI, computer science, data science, and related computing coverage; it summarizes, assigns sections and scores, and checks numeric claims. Eligible stories become ready automatically. Out-of-scope stories and stories with unsupported numbers go to quarantine, and there is no individual story approval step. The draft builder validates Gemini's layout JSON and places every ready story in the editable section template and latest TeX file. GitHub Actions compiles the current private PDF after scheduled ingest and editor changes. Publishing remains locked until seven days have passed, the latest full-feed scan succeeded for the current trusted-source list, automatic checks are finished, every eligible story is in the issue, trusted evidence and numeric checks pass, the editor note is reviewed, and the PDF matches the current TeX source. The service-role-only database function enforces these checks and creates the next draft. Sending the published PDF is a separate faculty-approved action through the saved email template.
