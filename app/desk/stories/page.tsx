import { PageHeading } from "@/components/page-heading";
import { StoryBoard } from "@/components/story-board";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { mockStories } from "@/lib/data/mock-stories";

export default function StoriesPage() {
  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.storiesTitle}
        title={siteCopy.desk.storiesTitle}
        description={siteCopy.desk.storiesIntro}
      />
      <div className="mt-10">
        <StoryBoard initialStories={mockStories} />
      </div>
    </Section>
  );
}
