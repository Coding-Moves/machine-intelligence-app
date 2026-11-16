import { siteCopy } from "@/content/site";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";

export default function DraftPage() {
  const comingSoon = siteCopy.desk.comingSoon;

  return (
    <>
      <Section contained={false} variant="band" className="py-10 sm:py-12">
        <Container>
          <Eyebrow tone="sun">{siteCopy.desk.draftTitle}</Eyebrow>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl tracking-tight sm:text-5xl">
                {siteCopy.desk.draftTitle}
              </h1>
              <p className="mt-3 text-sm text-white/75">
                {siteCopy.desk.lastUpdated}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled
                title={comingSoon}
                variant="secondary"
                className="border-white/25 bg-transparent text-white hover:bg-transparent hover:text-white"
              >
                {siteCopy.desk.rebuild}
              </Button>
              <Button
                disabled
                title={comingSoon}
                variant="secondary"
                className="border-white/25 bg-transparent text-white hover:bg-transparent hover:text-white"
              >
                {siteCopy.desk.downloadPdf}
              </Button>
              <Button
                disabled
                title={comingSoon}
                variant="secondary"
                className="border-white/25 bg-transparent text-white hover:bg-transparent hover:text-white"
              >
                {siteCopy.desk.downloadOverleaf}
              </Button>
              <Button
                disabled
                title={comingSoon}
                className="border-sun bg-sun text-ink hover:border-sun hover:bg-sun"
              >
                {siteCopy.desk.publish}
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section contained={false} className="py-10 sm:py-14">
        <Container>
          <div className="border border-line bg-white">
            <div className="flex min-h-14 items-center justify-between border-b border-line px-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                {siteCopy.desk.preview}
              </h2>
              <span className="text-xs text-muted">{comingSoon}</span>
            </div>
            <div className="p-5 sm:p-8">
              <EmptyState
                title={siteCopy.desk.previewEmpty}
                description={siteCopy.desk.localOnly}
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
