import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { magazine } from "@/config/magazine";
import { CoverArtwork } from "@/components/cover-artwork";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { getIssue, getIssues } from "@/lib/data/issues";

type IssuePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const issues = await getIssues();
  return issues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: IssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: siteCopy.issues.unknownTitle };
  return {
    title: issue.title,
    description: issue.inThisIssue.join(" · "),
    openGraph: {
      title: issue.title,
      description: issue.inThisIssue.join(" · "),
      images: issue.coverUrl ? [issue.coverUrl] : ["/opengraph-image"],
    },
  };
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) notFound();

  const dateLabel = issue.date
    ? new Date(issue.date).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : siteCopy.issues.dateUnknown;

  return (
    <>
      <Section contained={false} className="pb-12 sm:pb-16">
        <Container className="grid gap-10 md:grid-cols-[250px_1fr] md:items-start md:gap-14">
          {issue.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="aspect-[0.72] w-full max-w-[250px] border border-line object-cover"
              src={issue.coverUrl}
            />
          ) : (
            <CoverArtwork
              compact
              issueTitle={issue.title}
              issueDate={dateLabel}
              sample={issue.isMock}
            />
          )}
          <div className="pt-2">
            <Eyebrow>
              {issue.isMock ? siteCopy.issues.sample : siteCopy.home.issueLabel}
            </Eyebrow>
            <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
              {issue.title}
            </h1>
            <p className="mt-4 text-sm text-muted">{dateLabel}</p>
            {issue.isMock ? (
              <p className="mt-5 max-w-2xl border-l-2 border-leaf pl-4 text-sm leading-6 text-muted">
                {siteCopy.home.sampleNote}
              </p>
            ) : null}
            {issue.pdfUrl ? (
              <a
                className="mt-6 inline-flex rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
                href={issue.pdfUrl}
              >
                {siteCopy.home.pdf}
              </a>
            ) : null}
          </div>
        </Container>
      </Section>
      <Section variant="mist" className="border-y border-line">
        <Eyebrow>{siteCopy.home.contentsLabel}</Eyebrow>
        <ul className="mt-5 grid gap-x-10 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0">
          {issue.inThisIssue.map((item) => (
            <li key={item} className="py-4 text-sm leading-6 text-ink">
              {item}
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <Eyebrow>{siteCopy.issues.storiesHeading}</Eyebrow>
        <h2 className="mt-4 text-3xl tracking-tight">
          {siteCopy.issues.storiesTitle}
        </h2>
        {issue.stories.length ? (
          <div className="mt-8 divide-y divide-line border-y border-line">
            {issue.stories.map((story) => (
              <article key={story.id} className="py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-leaf">
                  {magazine.sections.find((section) => section.id === story.section)?.label ?? story.section}
                </p>
                <h3 className="mt-2 text-2xl leading-tight">
                  {story.headline}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  {story.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {story.sources.map((source) => (
                    <a
                      key={source.id}
                      className="rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
                      href={source.homepage}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-7">
            <EmptyState
              title={siteCopy.issues.storiesEmptyTitle}
              description={siteCopy.issues.storiesEmpty}
            />
          </div>
        )}
      </Section>
    </>
  );
}
