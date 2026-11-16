import type { Metadata } from "next";
import Link from "next/link";
import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "About",
  description: siteCopy.about.intro,
};

export default function AboutPage() {
  return (
    <>
      <Section>
        <PageHeading
          eyebrow={siteCopy.about.eyebrow}
          title={siteCopy.about.title}
          description={siteCopy.about.intro}
        />
      </Section>
      <Section variant="mist" className="border-y border-line">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-3xl tracking-tight">{siteCopy.about.purposeTitle}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
              {siteCopy.about.purpose}
            </p>
          </div>
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl tracking-tight">{siteCopy.about.supervisionTitle}</h2>
              <p className="mt-3 text-base text-ink">{magazine.supervisor.name}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{magazine.supervisor.title}</p>
              <p className="text-sm leading-6 text-muted">{magazine.universityShort}</p>
            </section>
            <section>
              <h2 className="text-2xl tracking-tight">{siteCopy.about.editorsTitle}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {magazine.editors.map((editor) => (
                  <li key={editor}>{editor}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </Section>
      <Section>
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          <section>
            <h2 className="text-2xl tracking-tight">{siteCopy.about.correctionTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{siteCopy.about.correction}</p>
            <a
              className="mt-4 inline-flex rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
              href="https://github.com/Coding-Moves/machine-intelligence-app/issues"
              target="_blank"
              rel="noreferrer"
            >
              {siteCopy.about.correctionLink}
            </a>
          </section>
          <section className="md:col-span-2">
            <h2 className="text-2xl tracking-tight">{siteCopy.about.contributionTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{siteCopy.about.contribution}</p>
            <Link
              className="mt-4 inline-flex rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
              href="https://github.com/Coding-Moves/machine-intelligence-app/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
            >
              {siteCopy.about.contributionLink}
            </Link>
          </section>
        </div>
      </Section>
    </>
  );
}
