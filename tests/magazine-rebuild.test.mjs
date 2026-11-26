import assert from "node:assert/strict";
import test from "node:test";
import { shouldRebuildMagazineDraft } from "../lib/magazine/rebuild-needed.ts";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

function layout(ids, overrides = {}) {
  return {
    plan: {
      items: ids.map((storyId) => ({ storyId })),
      provider: "gemini",
      warning: null,
      generatedAt: "2026-11-26T00:00:00.000Z",
      ...overrides,
    },
  };
}

test("a current complete Gemini layout does not rebuild unnecessarily", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first, second]),
      eligibleStoryIds: [second, first],
    }),
    false,
  );
});

test("a story that aged out of rolling coverage triggers a rebuild", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first, second]),
      eligibleStoryIds: [second],
    }),
    true,
  );
});

test("a newly eligible story missing from the plan triggers a rebuild", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first]),
      eligibleStoryIds: [first, second],
    }),
    true,
  );
});

test("duplicate or malformed plan entries trigger a rebuild", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first, first]),
      eligibleStoryIds: [first],
    }),
    true,
  );
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: { plan: { items: [{ nope: first }] } },
      eligibleStoryIds: [first],
    }),
    true,
  );
});

test("malformed saved plan metadata triggers a rebuild", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: { plan: { items: [], provider: "gemini", generatedAt: "bad" } },
      eligibleStoryIds: [],
    }),
    true,
  );
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([], { warning: undefined }),
      eligibleStoryIds: [],
    }),
    true,
  );
});

test("an incomplete or fallback AI layout is retried when stories exist", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first], { provider: "fallback" }),
      eligibleStoryIds: [first],
    }),
    true,
  );
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first], {
        provider: "fallback",
        warning: "The first layout attempt failed.",
      }),
      eligibleStoryIds: [first],
    }),
    true,
  );
});

test("a Gemini layout with a stable skipped-story warning does not retry", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([first], { warning: "One ready story needs a summary." }),
      eligibleStoryIds: [first],
    }),
    false,
  );
});

test("an empty issue does not retry a score-based empty layout", () => {
  assert.equal(
    shouldRebuildMagazineDraft({
      layout: layout([], { provider: "fallback" }),
      eligibleStoryIds: [],
    }),
    false,
  );
});
