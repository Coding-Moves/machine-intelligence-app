import { setStoryStatus } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { siteCopy } from "@/content/site";

export type QuarantinedStory = {
  id: string;
  headline: string;
  summary: string | null;
  rejectReason: string | null;
};

export function QuarantineBoard({ stories }: { stories: QuarantinedStory[] }) {
  if (!stories.length) {
    return (
      <EmptyState
        title={siteCopy.desk.noRejected}
        description="Rejected stories from the live database will appear here."
      />
    );
  }

  return (
    <div className="divide-line border-line divide-y border-y">
      {stories.map((story) => (
        <article
          key={story.id}
          className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="max-w-3xl">
            <div className="mb-3">
              <StatusChip status="rejected" />
            </div>
            <h2 className="font-serif text-2xl leading-tight">
              {story.headline}
            </h2>
            <p className="text-muted mt-3 text-sm leading-6">
              {story.summary || "No summary saved."}
            </p>
            {story.rejectReason ? (
              <p className="mt-3 text-sm text-[#8e443c]">
                <span className="font-medium">{siteCopy.desk.reason}:</span>{" "}
                {story.rejectReason}
              </p>
            ) : null}
          </div>
          <form action={setStoryStatus}>
            <input type="hidden" name="storyId" value={story.id} />
            <input type="hidden" name="status" value="candidate" />
            <Button
              type="submit"
              className="min-h-10 px-4 text-xs"
              variant="secondary"
            >
              {siteCopy.desk.restore}
            </Button>
          </form>
        </article>
      ))}
    </div>
  );
}
