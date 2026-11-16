# Developer setup

This guide covers the foundation release. The public pages use a May 2026 sample until the database contains a published edition. The editor desk requires Supabase credentials and an editor row.

## 1. Local requirements

Install Node.js 26.13.1, the version recorded in .nvmrc. Then install the project dependencies and make a local environment file:

~~~bash
git clone https://github.com/Coding-Moves/machine-intelligence-app.git
cd machine-intelligence-app
nvm install
nvm use
npm ci
cp .env.example .env.local
~~~

Fill the required values in .env.local before using login, the editor desk, or the API routes. The public pages can render the sample preview without a Supabase project.

Start the app:

~~~bash
npm run dev
~~~

Open http://localhost:3000. The lint, typecheck, and production build commands are:

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

## 2. Create and migrate Supabase

Create a Supabase project in the Mumbai region, ap-south-1. Copy the project URL, anon or publishable key, and service-role key into .env.local. Keep the service-role key server-only; never add a NEXT_PUBLIC_ prefix.

Install the Supabase CLI using its official installation instructions. Sign in, link this repository to the project, and preview the migration:

~~~bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --remote --dry-run
~~~

Review the migration plan, then apply the schema:

~~~bash
supabase db push --remote
~~~

The migration creates the editors, editions, and runs tables; enables the vector extension; applies row-level security; and creates the public issues and private drafts storage buckets.

The May LaTeX reference uses the committed `latex/reference/cover-placeholder.png`. Keep real cover art in Supabase Storage's `issues` bucket and only use artwork the project has permission to publish.

Add the first real admin in the Supabase SQL Editor. Replace the sample values before running this statement:

~~~sql
insert into public.editors (email, name, role)
values ('your-student-email@example.edu', 'Your Name', 'admin')
on conflict (email) do update
set name = excluded.name, role = 'admin';
~~~

The placeholder row in supabase/seed.sql is for local development. For the hosted project, add the actual admin explicitly as above. Do not apply development seed data to a production project.

To run a local Supabase stack, start Docker and use the Supabase CLI:

~~~bash
supabase start
supabase db reset
~~~

For local use, change the placeholder email in supabase/seed.sql before resetting the database. The Supabase CLI prints local API values; use those in .env.local when testing against the local stack.

If the local database is running, regenerate the TypeScript definitions with:

~~~bash
npm run db:types
~~~

This command replaces lib/supabase/types.ts with the schema generated from the local database.

## 3. Configure editor sign-in

In Supabase Dashboard, open Authentication URL Configuration.

- Set the Site URL to the production app URL once Vercel is deployed.
- Add http://localhost:3000/** to the redirect URL allowlist.
- Add the production app URL followed by /auth/callback.
- Add a Vercel preview callback pattern only if editors need to sign in on preview deployments.

The login action checks the submitted email against public.editors before it sends a magic link. The callback checks the editor row again after authentication. An account outside the allowlist is signed out and returned to the login page.

## 4. Fill local environment values

Set these required values in .env.local:

- NEXT_PUBLIC_SITE_URL: http://localhost:3000
- NEXT_PUBLIC_SUPABASE_URL: the Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: the anon or publishable key
- SUPABASE_SERVICE_ROLE_KEY: the private service-role key
- CRON_SECRET: a random value with at least 32 characters

You can generate a local cron secret with:

~~~bash
openssl rand -hex 32
~~~

Leave GEMINI_API_KEY, WRITER_MODEL, DESIGNER_MODEL, GITHUB_DISPATCH_TOKEN, and APP_URL blank for this phase. The AI and GitHub dispatch values are not used yet. APP_URL is used by the GitHub Actions workflow, not by the web app.

## 5. Deploy the app to Vercel

Import Coding-Moves/machine-intelligence-app into Vercel and connect the GitHub organization repository. Add these environment variables in Vercel for the environments you use:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET

Set NEXT_PUBLIC_SITE_URL to the deployed app URL. The service-role key and CRON_SECRET must remain server-side. The repository config places server functions in Vercel's Mumbai region, bom1.

No custom domain is required for this foundation. If a domain is chosen later, set NEXT_PUBLIC_SITE_URL and the Supabase redirect allowlist to that URL.

## 6. Configure GitHub Actions

In the repository, open Settings → Secrets and variables → Actions and add these repository secrets:

- APP_URL: the deployed app URL, with no trailing slash
- CRON_SECRET: the same value configured in Vercel

The ingest workflow sends only the cron request. The web app uses its Vercel service-role key to write the run row. The LaTeX workflow needs no secrets. Later pipeline phases may add only the GitHub secrets they require.

The workflows are available under the repository Actions tab:

- CI runs lint, typecheck, and build for pull requests and pushes to main.
- Scheduled ingest runs at 01:00, 08:00, and 15:00 UTC, which is 06:00, 13:00, and 20:00 in Pakistan. It can also be started with workflow_dispatch.
- LaTeX check compiles the May reference when latex files change or when started manually. It creates a plain placeholder cover in the runner and stores the compiled PDF as an artifact.

If APP_URL is empty, the scheduled ingest workflow records a notice and exits without sending a request.

## 7. Foundation route map

- / — public home page
- /issues — archive, with a clearly labeled sample if no published edition exists
- /issues/may-2026 — sample issue and source links
- /about — department, supervisor, editors, correction and contribution information
- /how-its-made — editorial process and source policy
- /privacy — privacy note
- /login — email magic-link sign-in
- /desk — draft preview shell
- /desk/stories — sample stories; actions are temporary browser state
- /desk/quarantine — sample rejected stories
- /desk/sources — read-only planned source list
- /desk/images — upload control reserved for a later phase
- /desk/issues — editions in Supabase
- /desk/editors — admin-only editor list and real add/remove actions
- /api/health — public health response
- /api/cron/ingest — authenticated stub that records a run
- /api/compile/callback — authenticated stub that records a run

## 8. What is not active yet

This phase does not fetch RSS, call Gemini, cluster or score articles, build LaTeX from approved stories, produce a live draft PDF, or publish an edition. The story and source screens use sample data. Their real pipeline work is reserved for phase 2.
