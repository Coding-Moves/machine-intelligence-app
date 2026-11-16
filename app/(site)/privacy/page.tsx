import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: siteCopy.privacy.intro,
};

export default function PrivacyPage() {
  return (
    <Section className="min-h-[65vh]">
      <PageHeading
        eyebrow={siteCopy.privacy.eyebrow}
        title={siteCopy.privacy.title}
        description={siteCopy.privacy.intro}
      />
      <div className="mt-12 max-w-3xl divide-y divide-line border-y border-line">
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">{siteCopy.privacy.trackingTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{siteCopy.privacy.trackingText}</p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">{siteCopy.privacy.editorTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{siteCopy.privacy.editorText}</p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">{siteCopy.privacy.storageTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{siteCopy.privacy.storageText}</p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">{siteCopy.privacy.contactTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{siteCopy.privacy.contactText}</p>
        </section>
      </div>
    </Section>
  );
}
