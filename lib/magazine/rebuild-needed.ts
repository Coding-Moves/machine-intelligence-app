function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function shouldRebuildMagazineDraft(input: {
  layout: unknown;
  eligibleStoryIds: string[];
}) {
  const savedLayout = record(input.layout);
  const savedPlan = record(savedLayout?.plan);
  if (!savedPlan) return true;
  const savedItems = savedPlan?.items;
  if (!Array.isArray(savedItems)) return true;
  if (!["gemini", "fallback"].includes(String(savedPlan.provider))) return true;
  if (savedPlan.warning !== null && typeof savedPlan.warning !== "string") {
    return true;
  }
  if (
    typeof savedPlan.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(savedPlan.generatedAt))
  ) {
    return true;
  }

  const plannedIds = savedItems.map((item) => record(item)?.storyId);
  if (plannedIds.some((id) => typeof id !== "string")) return true;
  if (plannedIds.length !== input.eligibleStoryIds.length) return true;

  const planned = new Set(plannedIds as string[]);
  if (planned.size !== plannedIds.length) return true;
  if (input.eligibleStoryIds.some((id) => !planned.has(id))) return true;
  return input.eligibleStoryIds.length > 0 && savedPlan.provider !== "gemini";
}
