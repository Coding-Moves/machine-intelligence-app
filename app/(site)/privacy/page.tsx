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
      <div className="divide-line border-line mt-12 max-w-3xl divide-y border-y">
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.trackingTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.trackingText}
          </p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.editorTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.editorText}
          </p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.storageTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.storageText}
          </p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.emailTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.emailText}
          </p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.aiTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.aiText}
          </p>
        </section>
        <section className="py-6">
          <h2 className="text-2xl tracking-tight">
            {siteCopy.privacy.contactTitle}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            {siteCopy.privacy.contactText}
          </p>
        </section>
      </div>
    </Section>
  );
}
