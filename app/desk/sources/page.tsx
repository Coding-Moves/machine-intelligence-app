import { PageHeading } from "@/components/page-heading";
import { SourcesTable } from "@/components/sources-table";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { mockSources } from "@/lib/data/mock-sources";

export default function SourcesPage() {
  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.sourcesTitle}
        title={siteCopy.desk.sourcesTitle}
        description={siteCopy.desk.sourcesIntro}
      />
      <div className="mt-10">
        <SourcesTable sources={mockSources} />
      </div>
    </Section>
  );
}
