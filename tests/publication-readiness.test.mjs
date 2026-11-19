import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePublishReadiness } from "../lib/magazine/publication-readiness.ts";

const editionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const texHash = "a".repeat(64);
const createdAt = "2026-01-01T00:00:00.000Z";
const publishTime = Date.parse(createdAt) + 14 * 24 * 60 * 60 * 1000;

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
    approvedStoryIds: [storyId],
    stories: [
      {
        id: storyId,
        status: "approved",
        is_ai_related: true,
        verification: { failed: false, unsupported_numbers: [] },
        hasTrustedSource: true,
      },
    ],
    pendingAiReviews: 0,
    pendingEditorReviews: 0,
    fullSourcePassComplete: true,
    now: publishTime,
    ...overrides,
  };
}

test("publishing becomes eligible exactly after 14 days when every check passes", () => {
  const readiness = evaluatePublishReadiness(readyInput());
  assert.equal(readiness.canPublish, true);
  assert.equal(readiness.daysRemaining, 0);
  assert.deepEqual(readiness.blockers, []);
});

test("the 14-day wait is a hard minimum", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({ now: publishTime - 1 }),
  );
  assert.equal(readiness.canPublish, false);
  assert.equal(readiness.daysRemaining, 1);
  assert.match(readiness.blockers[0], /at least 14 days/);
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
      pendingEditorReviews: 1,
      approvedStoryIds: [storyId, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
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

test("duplicate or unapproved stories cannot satisfy the publication checklist", () => {
  const readiness = evaluatePublishReadiness(
    readyInput({
      storyIds: [storyId, storyId],
      stories: [readyInput().stories[0]],
      approvedStoryIds: [storyId],
    }),
  );

  assert.equal(readiness.canPublish, false);
  assert.ok(
    readiness.blockers.some((blocker) => blocker.includes("duplicate")),
  );
});
