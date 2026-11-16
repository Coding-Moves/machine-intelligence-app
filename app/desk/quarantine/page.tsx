import { PageHeading } from "@/components/page-heading";
import { QuarantineBoard } from "@/components/quarantine-board";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { mockStories } from "@/lib/data/mock-stories";

export default function QuarantinePage() {
  const rejectedStories = mockStories.filter(
    (story) => story.status === "rejected",
  );

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.quarantineTitle}
        title={siteCopy.desk.quarantineTitle}
        description={siteCopy.desk.quarantineIntro}
      />
      <div className="mt-10">
        <QuarantineBoard initialStories={rejectedStories} />
      </div>
    </Section>
  );
}
