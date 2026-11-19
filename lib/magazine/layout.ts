import type { StorySection } from "@/lib/supabase/types";
import type { MagazineTemplate } from "@/lib/magazine/template";

export type LayoutItem = {
  storyId: string;
  section: StorySection;
  order: number;
  presentation: "feature" | "standard" | "brief";
};

export type LayoutStory = {
  id: string;
  headline: string;
  section: StorySection;
  finalScore: number;
};

export function sortPlanItems<
  T extends { section: StorySection; order: number },
>(items: T[], sections: MagazineTemplate["sections"]) {
  const sectionOrder = new Map(
    sections.map((section, index) => [section.id, index]),
  );
  return items
    .slice()
    .sort(
      (left, right) =>
        (sectionOrder.get(left.section) ?? 0) -
          (sectionOrder.get(right.section) ?? 0) || left.order - right.order,
    );
}

export function createFallbackLayout(
  stories: LayoutStory[],
  sections: MagazineTemplate["sections"],
): LayoutItem[] {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const sorted = [...stories].sort(
    (left, right) =>
      sections.findIndex((section) => section.id === left.section) -
        sections.findIndex((section) => section.id === right.section) ||
      right.finalScore - left.finalScore ||
      left.headline.localeCompare(right.headline),
  );
  const sectionOrders = new Map<StorySection, number>();
  return sorted.map((story) => {
    const order = (sectionOrders.get(story.section) ?? 0) + 1;
    sectionOrders.set(story.section, order);
    const targetSlots = sectionById.get(story.section)?.slots ?? 0;
    return {
      storyId: story.id,
      section: story.section,
      order,
      presentation:
        order > targetSlots
          ? ("brief" as const)
          : order === 1
            ? ("feature" as const)
            : ("standard" as const),
    };
  });
}

export function isValidIssueLayout(
  items: LayoutItem[],
  stories: LayoutStory[],
  sections: MagazineTemplate["sections"],
) {
  const expected = new Map(stories.map((story) => [story.id, story.section]));
  if (items.length !== stories.length) return false;
  if (new Set(items.map((item) => item.storyId)).size !== stories.length) {
    return false;
  }
  if (!items.every((item) => expected.get(item.storyId) === item.section)) {
    return false;
  }
  const positions = items.map((item) => `${item.section}:${item.order}`);
  if (new Set(positions).size !== items.length) return false;
  return sections.every((section) => {
    const sectionItems = items
      .filter((item) => item.section === section.id)
      .sort((left, right) => left.order - right.order);
    return sectionItems.every(
      (item, index) =>
        item.order === index + 1 &&
        (index < section.slots || item.presentation === "brief"),
    );
  });
}
