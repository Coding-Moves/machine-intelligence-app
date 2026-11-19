import { saveStoryEdit, setStoryStatus } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { siteCopy } from "@/content/site";
import type { MagazineTemplate } from "@/lib/magazine/template";
import type { StoryStatus, StorySection } from "@/lib/supabase/types";

export type StoryReview = {
  id: string;
  headline: string;
  summary: string | null;
  section: StorySection | null;
  status: StoryStatus;
  isAiRelated: boolean | null;
  finalScore: number | null;
  rejectReason: string | null;
  verification: unknown;
  sources: { id: string; name: string; url: string }[];
};

function hasVerificationFailure(value: unknown) {
  return Boolean(
    value &&
    typeof value === "object" &&
    "failed" in value &&
    value.failed === true,
  );
}

export function StoryBoard({
  stories,
  sections,
}: {
  stories: StoryReview[];
  sections: MagazineTemplate["sections"];
}) {
  const visibleStories = stories.filter(
    (story) => story.status !== "rejected" && story.status !== "published",
  );
  if (!visibleStories.length) {
    return (
      <EmptyState
        title={siteCopy.desk.noStories}
        description="Run the ingest workflow or check the quarantine page."
      />
    );
  }

  const boardSections = [
    ...sections,
    { id: "unassigned", label: "Needs a section", slots: 0 },
  ];

  return (
    <div className="space-y-12">
      {boardSections.map((section) => {
        const sectionStories = visibleStories.filter((story) =>
          section.id === "unassigned"
            ? !story.section
            : story.section === section.id,
        );
        if (!sectionStories.length) return null;
        const approvedCount = sectionStories.filter(
          (story) => story.status === "approved",
        ).length;
        return (
          <section key={section.id} aria-labelledby={`section-${section.id}`}>
            <div className="border-line flex items-baseline justify-between gap-4 border-b pb-3">
              <h2
                className="font-serif text-2xl tracking-tight"
                id={`section-${section.id}`}
              >
                {section.label}
              </h2>
              <p className="text-muted text-xs">
                {approvedCount} approved · {sectionStories.length} stories
                {section.id !== "unassigned"
                  ? ` / ${section.slots} target slots`
                  : ""}
              </p>
            </div>
            <div className="divide-line divide-y">
              {sectionStories.map((story) => (
                <article key={story.id} className="py-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <StatusChip status={story.status} />
                        {story.finalScore !== null ? (
                          <span className="text-muted text-xs">
                            {siteCopy.desk.score} {story.finalScore.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="font-serif text-2xl leading-tight tracking-tight">
                        {story.headline}
                      </h3>
                      <p className="text-muted mt-3 text-sm leading-6">
                        {story.summary ||
                          "No editor summary yet. Add one before approval."}
                      </p>
                      {hasVerificationFailure(story.verification) ? (
                        <p className="mt-3 border-l-2 border-[#a33d35] bg-[#fff2f0] px-3 py-2 text-sm text-[#812c27]">
                          Some numbers in this summary could not be found in the
                          stored source text. Check them against the source
                          before approval.
                        </p>
                      ) : null}
                      {story.rejectReason ? (
                        <p className="mt-3 text-sm text-[#8e443c]">
                          {siteCopy.desk.reason}: {story.rejectReason}
                        </p>
                      ) : null}
                      {story.isAiRelated === false ? (
                        <p className="mt-3 text-sm text-[#8e443c]">
                          AI marked this story as outside the magazine scope.
                          Check the source and update its AI relevance before
                          approving it.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {story.status !== "approved" ? (
                        <form action={setStoryStatus}>
                          <input
                            type="hidden"
                            name="storyId"
                            value={story.id}
                          />
                          <input type="hidden" name="status" value="approved" />
                          <Button
                            type="submit"
                            className="min-h-10 px-4 text-xs"
                            disabled={
                              !story.summary?.trim() ||
                              !story.section ||
                              story.isAiRelated === false
                            }
                            title={
                              !story.summary?.trim() || !story.section
                                ? "Add a summary and choose a section before approval."
                                : story.isAiRelated === false
                                  ? "Check the AI relevance in Edit story details first."
                                  : undefined
                            }
                          >
                            {siteCopy.desk.approve}
                          </Button>
                        </form>
                      ) : (
                        <form action={setStoryStatus}>
                          <input
                            type="hidden"
                            name="storyId"
                            value={story.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="candidate"
                          />
                          <Button
                            type="submit"
                            variant="secondary"
                            className="min-h-10 px-4 text-xs"
                          >
                            Send back to review
                          </Button>
                        </form>
                      )}
                      <form
                        action={setStoryStatus}
                        className="flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="storyId" value={story.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <input
                          name="rejectReason"
                          maxLength={500}
                          aria-label="Reason for rejecting this story"
                          placeholder="Optional reason"
                          className="border-line bg-paper min-h-10 w-40 rounded-full border px-3 text-xs"
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          className="min-h-10 px-4 text-xs"
                        >
                          {siteCopy.desk.reject}
                        </Button>
                      </form>
                    </div>
                  </div>
                  <details className="border-line mt-4 max-w-3xl rounded border bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                      Edit story details
                    </summary>
                    <form
                      action={saveStoryEdit}
                      className="border-line grid gap-4 border-t p-4"
                    >
                      <input type="hidden" name="storyId" value={story.id} />
                      <label className="text-sm font-medium">
                        Headline
                        <input
                          name="headline"
                          required
                          minLength={8}
                          maxLength={300}
                          defaultValue={story.headline}
                          className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Summary
                        <textarea
                          name="summary"
                          required
                          minLength={40}
                          maxLength={3000}
                          rows={6}
                          defaultValue={story.summary ?? ""}
                          className="border-line bg-paper mt-2 w-full rounded border p-3 text-sm leading-6 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Section
                        <select
                          name="section"
                          required
                          defaultValue={story.section ?? ""}
                          className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
                        >
                          <option value="" disabled>
                            Choose a section
                          </option>
                          {sections.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        AI relevance
                        <select
                          name="aiRelated"
                          required
                          defaultValue={
                            story.isAiRelated === null
                              ? "unknown"
                              : String(story.isAiRelated)
                          }
                          className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
                        >
                          <option value="unknown">Not checked</option>
                          <option value="true">AI related</option>
                          <option value="false">Not AI related</option>
                        </select>
                      </label>
                      <Button type="submit" className="w-fit">
                        Save story
                      </Button>
                    </form>
                  </details>
                  {story.sources.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {story.sources.map((source) => (
                        <a
                          key={source.id}
                          className="border-line text-muted hover:border-leaf hover:text-leaf-dark rounded-full border px-3 py-1 text-xs"
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.name}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
