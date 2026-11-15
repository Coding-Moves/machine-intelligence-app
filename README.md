# Machine Intelligence App

The newsroom behind **Machine Intelligence**, the magazine of the Department of Artificial Intelligence at NFC IET Multan.

This app is planned to gather AI news from trusted sources, group articles about the same event, and prepare short summaries for editors. Editors will review each story, approve or reject it, and build the next magazine issue as a PDF or LaTeX for Overleaf.

> **Project status:** This repository is being bootstrapped. The app, specification, environment template, and automation are not in place yet; they will be added in focused pull requests.

## Planned workflow

1. **Collect.** Scheduled jobs read RSS feeds from trusted news sites, official company blogs, and research pages.
2. **Write.** An AI step summarizes each story with key facts and links to its sources. Facts and numbers are checked against the original articles.
3. **Review.** Editors approve or reject stories. Rejected stories go to Quarantine and can be restored.
4. **Design.** A second AI step assigns stories to positions and styles from the magazine's existing design pieces.
5. **Build.** Code turns the approved layout into LaTeX, and a GitHub Action compiles the PDF.
6. **Publish.** Once an issue is released, its stories are marked as used and the next draft starts with fresh news.

## Planned stack

Next.js · TypeScript · Tailwind · Supabase (Postgres, Storage, Auth) · Gemini API · GitHub Actions · TeX Live · Vercel

## Planned project layout

~~~text
app/                 pages and API routes
lib/ingest/          RSS, full text, and story grouping
lib/ai/              writer, designer, tone, and layout checks
lib/render/          LaTeX components and escaping
lib/score.ts         story ranking
lib/select.ts        draft selection
config/              magazine settings and writing style guide
supabase/migrations/ database schema
.github/workflows/   ingest, compile, and deploy
~~~

## Development

The application scaffold has not been added yet, so local run instructions will follow with the first application setup pull request. A Supabase project and Gemini API key will be needed for the completed app.

Never commit real API keys. Use the example environment file when it is added.

## Deployment

The intended deployment uses Vercel for the Next.js app and GitHub Actions for scheduled jobs and PDF builds. Deployment workflows and environment setup will be added in later pull requests.

## Contributions

Contributions are for current NFC-IET students. See [CONTRIBUTING.md](CONTRIBUTING.md).

## People

- **Supervised by:** Dr. Muhammad Siddique, Head of Department, AI, NFC IET Multan
- **Built and maintained by:** Muawiya Amir, student developer and code owner, AI Department, NFC IET Multan ([2k24bsai72@undergrad.nfciet.edu.pk](mailto:2k24bsai72@undergrad.nfciet.edu.pk))
- **Editors:** Muawiya Amir, Faizan Ishfaq, Shazada M. Umar

A [Coding Moves](https://codingmoves.com) project.

## License

The code is released under the MIT License (see [LICENSE.md](LICENSE.md)). The magazine content, the Machine Intelligence name, and the department's design belong to the Department of Artificial Intelligence, NFC IET Multan, and are not covered by the MIT License.
