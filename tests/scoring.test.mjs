import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFinalScore,
  calculateScoreBreakdown,
  unsupportedNumbers,
} from "../lib/ingest/scoring.ts";

test("story scoring combines model scores, source coverage, freshness, and trust", () => {
  const score = calculateFinalScore({
    importance: 8,
    pakistanRelevance: 6,
    distinctSources: 3,
    firstSeenAt: new Date(0).toISOString(),
    trustWeights: [1, 1],
    now: 0,
  });
  assert.equal(score, 7.5);
});

test("story score explains its four weighted parts and trusted-source adjustment", () => {
  const breakdown = calculateScoreBreakdown({
    importance: 8,
    pakistanRelevance: 6,
    distinctSources: 3,
    firstSeenAt: new Date(0).toISOString(),
    trustWeights: [0.8, 1.2],
    now: 0,
  });

  assert.deepEqual(
    breakdown.components.map(({ id, points }) => [id, points]),
    [
      ["importance", 2.8],
      ["pakistan", 1.5],
      ["coverage", 1.2],
      ["freshness", 2],
    ],
  );
  assert.equal(breakdown.weightedScore, 7.5);
  assert.equal(breakdown.averageTrust, 1);
  assert.equal(breakdown.finalScore, 7.5);
  assert.equal(breakdown.distinctSources, 3);
});

test("story score displays enough trust precision to reproduce the final score", () => {
  const breakdown = calculateScoreBreakdown({
    importance: 8,
    pakistanRelevance: 6,
    distinctSources: 3,
    firstSeenAt: new Date(0).toISOString(),
    trustWeights: [0.8, 1.25],
    now: 0,
  });

  assert.equal(breakdown.weightedScore, 7.5);
  assert.equal(breakdown.averageTrust, 1.025);
  assert.equal(breakdown.finalScore, 7.69);
});

test("number verification flags unsupported values but accepts formatting differences", () => {
  assert.deepEqual(
    unsupportedNumbers(
      ["The system processed 1,200 records and saved 22% energy."],
      ["It processed 1200 records."],
    ),
    ["22%"],
  );
});
