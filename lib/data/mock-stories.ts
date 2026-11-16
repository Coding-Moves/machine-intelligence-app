import type { Story } from "@/lib/types";
import { mockIssue } from "@/lib/data/mock-issues";

export const mockStories: Story[] = mockIssue.stories.map((story, index) =>
  index === 4
    ? {
        ...story,
        status: "rejected",
        rejectReason: "Held for a source review in this sample.",
      }
    : story,
);
