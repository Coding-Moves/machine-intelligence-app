# Machine Intelligence App

The newsroom behind **Machine Intelligence**, the magazine of the Department of Artificial Intelligence at NFC IET Multan.

The newsroom checks a trusted RSS allowlist twice a day, asks Gemini to keep stories about AI, computer science, data science, and related computing, and automatically builds a complete private LaTeX/PDF draft. Stories with unsupported claims or out-of-scope topics are excluded; eligible stories need no individual approval. An editor reviews the completed issue and editor's note before publication, which is available after at least seven days and a successful trusted-source pass.

## Foundation status

- **Public site:** home, issue archive and issue detail, About, How it is made, Privacy, sitemap, robots, Open Graph image, and a custom not-found page.
- **Editor desk:** Supabase email-and-password sign-in for allowlisted addresses; automatic story eligibility with optional editor rejection; quarantine for out-of-scope or weakly supported stories; editable issue title, masthead, cover and back-cover copy, theme, section names, slot targets, supervisor, editor credits, and editor note.
- **Supabase:** editor, edition, run, source, article, story, and image tables; row-level security; public issues and private drafts buckets; vector extension.
- **Ingest:** authenticated twice-daily RSS collection from explicitly trusted sources, robots-aware article text extraction, URL-hash deduplication, conservative title-based grouping, Gemini summaries and scoring, and a numeric claim check against stored source text. Stories are automatically marked ready or moved to quarantine.
- **Draft builder:** Gemini arranges every eligible story into the editable section template and drafts the editor's note. Stories over a section's target become briefs; no eligible story is dropped. Original generated illustrations enter automatically and are labeled as illustrations. The app renders escaped TeX and keeps the PDF preview and download current.
- **Publication:** issues contain at most 30 days of rolling coverage and become publishable after seven days, once the trusted-feed pass, story checks, editor-note review, and current PDF are ready. Publishing atomically freezes the issue and opens the next draft.
- **Issue email:** admins save the recipient list and reusable message, and attest that every recipient opted in. Resend sends one private message per recipient with a visible one-click unsubscribe link. Faculty must approve the saved template and exact issue; unsubscribed addresses are suppressed and each delivery has its own status and duplicate guard.
- **Automation:** CI checks, twice-daily 08:00/20:00 Pakistan-time ingest, automatic draft PDF compilation, and a LaTeX reference compile workflow.
- **Editorial control:** Gemini grounds stories in trusted source text and excludes unsupported claims. Stories enter the draft automatically with no per-story approval step. Editors can reject a story and must review the completed issue and editor's note; AI output is not automatically published.

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
