import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";

export default function ImagesPage() {
  return (
    <Section>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          eyebrow={siteCopy.desk.imagesTitle}
          title={siteCopy.desk.imagesTitle}
          description={siteCopy.desk.imagesIntro}
        />
        <Button disabled title={siteCopy.desk.comingSoon}>
          {siteCopy.desk.upload}
        </Button>
      </div>
      <div className="mt-10">
        <EmptyState
          title={siteCopy.desk.imageEmpty}
          description={siteCopy.desk.imageRights}
        />
      </div>
    </Section>
  );
}
