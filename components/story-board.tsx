import { saveStoryEdit, setStoryStatus } from "@/app/desk/actions";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { siteCopy } from "@/content/site";
import type { calculateScoreBreakdown } from "@/lib/ingest/scoring";
import type { MagazineTemplate } from "@/lib/magazine/template";
import type { StoryStatus, StorySection } from "@/lib/supabase/types";

type ScoreBreakdown = ReturnType<typeof calculateScoreBreakdown>;

export type StoryReview = {
  id: string;
  headline: string;
  summary: string | null;
  section: StorySection | null;
  status: StoryStatus;
  isAiRelated: boolean | null;
  finalScore: number | null;
  editorialReason: string | null;
  scoreBreakdown: ScoreBreakdown | null;
  rejectReason: string | null;
  verification: unknown;
  sources: {
    id: string;
    sourceId: string;
    name: string;
    trustWeight: number;
    url: string;
  }[];
  image: { url: string; approved: boolean; credit: string } | null;
};

function hasVerificationFailure(value: unknown) {
  return Boolean(
    value &&
    typeof value === "object" &&
    "failed" in value &&
    value.failed === true,
  );
}

function hasPassedNumberCheck(value: unknown) {
  return Boolean(
    value &&
    typeof value === "object" &&
    "failed" in value &&
    value.failed === false,
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
        description="The scheduled job checks new coverage automatically. Check the quarantine page for stories it excluded."
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
        const readyCount = sectionStories.filter(
          (story) => story.status === "ready" || story.status === "approved",
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
                {readyCount} ready · {sectionStories.length} stories
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
                          "The automatic source review has not produced a summary yet."}
                      </p>
                      {story.editorialReason ? (
                        <div className="border-line mt-4 rounded-lg border bg-[#f4f7f4] p-4">
                          <h4 className="text-leaf-dark text-xs font-semibold tracking-wide uppercase">
                            AI editorial assessment
                          </h4>
                          <p className="mt-2 text-sm leading-6">
                            {story.editorialReason}
                          </p>
                          <p className="text-muted mt-2 text-xs">
                            This explains the model&apos;s assessment. It is not
                            a fact-check or an approval decision.
                          </p>
                        </div>
                      ) : null}
                      {story.scoreBreakdown ? (
                        <details className="border-line mt-3 max-w-3xl rounded border bg-white">
                          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                            How the priority score was calculated
                          </summary>
                          <div className="border-line grid gap-4 border-t p-4 sm:grid-cols-2">
                            {story.scoreBreakdown.components.map((part) => (
                              <div key={part.id}>
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="text-sm font-medium">
                                    {part.label}
                                  </span>
                                  <span className="text-muted text-xs">
                                    {part.score.toFixed(1)} / 10 ·{" "}
                                    {Math.round(part.weight * 100)}%
                                  </span>
                                </div>
                                <div
                                  className="bg-line mt-2 h-2 overflow-hidden rounded-full"
                                  aria-label={`${part.label}: ${part.score.toFixed(1)} out of 10`}
                                >
                                  <div
                                    className="bg-leaf h-full rounded-full"
                                    style={{
                                      width: `${Math.min(part.score, 10) * 10}%`,
                                    }}
                                  />
                                </div>
                                <p className="text-muted mt-1 text-xs leading-5">
                                  {part.explanation} Adds{" "}
                                  {part.points.toFixed(2)} points.
                                </p>
                              </div>
                            ))}
                            <p className="text-muted text-xs leading-5 sm:col-span-2">
                              Weighted score{" "}
                              {story.scoreBreakdown.weightedScore.toFixed(4)} ×
                              trusted-source adjustment{" "}
                              {story.scoreBreakdown.averageTrust.toFixed(4)} ={" "}
                              {story.scoreBreakdown.finalScore.toFixed(2)}. This
                              is a sorting aid; it does not replace the
                              issue-level publication review.
                            </p>
                          </div>
                        </details>
                      ) : null}
                      {story.image ? (
                        <div className="border-line mt-4 flex max-w-3xl flex-col gap-3 rounded-lg border p-3 sm:flex-row">
                          <Image
                            src={story.image.url}
                            alt={`AI-generated editorial illustration for ${story.headline}`}
                            width={480}
                            height={270}
                            unoptimized
                            className="bg-paper aspect-video w-full rounded object-cover sm:w-48"
                          />
                          <div className="text-sm">
                            <p className="font-medium">
                              AI-generated illustration
                            </p>
                            <p className="text-muted mt-1 text-xs leading-5">
                              {story.image.approved
                                ? "Automatically included in the magazine. This is illustrative art, not a documentary photo."
                                : "This illustration is excluded until an editor enables it."}
                            </p>
                            <a
                              className="text-leaf-dark mt-2 inline-block text-xs underline"
                              href="/desk/images"
                            >
                              Review illustrations
                            </a>
                          </div>
                        </div>
                      ) : null}
                      <p className="text-muted mt-2 text-xs">
                        Automatic topic check:{" "}
                        {story.isAiRelated === true
                          ? "in publication scope"
                          : story.isAiRelated === false
                            ? "outside publication scope"
                            : "pending"}
                      </p>
                      {story.status === "ready" ||
                      story.status === "approved" ? (
                        <p className="mt-3 border-l-2 border-[#28735a] bg-[#edf6ef] px-3 py-2 text-sm text-[#245b45]">
                          The topic, trusted-source, and numeric checks passed.
                          This story is included automatically; no separate
                          story approval is needed.
                        </p>
                      ) : (
                        <p className="mt-3 border-l-2 border-[#b76b23] bg-[#fff7e9] px-3 py-2 text-sm text-[#704719]">
                          The automated check is pending. The story enters the
                          draft only after it passes the publication scope,
                          source, and numeric checks.
                        </p>
                      )}
                      {!story.sources.length ? (
                        <p className="mt-3 border-l-2 border-[#b76b23] bg-[#fff7e9] px-3 py-2 text-sm text-[#704719]">
                          No source is currently marked trusted. This story is
                          not eligible for the issue yet.
                        </p>
                      ) : null}
                      {hasVerificationFailure(story.verification) ? (
                        <p className="mt-3 border-l-2 border-[#a33d35] bg-[#fff2f0] px-3 py-2 text-sm text-[#812c27]">
                          Some numbers in this summary could not be found in the
                          stored source text. Check them against the source
                          before it can enter the issue.
                        </p>
                      ) : null}
                      {!hasVerificationFailure(story.verification) &&
                      !hasPassedNumberCheck(story.verification) ? (
                        <p className="mt-3 border-l-2 border-[#b76b23] bg-[#fff7e9] px-3 py-2 text-sm text-[#704719]">
                          The number check against trusted source text has not
                          passed. This story stays out of the issue.
                        </p>
                      ) : null}
                      {story.rejectReason ? (
                        <p className="mt-3 text-sm text-[#8e443c]">
                          {siteCopy.desk.reason}: {story.rejectReason}
                        </p>
                      ) : null}
                      {story.isAiRelated === false ? (
                        <p className="mt-3 text-sm text-[#8e443c]">
                          The AI screen marked this story outside the
                          publication scope. It stays out of the issue
                          automatically; new source evidence can trigger another
                          check.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
