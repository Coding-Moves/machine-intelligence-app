import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFinalScore,
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

test("number verification flags unsupported values but accepts formatting differences", () => {
  assert.deepEqual(
    unsupportedNumbers(
      ["The system processed 1,200 records and saved 22% energy."],
      ["It processed 1200 records."],
    ),
    ["22%"],
  );
});
