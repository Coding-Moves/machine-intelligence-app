"use client";

import { useState } from "react";
import type { Story } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { siteCopy } from "@/content/site";

export function QuarantineBoard({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState(initialStories);

  function restore(storyId: string) {
    setStories((current) => current.filter((story) => story.id !== storyId));
  }

  if (!stories.length) {
    return (
      <EmptyState
        title={siteCopy.desk.noRejected}
        description={siteCopy.desk.localOnly}
      />
    );
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {stories.map((story) => (
        <article
          key={story.id}
          className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="max-w-3xl">
            <div className="mb-3">
              <StatusChip status="rejected" />
            </div>
            <h2 className="font-serif text-2xl leading-tight">{story.headline}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{story.summary}</p>
            <p className="mt-3 text-sm text-[#8e443c]">
              <span className="font-medium">{siteCopy.desk.reason}:</span>{" "}
              {story.rejectReason}
            </p>
          </div>
          <Button
            className="w-fit min-h-10 px-4 text-xs"
            variant="secondary"
            onClick={() => restore(story.id)}
          >
            {siteCopy.desk.restore}
          </Button>
        </article>
      ))}
      <p className="py-4 text-xs text-muted">{siteCopy.desk.localOnly}</p>
    </div>
  );
}
