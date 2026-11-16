"use client";

import { useState, type FormEvent } from "react";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import type { Story } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

export function StoryBoard({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState(initialStories);
  const [editing, setEditing] = useState<{
    id: string;
    headline: string;
    summary: string;
  } | null>(null);

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setStories((current) =>
      current.map((story) =>
        story.id === editing.id
          ? {
              ...story,
              headline: editing.headline.trim() || story.headline,
              summary: editing.summary.trim() || story.summary,
            }
          : story,
      ),
    );
    setEditing(null);
  }

  function setStatus(storyId: string, status: "approved" | "rejected") {
    setStories((current) =>
      current.map((story) =>
        story.id === storyId
          ? {
              ...story,
              status,
              rejectReason:
                status === "rejected"
                  ? siteCopy.desk.rejectedLocally
                  : undefined,
            }
          : story,
      ),
    );
  }

  const visibleStories = stories.filter((story) => story.status !== "rejected");

  if (!visibleStories.length) {
    return (
      <EmptyState
        title={siteCopy.desk.noStories}
        description={siteCopy.desk.localOnly}
      />
    );
  }

  return (
    <div className="space-y-12">
      {magazine.sections.map((section) => {
        const sectionStories = visibleStories.filter(
          (story) => story.section === section.id,
        );
        if (!sectionStories.length) return null;

        return (
          <section key={section.id} aria-labelledby={"section-" + section.id}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <h2
                className="font-serif text-2xl tracking-tight"
                id={"section-" + section.id}
              >
                {section.label}
              </h2>
              <p className="text-xs text-muted">
                {sectionStories.length} / {section.slots}
              </p>
            </div>
            <div className="divide-y divide-line">
              {sectionStories.map((story) => {
                const isEditing = editing?.id === story.id;
                return (
                  <article key={story.id} className="py-6">
                    {isEditing && editing ? (
                      <form className="space-y-4" onSubmit={saveEdit}>
                        <label className="block text-sm font-medium text-ink">
                          {siteCopy.desk.storyHeadlineField}
                          <input
                            className="mt-2 min-h-11 w-full rounded border border-line bg-white px-3 text-base"
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                headline: event.target.value,
                              })
                            }
                            value={editing.headline}
                          />
                        </label>
                        <label className="block text-sm font-medium text-ink">
                          {siteCopy.desk.storySummaryField}
                          <textarea
                            className="mt-2 min-h-28 w-full rounded border border-line bg-white p-3 text-sm leading-6"
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                summary: event.target.value,
                              })
                            }
                            value={editing.summary}
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button type="submit">{siteCopy.desk.save}</Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditing(null)}
                          >
                            {siteCopy.desk.cancel}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="mb-3 flex flex-wrap items-center gap-3">
                              <StatusChip status={story.status} />
                              <span className="text-xs text-muted">
                                {siteCopy.desk.score} {story.finalScore.toFixed(1)}
                              </span>
                            </div>
                            <h3 className="font-serif text-2xl leading-tight tracking-tight">
                              {story.headline}
                            </h3>
                            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-muted">
                              {story.summary}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="min-h-10 px-4 text-xs"
                              onClick={() => setStatus(story.id, "approved")}
                            >
                              {siteCopy.desk.approve}
                            </Button>
                            <Button
                              className="min-h-10 px-4 text-xs"
                              variant="secondary"
                              onClick={() => setStatus(story.id, "rejected")}
                            >
                              {siteCopy.desk.reject}
                            </Button>
                            <Button
                              className="min-h-10 px-4 text-xs"
                              variant="secondary"
                              onClick={() =>
                                setEditing({
                                  id: story.id,
                                  headline: story.headline,
                                  summary: story.summary,
                                })
                              }
                            >
                              {siteCopy.desk.edit}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {story.sources.map((source) => (
                            <a
                              key={source.id}
                              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-leaf hover:text-leaf-dark"
                              href={source.homepage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.name}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-xs leading-5 text-muted">{siteCopy.desk.localOnly}</p>
    </div>
  );
}
