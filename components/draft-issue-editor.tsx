import {
  publishDraftAction,
  rebuildDraftAction,
  compileDraftAction,
  saveDraftEditorNoteAction,
  saveDraftTemplateAction,
} from "@/app/desk/actions";
import { Button } from "@/components/ui/button";
import type { MagazineTemplate } from "@/lib/magazine/template";
import type { PublishReadiness } from "@/lib/magazine/publication-readiness";

export function DraftIssueEditor({
  title,
  template,
  editorNote,
  editorNoteReviewed,
  editionId,
  publishNotBefore,
  publishReadiness,
  pdfUrl,
  pdfDownloadUrl,
  texUrl,
  provider,
  warning,
  sections,
}: {
  title: string;
  template: MagazineTemplate;
  editorNote: string;
  editorNoteReviewed: boolean;
  editionId: string;
  publishNotBefore: string;
  publishReadiness: PublishReadiness;
  pdfUrl: string | null;
  pdfDownloadUrl: string | null;
  texUrl: string | null;
  provider: string;
  warning: string | null;
  sections: {
    id: string;
    label: string;
    slots: number;
    stories: { headline: string; presentation: string }[];
  }[];
}) {
  return (
    <div className="space-y-8">
      <section className="border-line border bg-white p-5 sm:p-7">
        <div className="border-line flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Issue layout</h2>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              Gemini chooses each story's order and presentation. Section slot
              targets guide its layout; stories beyond a target are marked as
              briefs, and no eligible story is dropped. The score-based layout
              is used if Gemini is unavailable.
            </p>
          </div>
          <form action={rebuildDraftAction}>
            <Button type="submit">Rebuild magazine</Button>
          </form>
        </div>
        <div className="text-muted mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span>
            Placement:{" "}
            {provider === "gemini" ? "Gemini AI" : "score-based fallback"}
          </span>
          {texUrl ? (
            <a
              className="text-leaf-dark font-medium underline underline-offset-4"
              href={texUrl}
            >
              Download editable TeX source
            </a>
          ) : null}
        </div>
        {warning ? (
          <p className="mt-4 border-l-2 border-[#b76b23] bg-[#fff7e9] px-3 py-2 text-sm leading-6 text-[#704719]">
            {warning}
          </p>
        ) : null}
        <div className="mt-6">
          <h3 className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            Current issue plan
          </h3>
          {sections.some((section) => section.stories.length) ? (
            <div className="mt-3 space-y-4">
              {sections.map((section) =>
                section.stories.length ? (
                  <section key={section.id}>
                    <h4 className="text-sm font-semibold">
                      {section.label}{" "}
                      <span className="text-muted font-normal">
                        ({section.stories.length}/{section.slots} target slots)
                      </span>
                    </h4>
                    <ol className="text-ink mt-2 list-decimal space-y-2 pl-5 text-sm leading-6">
                      {section.stories.map((story, index) => (
                        <li key={section.id + "-" + index}>
                          {story.headline}{" "}
                          <span className="text-muted text-xs">
                            {story.presentation}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-muted mt-3 text-sm">
              No stories have passed the automatic checks yet. The scheduled
              ingest will add stories as soon as they are eligible.
            </p>
          )}
        </div>
      </section>

      <section className="border-line border bg-white p-5 sm:p-7">
        <div className="border-line flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">
              Latest PDF preview
            </h2>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              The PDF is compiled from the current TeX source after scheduled
              ingestion and whenever an editor changes this draft.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={compileDraftAction}>
              <input type="hidden" name="editionId" value={editionId} />
              <Button type="submit" variant="secondary">
                Build PDF preview
              </Button>
            </form>
            {pdfDownloadUrl ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#28735a] px-5 text-sm font-medium text-white hover:bg-[#205b47]"
                href={pdfDownloadUrl}
              >
                Download PDF
              </a>
            ) : null}
          </div>
        </div>
        {pdfUrl ? (
          <iframe
            className="mt-5 h-[75vh] min-h-[540px] w-full rounded border border-[#d8ddd6] bg-[#f5f6f2]"
            src={pdfUrl}
            title="Latest magazine PDF preview"
          />
        ) : (
          <p className="text-muted mt-5 rounded bg-[#f5f6f2] p-5 text-sm leading-6">
            The PDF for the latest TeX source is being built. It will appear
            here when the LaTeX workflow finishes. You can still download the
            editable TeX source above.
          </p>
        )}
      </section>

      <form
        action={saveDraftTemplateAction}
        className="border-line border bg-white p-5 sm:p-7"
      >
        <div className="border-line border-b pb-5">
          <h2 className="font-serif text-2xl tracking-tight">
            Editable magazine template
          </h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Change the publication masthead, cover and back-cover text, theme,
            section names, target story counts, supervisor details, and editor
            credits. The May 2026 reference remains a design guide.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Publication name
            <input
              name="publicationName"
              required
              minLength={2}
              maxLength={100}
              defaultValue={template.publicationName}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Issue title
            <input
              name="title"
              required
              minLength={4}
              maxLength={100}
              defaultValue={title}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Cover subtitle
            <input
              name="coverSubtitle"
              required
              maxLength={180}
              defaultValue={template.coverSubtitle}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Cover tagline
            <input
              name="coverTagline"
              maxLength={180}
              defaultValue={template.coverTagline}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Back-cover note
            <textarea
              name="backCoverNote"
              rows={3}
              maxLength={500}
              defaultValue={template.backCoverNote}
              className="border-line bg-paper mt-2 w-full rounded border p-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Supervisor name
            <input
              name="supervisorName"
              required
              maxLength={100}
              defaultValue={template.supervisorName}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Supervisor title
            <input
              name="supervisorTitle"
              required
              maxLength={100}
              defaultValue={template.supervisorTitle}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Student editor credits (one per line)
            <textarea
              name="editors"
              required
              rows={4}
              defaultValue={template.editors.join("\n")}
              className="border-line bg-paper mt-2 w-full rounded border p-3 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Visual theme
            <select
              name="theme"
              defaultValue={template.theme}
              className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
            >
              <option value="ocean">Ocean blue</option>
              <option value="forest">Forest green</option>
              <option value="mono">Black and white</option>
            </select>
          </label>
        </div>
        <div className="mt-6">
          <h3 className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            Sections and target story counts
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {template.sections.map((section) => (
              <fieldset
                key={section.id}
                className="border-line grid grid-cols-[1fr_110px] gap-3 rounded border p-3"
              >
                <legend className="text-muted px-1 text-xs">
                  {section.id}
                </legend>
                <label className="text-xs font-medium">
                  Section title
                  <input
                    name={`section.${section.id}.label`}
                    required
                    maxLength={40}
                    defaultValue={section.label}
                    className="border-line bg-paper mt-1 min-h-10 w-full rounded border px-2 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-medium">
                  Target slots
                  <input
                    name={`section.${section.id}.slots`}
                    required
                    type="number"
                    min={0}
                    max={12}
                    defaultValue={section.slots}
                    className="border-line bg-paper mt-1 min-h-10 w-full rounded border px-2 text-sm font-normal"
                  />
                </label>
              </fieldset>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <Button type="submit">Save template settings</Button>
        </div>
      </form>

      <form
        action={saveDraftEditorNoteAction}
        className="border-line border bg-white p-5 sm:p-7"
      >
        <div className="border-line border-b pb-5">
          <h2 className="font-serif text-2xl tracking-tight">Editor’s note</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Gemini drafts this from automatically eligible stories. An editor
            reviews the note as part of the final issue review.
          </p>
        </div>
        <label className="mt-5 block text-sm font-medium">
          Note text
          <textarea
            name="editorNote"
            rows={9}
            maxLength={1800}
            defaultValue={editorNote}
            className="border-line bg-paper mt-2 w-full rounded border p-3 text-sm leading-6 font-normal"
            placeholder="Write or generate the editor’s note from the latest eligible stories."
          />
        </label>
        <label className="mt-4 flex items-start gap-3 text-sm leading-6">
          <input
            name="reviewed"
            type="checkbox"
            defaultChecked={editorNoteReviewed}
            className="mt-1 size-4 accent-[#28735a]"
          />
          <span>I have read this note and approve it for the issue draft.</span>
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button type="submit">Save editor’s note</Button>
          <span className="text-muted text-xs">
            Current state:{" "}
            {editorNoteReviewed ? "reviewed" : "needs editor review"}
          </span>
        </div>
      </form>

      <section className="border-line border bg-white p-5 sm:p-7">
        <div className="border-line border-b pb-5">
          <h2 className="font-serif text-2xl tracking-tight">
            Publish checklist
          </h2>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            Publishing stays locked for the first seven days. Gemini must finish
            the automatic checks and layout, every eligible story must be
            included, the trusted feeds must pass, the editor’s note must be
            reviewed, and the latest PDF must be ready.
          </p>
          <p className="text-muted mt-2 text-xs">
            Earliest publication{" "}
            {new Date(publishNotBefore).toLocaleDateString("en", {
              timeZone: "UTC",
              dateStyle: "medium",
            })}{" "}
            UTC · {publishReadiness.storyCount} stories in the layout
          </p>
        </div>
        {pdfUrl ? (
          <a
            className="text-leaf-dark mt-5 inline-flex font-medium underline underline-offset-4"
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
          >
            Preview current PDF
          </a>
        ) : null}
        {publishReadiness.canPublish ? (
          <p className="mt-5 border-l-2 border-[#28735a] bg-[#eef5ef] px-3 py-2 text-sm leading-6 text-[#245b45]">
            All checks passed. An editor can publish this issue now.
          </p>
        ) : (
          <ul className="text-muted mt-5 list-disc space-y-2 pl-5 text-sm leading-6">
            {publishReadiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
        <form action={publishDraftAction} className="mt-6">
          <input type="hidden" name="editionId" value={editionId} />
          <Button type="submit" disabled={!publishReadiness.canPublish}>
            Publish issue
          </Button>
          {!publishReadiness.canPublish ? (
            <span className="text-muted ml-3 text-xs">
              Locked until every check passes
            </span>
          ) : null}
        </form>
      </section>
    </div>
  );
}
