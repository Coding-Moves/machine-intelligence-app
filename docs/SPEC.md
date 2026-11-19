# Machine Intelligence App — Build Specification

### Build spec for NFC IET Multan, AI Department magazine

Give this whole file to your coding agent (Codex / Claude Code) as the main reference.
Build it phase by phase (prompts at the bottom).

---

## 1. What the app does (one paragraph)

Twice a day, a scheduled job collects AI news from an explicit trusted RSS allowlist, groups
duplicate articles into one "story", asks Gemini to summarise and score each story, and builds
a **living draft magazine** (LaTeX + PDF). Editors approve or reject AI-related stories. An
issue cannot be published until at least 14 days have passed, all trusted sources have had a
successful pass, all AI and editor queues are clear, every approved story is included, its
editor note is approved, and its latest PDF is compiled. Publishing freezes the issue and
opens the next draft.

---

## 2. Accounts and stack

| Thing                     | Choice                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Code                      | GitHub, repo under the **Coding Moves** org (personal account owns it)                          |
| Hosting                   | Vercel (signed up with the AI publication Gmail)                                                |
| Database + storage + auth | Supabase (same Gmail)                                                                           |
| App                       | Next.js (App Router) + TypeScript + Tailwind                                                    |
| AI                        | Gemini API now, behind a provider interface so it can be swapped later                          |
| Scheduler                 | **GitHub Actions cron** (Vercel's free plan cron only runs once a day, so it can't do 2–3 runs) |
| LaTeX compile             | GitHub Actions with TeX Live (Vercel can't run LaTeX)                                           |

**Secrets** (never in code; Vercel env vars + GitHub Actions secrets):
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GEMINI_API_KEY`, `WRITER_MODEL`,
`DESIGNER_MODEL`, and `GITHUB_DISPATCH_TOKEN`. `APP_URL` is a GitHub Actions secret used by
scheduled jobs and is not a client-side setting. Keep all secrets out of source control.

---

## 3. The flow

```
GitHub Actions cron (08:00 and 20:00 PKT)
  └─> POST https://<app>/api/cron/ingest   (header: Authorization: Bearer CRON_SECRET)
        1. Fetch RSS feeds  → new articles (skip URLs already seen)
        2. Fetch full text  → clean it (readability)
        3. Cluster          → attach to existing story OR create new story
        4. Gemini           → summary, section, scores (only for new/updated stories)
        5. Score            → final_score for every candidate story
        6. Build draft      → fill section slots, save draft layout JSON
        7. Compile draft   → workflow_run triggers after each scheduled ingest attempt
  └─> GitHub Action "compile-draft"
        uses signed URLs → TeX Live → uploads PDF to private Supabase draft storage
Dashboard always shows: latest draft PDF + story cards + quarantine
```

Approve / reject in the dashboard also re-runs step 6 + 7 (draft rebuild), so the PDF updates
within a few minutes.

---

## 4. Database (Supabase / Postgres)

```sql
-- Trusted feeds
sources (
  id uuid pk, name text, feed_url text unique, homepage text,
  region text check (region in ('pakistan','global')),
  kind text check (kind in ('news','official_blog','research','government')),
  trust_weight numeric default 1.0,   -- 0.5 .. 1.5
  active bool default true
)

-- One row per article URL
articles (
  id uuid pk, source_id uuid fk, url text unique, url_hash text unique,
  title text, published_at timestamptz, fetched_at timestamptz,
  content_text text, og_image_url text,
  story_id uuid fk null
)

-- One real-world event, may have many articles
stories (
  id uuid pk,
  headline text, summary text, key_facts jsonb,      -- [{label, value, source_article_id}]
  section text check (section in ('pakistan','global','research','industry')),
  ai_importance int,        -- 1..10 from Gemini
  ai_pakistan_relevance int,-- 1..10 from Gemini
  final_score numeric,
  status text check (status in ('candidate','approved','rejected','published'))
         default 'candidate',
  reject_reason text null,
  first_seen_at timestamptz, last_updated_at timestamptz,
  needs_reprocess bool default true,
  edition_id uuid fk null,          -- set when published
  verification jsonb                -- result of number check (see 7)
)

-- Editions
editions (
  id uuid pk, title text,           -- e.g. "December 2026 — Issue 2"
  status text check (status in ('draft','published')),
  window_start timestamptz,         -- only stories first_seen after this are eligible
  layout jsonb,                     -- AI layout (see 8)
  tex_path text, pdf_path text,     -- Supabase Storage paths
  editor_note text, editor_note_approved bool default false,
  created_at timestamptz, published_at timestamptz
)

-- Images the magazine is allowed to use
images (
  id uuid pk, story_id uuid fk null, storage_path text,
  credit text, license text,        -- 'press_kit' | 'wikimedia_cc' | 'own' | 'source_og_needs_review'
  approved bool default false
)

-- Logs of every cron run (debugging)
runs ( id uuid pk, started_at, finished_at, new_articles int, new_stories int, errors jsonb )
```

There is always **exactly one** edition with `status='draft'`.

RLS: only logged-in editors (email allowlist table `editors`) can read/write. Cron routes use
the service role key on the server only.

---

## 5. Sources (seed list, editable in dashboard)

Use RSS only, no scraping of sites that block bots.

- **Pakistan:** Dawn (Business / Sci-Tech), Express Tribune (Technology), APP, Business Recorder,
  MoITT press releases, HEC news, ProPakistani (tech), TechJuice.
  Plus Google News RSS searches, e.g. `https://news.google.com/rss/search?q=Pakistan+artificial+intelligence&hl=en-PK&gl=PK&ceid=PK:en`.
  **Rule: resolve the real article URL and keep it only if its domain is on the whitelist.**
- **Global news:** Reuters Technology, AP Technology, TechCrunch AI, The Verge AI, IEEE Spectrum, MIT Technology Review.
- **Official:** OpenAI, Anthropic, Google DeepMind, Google AI blog, NVIDIA blog, Meta AI, Microsoft AI.
- **Research:** arXiv cs.AI / cs.CL (top items only), ScienceDaily AI, university press pages.

Domain whitelist = homepages of `sources` + allowed extras. Anything else is dropped.

---

## 6. Scoring ("hot news" weightage)

For every candidate story:

```
final_score =
    0.35 * ai_importance            (1..10, Gemini: how big is this for AI overall)
  + 0.25 * ai_pakistan_relevance    (1..10, Gemini; Pakistan section gets this weighted higher)
  + 0.20 * coverage                 (number of distinct trusted sources, capped at 5, scaled to 10)
  + 0.20 * freshness                (10 * exp(-hours_since_first_seen / 72))
  then * avg(trust_weight of its sources)
```

Keep the weights in one config file so they're easy to tune.

**Breaking update:** if a new article joins an existing story (same event), set
`needs_reprocess=true` and `last_updated_at=now()`. Gemini re-summarises with all its articles,
the coverage score goes up, and the card shows an "UPDATED" badge.

---

## 7. AI steps (Gemini, behind an interface)

```ts
interface LLMProvider {
  json<T>(prompt: string, schema: ZodSchema<T>): Promise<T>; // structured output
  embed(text: string): Promise<number[]>; // for clustering
}
```

`GeminiProvider` implements it. Changing model later = one new class + one env var `LLM_PROVIDER`.

**7a. Clustering:** embed `title + first 500 chars`. If cosine similarity > 0.85 with a story
from the last 5 days → same story. Otherwise create a new story. (Store embeddings with
pgvector in Supabase.)

**7b. Summarise + score** (one call per story). Output schema:

```json
{
  "headline": "...",
  "summary": "120-180 words, plain English",
  "section": "pakistan|global|research|industry",
  "key_facts": [
    { "label": "Prize pool", "value": "Rs 2.5 million", "article_index": 0 }
  ],
  "ai_importance": 8,
  "ai_pakistan_relevance": 6,
  "is_ai_related": true
}
```

Prompt rules: use ONLY the given article texts; no outside facts; no invented numbers;
neutral tone; if `is_ai_related=false` the story is dropped.

**7c. Number check (no AI, plain code):** every number in `summary` and `key_facts` must
appear in at least one trusted source article's text. If not, mark `verification.failed=true`.
This is a numeric check, not proof of every sentence; editors still review source links.

**7d. Layout** (one call per draft rebuild, see section 8).

**7e. Editor's note:** AI drafts it from the chosen stories, but it's signed with the HOD's
name, so it's never published until an editor ticks "Editor's note reviewed".

---

## 8. Building the draft (the "living magazine")

**Slots** (config file):

```
pakistan: 3   global: 4   research: 3   industry: 4
```

**Selection algorithm** (runs after every ingest and after every approve/reject):

1. The draft builder lays out all current-cycle **approved**, AI-confirmed stories. Stories
   awaiting Gemini or editor review remain outside the issue plan and block publication.
2. Rejected stories are never used. An editor's decision triggers a fresh plan.
3. If a section has more approved stories than slots, keep them all as features/briefs; never
   omit approved coverage to fit a target.

**Layout step:** send the chosen stories (headline, summary, facts, section) to Gemini and get back
**JSON only, never LaTeX**:

```json
{
  "sections": [
    {"section": "pakistan", "items": [
      {"story_id": "...", "order": 1, "tag": "National Programme", "badge": "BREAKING|NEW|UPDATED|none",
       "box": {"type": "insightbox|alertbox|statbox|databox|none", "title": "...", "rows": [...]},
       "pullquote": null, "image_id": null}
    ]}
  ],
  "in_this_issue": ["...", "..."],
  "kpis": {"macro_trends": 7, "pakistan": 3, "global": 4, "research": 3}
}
```

Validate it with Zod. If it's invalid, retry once, then fall back to a simple default layout (no AI).

**Rendering:** code fills the existing LaTeX design (the May 2026 file) using template partials:
`cover.tex`, `editors_note.tex`, `section.tex`, `story.tex`, `box_*.tex`, `conclusion.tex`, `back_cover.tex`.

- **Escape every text field for LaTeX** (`& % $ # _ { } ~ ^ \`), and run a test that compiles
  a story full of special characters.
- Links: `\href{url}{Source name, Mon YYYY}`.
- Pull quotes are labelled "--- Editorial Board", never presented as a real person's quote.

---

## 9. Editions (fresh news every time)

- **Download draft:** anytime, gives the latest compiled PDF (and a .zip with .tex + images for Overleaf).
- **Publish edition** button (enabled only after the 14-day minimum and every source, AI,
  editor-review, story-coverage, trusted-evidence, editor-note, and current-PDF check passes):
  1. Freeze: edition `status='published'`, store the final .tex, PDF and layout.
  2. All its stories get `status='published'`, `edition_id=this`.
  3. Create a new draft edition with `window_start = now() - 2 days` (small overlap so late updates aren't lost).
  4. Stories already published are never eligible again, so the next magazine always has new news.
- **Archive** page: list of past editions with their PDFs.

---

## 10. Dashboard pages

1. **Draft** — embedded PDF preview, "Rebuild now", "Download PDF", "Download .zip for Overleaf",
   "Publish edition". Shows the last cron run time and the compile status.
2. **Stories** — cards grouped by section, sorted by score. Each card: headline, summary, score
   breakdown, source links, badges (IN DRAFT / UPDATED / NUMBER CHECK FAILED), image thumb,
   buttons **Approve / Reject (reason) / Edit**.
3. **Quarantine** — rejected stories with their reason, button **Restore**.
4. **Sources** — add/disable feeds, edit trust weight.
5. **Images** — upload an image, set credit + license, approve. Only approved images go in the PDF.
   Source `og:image` is suggested but marked "needs review" (copyright: it's an official publication).
6. **Archive** — published editions.

Login: Supabase email-and-password sign-in. Only Auth users whose email is in the
`editors` table may enter; admins provision each Auth account.

---

## 11. GitHub Actions

`.github/workflows/ingest.yml`

```yaml
on:
  schedule:
    - cron: "0 3,15 * * *"   # 08:00, 20:00 PKT (UTC+5)
  workflow_dispatch:
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "$APP_URL/api/cron/ingest" \
            -H "Authorization: Bearer $CRON_SECRET" --max-time 290
        env: { APP_URL: ${{ secrets.APP_URL }}, CRON_SECRET: ${{ secrets.CRON_SECRET }} }
```

If ingest gets too slow for one Vercel request, split it: `/api/cron/fetch`, `/api/cron/process`
(processes up to N stories per call), `/api/cron/build`, called one after another.

`.github/workflows/compile.yml` — `workflow_dispatch` with input `edition_id`:
checkout → download `.tex` + images from Supabase Storage → compile with
`xu-cheng/latex-action` (needs packages: tcolorbox, fontawesome5, pgfornament, lettrine, etc.)
→ upload PDF → `POST /api/compile/callback` with status. If compile fails, save the log and show it on the Draft page.

Supabase may pause a Free Plan project after a week with too little database activity. Each scheduled
job should make a real database request; a few requests per day are usually enough, but Supabase
does not guarantee that every project will avoid pausing. Monitor project activity and warning emails.

---

## 12. Repo layout

```
/app                  Next.js pages + API routes
  /api/cron/ingest
  /api/stories/[id]/approve | reject | restore
  /api/draft/rebuild | publish
  /api/compile/callback
/lib
  /llm   (provider interface, gemini.ts)
  /ingest (rss.ts, fulltext.ts, cluster.ts)
  /score.ts  /select.ts  /layout.ts  /render/ (latex partials + escape.ts)
  /verify.ts (number check)
/latex/templates      partials made from the May 2026 .tex
/supabase/migrations
/.github/workflows    ingest.yml, compile.yml
/config/magazine.ts   slots, weights, cron times, magazine name
```

---

## 13. Cost guard

- Only call Gemini for **new or updated** stories, never re-summarise unchanged ones.
- Max stories processed per run (e.g. 40). Max article text sent: about 6k characters per article, max 4 articles per story.
- Log token usage per run in `runs`.

---

## 14. Build prompts (paste one at a time)

Working style for every phase: make the change, commit, move to the next part, commit again.
Run typecheck + lint **once at the end of the phase**, then report.

**Phase 1 — Template**

> Read `docs/SPEC.md` and `latex/reference/may-2026.tex`. Do NOT build the app yet.
> Split the .tex into partials under /latex/templates (section 8). Keep the design exactly the same.
> Write `lib/render` that takes a layout JSON + stories and outputs a full .tex, with a LaTeX
> escape function. Add a sample JSON made from the May 2026 content and a script that renders it.
> Compile the output locally and confirm it looks the same as the original. Keep editorial copy
> aligned with the reference and validate factual claims and citations before publication.

**Phase 2 — Database + ingest**

> Using the spec, create the Supabase migrations (section 4, with pgvector and RLS), the
> seed sources (section 5), and `/api/cron/ingest` steps 1–3 only (RSS fetch, full text,
> dedupe by URL hash, clustering). No AI summary yet; use a stub. Protect the route with CRON_SECRET.
> Add the ingest.yml workflow. Investigate RSS feed URLs before hardcoding them; drop any that don't work and list them for me.

**Phase 3 — AI + scoring**

> Add the LLMProvider interface and GeminiProvider (sections 7a–7c), structured JSON with Zod,
> the scoring in section 6 with weights in /config/magazine.ts, and the number-check in lib/verify.ts.
> Only process stories with needs_reprocess=true, max 40 per run.

**Phase 4 — Dashboard**

> Build the pages in section 10 (Draft can be a placeholder for now): Stories, Quarantine,
> Sources, Images, login with Supabase email and password and the editors allowlist.
> Approve/reject/restore
> APIs must trigger a draft rebuild (stub for now).

**Phase 5 — Draft builder + compile**

> Implement selection (section 8), the layout call with Zod validation + fallback layout,
> rendering with Phase 1 code, upload .tex to Storage, compile.yml, the callback, and the Draft
> page with PDF preview + download PDF + download Overleaf zip.

**Phase 6 — Editions**

> Implement Publish edition and Archive exactly as in section 9. Write a test: publish, run ingest
> again, and confirm no published story appears in the new draft.
