export type StoryScoreInput = {
  importance: number;
  pakistanRelevance: number;
  distinctSources: number;
  firstSeenAt: string;
  trustWeights: number[];
  now?: number;
};

export function calculateFinalScore(input: StoryScoreInput) {
  const now = input.now ?? Date.now();
  const ageHours = Math.max(
    0,
    (now - new Date(input.firstSeenAt).getTime()) / 3_600_000,
  );
  const coverage = Math.min(input.distinctSources, 5) * 2;
  const freshness = 10 * Math.exp(-ageHours / 72);
  const trust = input.trustWeights.length
    ? input.trustWeights.reduce((sum, value) => sum + value, 0) /
      input.trustWeights.length
    : 1;
  const score =
    (0.35 * input.importance +
      0.25 * input.pakistanRelevance +
      0.2 * coverage +
      0.2 * freshness) *
    trust;
  return Math.round(score * 100) / 100;
}

export function unsupportedNumbers(texts: string[], sources: string[]) {
  const numericTokens = new Set(
    texts.flatMap((text) => text.match(/\b\d[\d,]*(?:\.\d+)?%?/g) ?? []),
  );
  const sourceNumbers = new Set(
    sources
      .flatMap((text) => text.match(/\b\d[\d,]*(?:\.\d+)?%?/g) ?? [])
      .map((value) => value.replaceAll(",", "").replace(/%$/, "")),
  );
  return [...numericTokens].filter(
    (value) => !sourceNumbers.has(value.replaceAll(",", "").replace(/%$/, "")),
  );
}
