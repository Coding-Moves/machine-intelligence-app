export type StoryScoreInput = {
  importance: number;
  pakistanRelevance: number;
  distinctSources: number;
  firstSeenAt: string;
  trustWeights: number[];
  now?: number;
};

export type ScoreComponent = {
  id: "importance" | "pakistan" | "coverage" | "freshness";
  label: string;
  score: number;
  weight: number;
  points: number;
  explanation: string;
};

export function calculateScoreBreakdown(input: StoryScoreInput) {
  const now = input.now ?? Date.now();
  const ageHours = Math.max(
    0,
    (now - new Date(input.firstSeenAt).getTime()) / 3_600_000,
  );
  const sourceCount = Math.min(Math.max(input.distinctSources, 0), 5);
  const coverage = sourceCount * 2;
  const freshness = 10 * Math.exp(-ageHours / 72);
  const trust = input.trustWeights.length
    ? input.trustWeights.reduce((sum, value) => sum + value, 0) /
      input.trustWeights.length
    : 1;
  const components: ScoreComponent[] = [
    {
      id: "importance",
      label: "AI news value",
      score: input.importance,
      weight: 0.35,
      points: input.importance * 0.35,
      explanation: "Model estimate of the story's importance to AI readers.",
    },
    {
      id: "pakistan",
      label: "Pakistan relevance",
      score: input.pakistanRelevance,
      weight: 0.25,
      points: input.pakistanRelevance * 0.25,
      explanation:
        "Model estimate of direct relevance to Pakistan and NFC IET.",
    },
    {
      id: "coverage",
      label: "Source coverage",
      score: coverage,
      weight: 0.2,
      points: coverage * 0.2,
      explanation: `${sourceCount} trusted source${sourceCount === 1 ? "" : "s"}; each source adds coverage up to five.`,
    },
    {
      id: "freshness",
      label: "Freshness",
      score: freshness,
      weight: 0.2,
      points: freshness * 0.2,
      explanation: `Story first seen ${ageHours < 1 ? "less than an hour ago" : `${Math.floor(ageHours)} hours ago`}; freshness halves about every 50 hours.`,
    },
  ];
  const weightedScore = components.reduce(
    (sum, component) => sum + component.points,
    0,
  );
  const finalScore = Math.round(weightedScore * trust * 100) / 100;

  return {
    components: components.map((component) => ({
      ...component,
      score: Math.round(component.score * 100) / 100,
      points: Math.round(component.points * 100) / 100,
    })),
    weightedScore: Math.round(weightedScore * 10_000) / 10_000,
    averageTrust: Math.round(trust * 10_000) / 10_000,
    finalScore,
    ageHours: Math.round(ageHours * 10) / 10,
    distinctSources: input.distinctSources,
  };
}

export function calculateFinalScore(input: StoryScoreInput) {
  return calculateScoreBreakdown(input).finalScore;
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
