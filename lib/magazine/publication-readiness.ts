export const MINIMUM_ISSUE_AGE_DAYS = 7;
export const MAX_ISSUE_COVERAGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StoryReview = {
  id: string;
  status: string;
  is_ai_related: boolean | null;
  verification: { [key: string]: unknown } | null;
  hasTrustedSource: boolean;
};

export type PublishReadiness = {
  canPublish: boolean;
  daysRemaining: number;
  storyCount: number;
  blockers: string[];
};

export function evaluatePublishReadiness(input: {
  editionId: string;
  createdAt: string;
  publishNotBefore?: string | null;
  pdfPath: string | null;
  texHash: string | null;
  pdfTexHash: string | null;
  editorNote: string | null;
  editorNoteApproved: boolean;
  planUsesGemini: boolean;
  storyIds: string[];
  eligibleStoryIds: string[];
  stories: StoryReview[];
  pendingAiReviews: number;
  fullSourcePassComplete: boolean;
  now?: number;
}): PublishReadiness {
  const now = input.now ?? Date.now();
  const publicationTime = input.publishNotBefore
    ? Date.parse(input.publishNotBefore)
    : Date.parse(input.createdAt) + MINIMUM_ISSUE_AGE_DAYS * DAY_MS;
  const daysRemaining = Number.isFinite(publicationTime)
    ? Math.max(0, Math.ceil((publicationTime - now) / DAY_MS))
    : MINIMUM_ISSUE_AGE_DAYS;
  const blockers: string[] = [];
  const selectedIds = new Set(input.storyIds);
  const eligibleIds = new Set(input.eligibleStoryIds);

  if (daysRemaining > 0) {
    blockers.push(
      `Wait ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"}; each issue must be open for at least 7 days.`,
    );
  }
  if (input.pendingAiReviews > 0) {
    blockers.push(
      `Gemini still needs to check ${input.pendingAiReviews} ${input.pendingAiReviews === 1 ? "story" : "stories"}.`,
    );
  }
  if (!input.fullSourcePassComplete) {
    blockers.push(
      "Wait for one successful scheduled pass across every trusted source in this issue cycle.",
    );
  }
  if (!input.planUsesGemini) {
    blockers.push(
      "Gemini must produce a valid complete magazine layout before publishing.",
    );
  }
  if (!input.storyIds.length) {
    blockers.push(
      "Wait for at least one in-scope story to pass the automatic checks.",
    );
  }
  if (selectedIds.size !== input.storyIds.length) {
    blockers.push("Rebuild the issue; its plan contains duplicate stories.");
  }
  if (
    input.stories.length !== selectedIds.size ||
    input.stories.some((story) => !selectedIds.has(story.id))
  ) {
    blockers.push(
      "Rebuild the issue; its story plan no longer matches the database.",
    );
  }
  if (
    input.eligibleStoryIds.length !== selectedIds.size ||
    [...eligibleIds].some((id) => !selectedIds.has(id))
  ) {
    blockers.push(
      "Rebuild the issue to include every automatically eligible story from this coverage window.",
    );
  }
  if (
    input.stories.some(
      (story) =>
        !["ready", "approved"].includes(story.status) ||
        story.is_ai_related !== true,
    )
  ) {
    blockers.push(
      "Every story in the issue must pass the automatic scope and evidence checks.",
    );
  }
  if (input.stories.some((story) => !story.hasTrustedSource)) {
    blockers.push("Every issue story needs at least one trusted source.");
  }
  if (input.stories.some((story) => story.verification?.failed !== false)) {
    blockers.push(
      "Complete the numeric claim check against trusted source text for every selected story.",
    );
  }
  if (!input.editorNote?.trim() || !input.editorNoteApproved) {
    blockers.push("Read and approve the editor’s note.");
  }
  if (
    !input.pdfPath ||
    !input.texHash ||
    input.pdfTexHash !== input.texHash ||
    input.pdfPath !== `${input.editionId}/${input.texHash}.pdf`
  ) {
    blockers.push("Compile the latest draft PDF before publishing.");
  }

  return {
    canPublish: blockers.length === 0,
    daysRemaining,
    storyCount: selectedIds.size,
    blockers,
  };
}
