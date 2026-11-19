export const MINIMUM_ISSUE_AGE_DAYS = 14;
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
  pdfPath: string | null;
  texHash: string | null;
  pdfTexHash: string | null;
  editorNote: string | null;
  editorNoteApproved: boolean;
  planUsesGemini: boolean;
  storyIds: string[];
  approvedStoryIds: string[];
  stories: StoryReview[];
  pendingAiReviews: number;
  pendingEditorReviews: number;
  fullSourcePassComplete: boolean;
  now?: number;
}): PublishReadiness {
  const now = input.now ?? Date.now();
  const publicationTime =
    Date.parse(input.createdAt) + MINIMUM_ISSUE_AGE_DAYS * DAY_MS;
  const daysRemaining = Number.isFinite(publicationTime)
    ? Math.max(0, Math.ceil((publicationTime - now) / DAY_MS))
    : MINIMUM_ISSUE_AGE_DAYS;
  const blockers: string[] = [];
  const selectedIds = new Set(input.storyIds);
  const approvedIds = new Set(input.approvedStoryIds);

  if (daysRemaining > 0) {
    blockers.push(
      `Wait ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"}; each issue must be open for at least 14 days.`,
    );
  }
  if (input.pendingAiReviews > 0) {
    blockers.push(
      `Gemini still needs to check ${input.pendingAiReviews} ${input.pendingAiReviews === 1 ? "story" : "stories"}.`,
    );
  }
  if (input.pendingEditorReviews > 0) {
    blockers.push(
      `Review or reject ${input.pendingEditorReviews} AI-confirmed candidate ${input.pendingEditorReviews === 1 ? "story" : "stories"} before publishing.`,
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
    blockers.push("Approve at least one AI-confirmed story for this issue.");
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
    input.approvedStoryIds.length !== selectedIds.size ||
    [...approvedIds].some((id) => !selectedIds.has(id))
  ) {
    blockers.push(
      "The issue must include every AI-confirmed, editor-approved story from this cycle.",
    );
  }
  if (
    input.stories.some(
      (story) => story.status !== "approved" || story.is_ai_related !== true,
    )
  ) {
    blockers.push(
      "Every story in the issue must be AI-confirmed and editor-approved.",
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
