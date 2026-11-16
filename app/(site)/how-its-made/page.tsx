import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";

export const metadata: Metadata = {
  title: siteCopy.nav.process,
  description: siteCopy.process.intro,
};

export default function HowItsMadePage() {
  return (
    <>
      <Section>
        <PageHeading
          eyebrow={siteCopy.process.eyebrow}
          title={siteCopy.process.title}
          description={siteCopy.process.intro}
        />
      </Section>
      <Section variant="mist" className="border-y border-line">
        <div className="grid gap-8 md:grid-cols-3">
          {siteCopy.process.steps.map((step) => (
            <article key={step.number} className="border-t border-line pt-5">
              <p className="font-serif text-2xl text-leaf">{step.number}</p>
              <h2 className="mt-4 text-2xl leading-tight">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section>
        <div className="max-w-3xl border-l-2 border-leaf pl-6">
          <Eyebrow>{siteCopy.process.ruleTitle}</Eyebrow>
          <p className="mt-4 text-xl leading-8 text-ink">{siteCopy.process.ruleText}</p>
        </div>
      </Section>
    </>
  );
}
