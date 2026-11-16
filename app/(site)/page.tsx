import Link from "next/link";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import { getIssues } from "@/lib/data/issues";
import { CoverArtwork } from "@/components/cover-artwork";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";

function issueDate(date: string) {
  return date
    ? new Date(date).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : siteCopy.issues.dateUnknown;
}

export default async function HomePage() {
  const issues = await getIssues();
  const latest = issues.find((issue) => !issue.isMock);
  const sample = issues.find((issue) => issue.isMock);

  return (
    <>
      <Section className="pb-12 pt-16 sm:pb-16 sm:pt-24 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-2xl">
            <Eyebrow>{siteCopy.home.eyebrow}</Eyebrow>
            <h1 className="mt-6 max-w-[12ch] text-5xl leading-[0.99] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              {siteCopy.home.title}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {siteCopy.home.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                href={
                  latest
                    ? "/issues/" + latest.slug
                    : sample
                      ? "/issues/" + sample.slug
                      : "/issues"
                }
              >
                {latest
                  ? siteCopy.home.latest
                  : sample
                    ? siteCopy.home.sampleButton
                    : siteCopy.home.browse}
              </Button>
              <Button href="/issues" variant="secondary">
                {siteCopy.home.browse}
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[390px] lg:justify-self-end">
            {latest?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-[0.72] w-full border border-line object-cover"
                src={latest.coverUrl}
              />
            ) : (
              <CoverArtwork
                issueTitle={siteCopy.cover.headline}
                issueDate={siteCopy.cover.magazineLabel}
                sample={false}
              />
            )}
          </div>
        </div>
      </Section>

      <Section variant="mist" className="border-y border-line py-14 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-14">
          <div>
            <Eyebrow>{siteCopy.home.issueLabel}</Eyebrow>
            {latest ? (
              <>
                <h2 className="mt-4 font-serif text-3xl tracking-tight">
                  {latest.title}
                </h2>
                <p className="mt-3 text-sm text-muted">{issueDate(latest.date)}</p>
                {latest.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="mt-5 aspect-[0.72] w-full max-w-[190px] border border-line object-cover"
                    src={latest.coverUrl}
                  />
                ) : (
                  <div className="mt-5">
                    <CoverArtwork
                      compact
                      issueTitle={latest.title}
                      issueDate={issueDate(latest.date)}
                      sample={false}
                    />
                  </div>
                )}
                {latest.pdfUrl ? (
                  <a
                    className="mt-5 inline-flex rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
                    href={latest.pdfUrl}
                  >
                    {siteCopy.home.pdf}
                  </a>
                ) : null}
              </>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title={siteCopy.home.emptyIssueTitle}
                  description={siteCopy.home.emptyIssueDescription}
                  action={
                    sample ? (
                      <Link
                        className="rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
                        href={"/issues/" + sample.slug}
                      >
                        {siteCopy.home.sampleButton}
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
          {latest ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                {siteCopy.home.contentsLabel}
              </h3>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {latest.inThisIssue.map((item) => (
                  <li key={item} className="py-3 text-sm leading-6 text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : sample ? (
            <div>
              <Eyebrow>{siteCopy.issues.sample}</Eyebrow>
              <h2 className="mt-4 font-serif text-3xl tracking-tight">
                {sample.title}
              </h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {sample.inThisIssue.map((item) => (
                  <li key={item} className="py-3 text-sm leading-6 text-ink">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-6 text-muted">
                {siteCopy.home.sampleNote}
              </p>
            </div>
          ) : (
            <EmptyState
              title={siteCopy.home.emptyIssueTitle}
              description={siteCopy.home.emptyIssueDescription}
            />
          )}
        </div>
      </Section>

      <Section variant="band">
        <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:items-end">
          <div>
            <Eyebrow tone="sun">{siteCopy.home.coverageEyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-sm text-4xl leading-tight tracking-tight">
              {siteCopy.home.coverageTitle}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-4 md:border-t-0 md:pt-0">
            {magazine.sections.map((section, index) => (
              <div key={section.id}>
                <p className="font-serif text-2xl text-sun">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm text-white/85">{section.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:gap-14">
          <div>
            <Eyebrow>{siteCopy.home.howEyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-sm text-4xl leading-tight tracking-tight">
              {siteCopy.home.howTitle}
            </h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-3">
            {siteCopy.home.steps.map((step) => (
              <article key={step.number} className="border-t border-line pt-5">
                <p className="font-serif text-2xl text-leaf">{step.number}</p>
                <h3 className="mt-4 text-xl leading-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section variant="mist" className="border-t border-line">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Eyebrow>{siteCopy.home.closeEyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-3xl leading-tight tracking-tight sm:text-4xl">
              {siteCopy.home.closeTitle}
            </h2>
          </div>
          <Link
            className="w-fit rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
            href="/about"
          >
            {siteCopy.home.closeLink}
          </Link>
        </div>
      </Section>
    </>
  );
}
