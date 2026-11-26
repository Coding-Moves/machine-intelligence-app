import assert from "node:assert/strict";
import test from "node:test";
import {
  createFallbackLayout,
  isValidIssueLayout,
  sectionLayoutChanged,
  sortPlanItems,
} from "../lib/magazine/layout.ts";

const sections = [
  { id: "pakistan", label: "Pakistan", slots: 1 },
  { id: "global", label: "Global", slots: 0 },
  { id: "research", label: "Research", slots: 2 },
  { id: "industry", label: "Industry", slots: 1 },
];

const stories = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    headline: "Lower score",
    section: "pakistan",
    finalScore: 5,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    headline: "Higher score",
    section: "pakistan",
    finalScore: 9,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    headline: "Global story",
    section: "global",
    finalScore: 7,
  },
];

test("fallback lays out every eligible story and briefs overflow", () => {
  const items = createFallbackLayout(stories, sections);

  assert.equal(items.length, stories.length);
  assert.deepEqual(
    items
      .filter((item) => item.section === "pakistan")
      .map((item) => item.presentation),
    ["feature", "brief"],
  );
  assert.equal(
    items.find((item) => item.section === "global").presentation,
    "brief",
  );
  assert.equal(isValidIssueLayout(items, stories, sections), true);
});

test("layout validation rejects omitted stories, reassignment, and unbriefed overflow", () => {
  const fallback = createFallbackLayout(stories, sections);

  assert.equal(isValidIssueLayout(fallback.slice(1), stories, sections), false);
  assert.equal(
    isValidIssueLayout(
      fallback.map((item) =>
        item.storyId === stories[0].id ? { ...item, section: "global" } : item,
      ),
      stories,
      sections,
    ),
    false,
  );
  assert.equal(
    isValidIssueLayout(
      fallback.map((item) =>
        item.order === 2 ? { ...item, presentation: "standard" } : item,
      ),
      stories,
      sections,
    ),
    false,
  );
});

test("plan ordering follows magazine section order, then story order", () => {
  const ordered = sortPlanItems(
    [
      { storyId: "industry", section: "industry", order: 1 },
      { storyId: "global", section: "global", order: 1 },
      { storyId: "pakistan-2", section: "pakistan", order: 2 },
      { storyId: "pakistan-1", section: "pakistan", order: 1 },
    ],
    sections,
  );
  assert.deepEqual(
    ordered.map((item) => item.storyId),
    ["pakistan-1", "pakistan-2", "global", "industry"],
  );
});

test("section labels or target changes trigger a fresh plan", () => {
  assert.equal(sectionLayoutChanged(sections, sections), false);
  assert.equal(
    sectionLayoutChanged(sections, [
      { ...sections[0], slots: 2 },
      ...sections.slice(1),
    ]),
    true,
  );
  assert.equal(
    sectionLayoutChanged(sections, [
      { ...sections[0], label: "Pakistan & region" },
      ...sections.slice(1),
    ]),
    true,
  );
});
