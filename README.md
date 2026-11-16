# Machine Intelligence App

The newsroom behind **Machine Intelligence**, the magazine of the Department of Artificial Intelligence at NFC IET Multan.

The foundation is in place: a public magazine site, a Supabase-backed editor allowlist, a mobile-friendly editor desk, secure API stubs, and GitHub Actions for CI, scheduled ingest calls, and LaTeX checks. The first issue and editor story cards still use clearly labeled sample data.

## Foundation status

- **Public site:** home, issue archive and issue detail, About, How it is made, Privacy, sitemap, robots, Open Graph image, and a custom not-found page.
- **Editor desk:** email magic links for emails on the editor list; Draft, Stories, Quarantine, Sources, Images, Issues, and admin-only Editors pages.
- **Supabase:** editors, editions, and runs tables; row-level security; public issues and private drafts buckets; vector extension.
- **API:** health endpoint plus authenticated ingest and compile-callback stubs. The stubs only write run records.
- **Automation:** CI checks, a three-times-daily GitHub Actions request, and a LaTeX reference compile workflow.
- **Not active yet:** RSS ingestion, Gemini calls, story clustering or scoring, draft rendering, PDF publishing, and publication logic.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, GitHub Actions, Vercel, and TeX Live. Gemini is reserved for a later phase.

## Development

Use Node.js 26.13.1, matching .nvmrc.

~~~bash
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
~~~

The public site can show its sample preview without Supabase credentials. Sign-in, the editor desk, and API stubs need the required values in .env.local. See [the setup guide](docs/SETUP.md).

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

## Project documents

- [Developer setup](docs/SETUP.md)
- [Build specification](docs/SPEC.md)
- [May 2026 LaTeX design reference](latex/reference/may-2026.tex)

## Project layout

~~~text
app/                   public pages, editor desk, and API routes
components/            shared site, editor, and UI components
config/                magazine identity, sections, and slot counts
content/site.ts        public and editor-facing copy
lib/data/              clearly labeled sample issue and story data
lib/ingest/            phase 2 feed collection
lib/ai/                phase 2 model providers
lib/render/            later LaTeX rendering
supabase/migrations/   database schema and access policies
.github/workflows/     CI, ingest request, and LaTeX check
~~~

A [Coding Moves](https://codingmoves.com) project.

## Contributions

Contributions are for current NFC-IET students. See [CONTRIBUTING.md](CONTRIBUTING.md).

## People

- **Supervised by:** Dr. Muhammad Siddique, Head of Department, AI, NFC IET Multan
- **Built and maintained by:** Muawiya Amir, student developer and code owner, AI Department, NFC IET Multan ([2k24bsai72@undergrad.nfciet.edu.pk](mailto:2k24bsai72@undergrad.nfciet.edu.pk))
- **Editors:** Muawiya Amir, Faizan Ishfaq, Shazada M. Umar

A [Coding Moves](https://codingmoves.com) project.

## License

The code is released under the MIT License (see [LICENSE.md](LICENSE.md)). The magazine content, the Machine Intelligence name, and the department's design belong to the Department of Artificial Intelligence, NFC IET Multan, and are not covered by the MIT License.
