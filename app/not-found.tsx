import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { siteCopy } from "@/content/site";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";

export default function NotFound() {
  return (
    <SiteShell>
      <Section className="min-h-[65vh]">
        <div className="max-w-2xl">
          <Eyebrow>{siteCopy.notFound.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-5xl leading-tight tracking-tight">
            {siteCopy.notFound.title}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted">
            {siteCopy.notFound.description}
          </p>
          <Link
            className="mt-7 inline-flex rounded-full border border-leaf bg-leaf px-5 py-3 text-sm font-medium text-white hover:bg-leaf-dark"
            href="/"
          >
            {siteCopy.notFound.returnHome}
          </Link>
        </div>
      </Section>
    </SiteShell>
  );
}
