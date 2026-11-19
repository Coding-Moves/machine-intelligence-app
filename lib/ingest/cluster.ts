import { createHash } from "node:crypto";

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "and",
  "are",
  "as",
  "at",
  "for",
  "from",
  "in",
  "into",
  "is",
  "its",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export interface ClusterCandidate {
  id: string;
  headline: string;
  title_fingerprint: string;
  first_seen_at: string;
  status: string;
}

function titleTokens(title: string) {
  return (
    title
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => word.length > 1 && !STOP_WORDS.has(word)) ?? []
  );
}

export function fingerprintTitle(title: string) {
  const tokens = titleTokens(title);
  const normalized =
    tokens.length >= 4
      ? [...new Set(tokens)].sort().join(" ")
      : title
          .normalize("NFKC")
          .toLocaleLowerCase("en")
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

function titleSimilarity(left: string, right: string) {
  const leftTokens = new Set(titleTokens(left));
  const rightTokens = new Set(titleTokens(right));
  if (leftTokens.size < 4 || rightTokens.size < 4) {
    return fingerprintTitle(left) === fingerprintTitle(right) ? 1 : 0;
  }

  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function findMatchingStory(
  title: string,
  candidates: ClusterCandidate[],
  now = Date.now(),
) {
  const fingerprint = fingerprintTitle(title);
  const cutoff = now - 5 * 24 * 60 * 60 * 1000;
  let bestMatch: ClusterCandidate | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (candidate.status === "published") continue;
    if (new Date(candidate.first_seen_at).getTime() < cutoff) continue;
    if (candidate.title_fingerprint === fingerprint) return candidate;

    const score = titleSimilarity(title, candidate.headline);
    if (score > 0.84 && score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  return bestMatch;
}
