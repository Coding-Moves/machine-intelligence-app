# Machine Intelligence App

The newsroom behind **Machine Intelligence**, the magazine of the Department of Artificial Intelligence at NFC IET Multan.

The foundation, RSS ingestion, AI story review, and first magazine-draft builder are in place. Approved stories can be arranged into a configurable issue, edited by the newsroom, and rendered as a private LaTeX source file for review.

## Foundation status

- **Public site:** home, issue archive and issue detail, About, How it is made, Privacy, sitemap, robots, Open Graph image, and a custom not-found page.
- **Editor desk:** Supabase email-link sign-in for approved addresses on the editor list; Supabase-backed story review and quarantine; editable issue title, publication masthead, cover and back-cover copy, theme, section names, slot targets, supervisor, editor credits, and editor note.
- **Supabase:** editor, edition, run, source, article, story, and image tables; row-level security; public issues and private drafts buckets; vector extension.
- **Ingest:** authenticated RSS collection, robots-aware article text extraction, URL-hash deduplication, conservative title-based grouping, optional Gemini summaries and scoring, and a numeric claim check against stored source text.
- **Draft builder:** Gemini arranges approved stories within their editor-assigned sections, chooses story order and presentation, and can draft an editor note using structured JSON. Editable section slot targets guide the layout; overflow stories become briefs so no approved story is dropped. The app validates the plan, renders trusted TeX with escaped story text, and stores the source file in the private `drafts` bucket.
- **API:** health endpoint, scheduled RSS ingestion, and an authenticated compile-callback stub.
- **Automation:** CI checks, a three-times-daily GitHub Actions request, and a LaTeX reference compile workflow.
- **Not active yet:** embedding-based clustering, PDF compilation, and issue publication/archive workflow. The builder creates a private `.tex` file for review. A human must check the story claims and editor note before publication.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, Google GenAI, GitHub Actions, Vercel, and TeX Live.

## Development

Use Node.js 26.13.1, matching .nvmrc.

```bash
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

The public site can show its sample preview without Supabase credentials. Sign-in, the editor desk, and ingestion need the required values in .env.local. See [the setup guide](docs/SETUP.md) and [the ingestion notes](docs/INGEST.md).

```bash
npm run lint
npm run typecheck
npm run build
```

## Project documents

- [Developer setup](docs/SETUP.md)
- [Build specification](docs/SPEC.md)
- [May 2026 LaTeX design reference](latex/reference/may-2026.tex)
- [RSS source and ingestion notes](docs/INGEST.md)

## Project layout

```text
app/                   public pages, editor desk, and API routes
app/icon.svg           supplied magazine favicon and app icons
components/            shared site, editor, and UI components
config/                magazine identity, sections, and slot counts
content/site.ts        public and editor-facing copy
lib/data/              clearly labeled sample issue and story data
lib/ingest/            feed collection, story enrichment, and scoring
lib/magazine/          editable template, AI layout planning, and safe TeX rendering
public/brand/          supplied Machine Intelligence logo pack
latex/templates/       source template used by the issue renderer
supabase/migrations/   database schema and access policies
.github/workflows/     CI, ingest request, and LaTeX reference checks
```

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
