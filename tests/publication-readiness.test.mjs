import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePublishReadiness } from "../lib/magazine/publication-readiness.ts";

const editionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const texHash = "a".repeat(64);
const createdAt = "2026-01-01T00:00:00.000Z";
const publishTime = Date.parse(createdAt) + 7 * 24 * 60 * 60 * 1000;

function readyInput(overrides = {}) {
  return {
    editionId,
    createdAt,
    pdfPath: `${editionId}/${texHash}.pdf`,
    texHash,
    pdfTexHash: texHash,
    editorNote:
      "This reviewed note is long enough to satisfy the editorial minimum.",
    editorNoteApproved: true,
    planUsesGemini: true,
    storyIds: [storyId],
    eligibleStoryIds: [storyId],
    stories: [
      {
        id: storyId,
        status: "ready",
        is_ai_related: true,
        verification: { failed: false, unsupported_numbers: [] },
        hasTrustedSource: true,
      },
    ],
    pendingAiReviews: 0,
    fullSourcePassComplete: true,
    now: publishTime,
    ...overrides,
  };
}

test("a ready story needs no individual editor approval", () => {
  const readiness = evaluatePublishReadiness(readyInput());
  assert.equal(readiness.canPublish, true);
  assert.equal(readiness.daysRemaining, 0);
  assert.deepEqual(readiness.blockers, []);
});

test("the seven-day wait is a hard minimum", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({ now: publishTime - 1 }),
  );
  assert.equal(readiness.canPublish, false);
  assert.equal(readiness.daysRemaining, 1);
  assert.match(readiness.blockers[0], /at least 7 days/);
});

test("a reset publication window cannot be bypassed by an old draft creation date", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({
      publishNotBefore: "2026-02-01T00:00:00.000Z",
      now: publishTime,
    }),
  );

  assert.equal(readiness.canPublish, false);
  assert.equal(readiness.daysRemaining, 24);
  assert.match(readiness.blockers[0], /at least 7 days/);
});

test("a PDF compiled from an older magazine source cannot satisfy readiness", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({ pdfTexHash: "b".repeat(64) }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("latest draft PDF")),
  );
});

test("cleared draft hashes keep an old uploaded PDF from satisfying readiness", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({ texHash: null, pdfTexHash: null }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("latest draft PDF")),
  );
});

test("a story without a completed numeric claim check cannot publish", () => {
  const story = readyInput().stories[0];
  const readiness = evaluatePublishReadiness(
    readyInput({ stories: [{ ...story, verification: null }] }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(
    readiness.blockers.some((blocker) =>
      blocker.includes("numeric claim check"),
    ),
  );
});

test("publication stays blocked for incomplete coverage, reviews, source pass, evidence, note, or PDF", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({
      pendingAiReviews: 1,
      eligibleStoryIds: [storyId, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
      stories: [
        {
          ...readyInput().stories[0],
          verification: { failed: true },
          hasTrustedSource: false,
        },
      ],
      fullSourcePassComplete: false,
      planUsesGemini: false,
      editorNoteApproved: false,
      pdfPath: null,
    }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(readiness.blockers.length >= 8);
  assert.ok(readiness.blockers.some((blocker) => blocker.includes("Gemini")));
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("trusted source")),
  );
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("draft PDF")),
  );
});

test("duplicate or not-yet-eligible stories cannot satisfy the publication checklist", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({
      storyIds: [storyId, storyId],
      stories: [readyInput().stories[0]],
      eligibleStoryIds: [storyId],
    }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("duplicate")),
  );
});
