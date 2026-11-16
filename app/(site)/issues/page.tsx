import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { IssueCard } from "@/components/issue-card";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { getIssues } from "@/lib/data/issues";

export const metadata: Metadata = {
  title: siteCopy.issues.title,
  description: siteCopy.issues.description,
};

export default async function IssuesPage() {
  const issues = await getIssues();

  return (
    <Section className="min-h-[65vh]">
      <PageHeading
        eyebrow={siteCopy.issues.eyebrow}
        title={siteCopy.issues.title}
        description={siteCopy.issues.description}
      />
      <div className="mt-12">
        {issues.length ? (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        ) : (
          <EmptyState
            title={siteCopy.issues.emptyTitle}
            description={siteCopy.issues.emptyDescription}
          />
        )}
      </div>
    </Section>
  );
}
