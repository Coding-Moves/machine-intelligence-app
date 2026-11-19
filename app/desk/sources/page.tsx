import { PageHeading } from "@/components/page-heading";
import { SourcesTable } from "@/components/sources-table";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SourcesPage() {
  await requireEditor();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("sources")
    .select("id, name, feed_url, homepage, region, kind, trust_weight, active")
    .order("active", { ascending: false })
    .order("name");
  if (error) throw new Error("Could not load the configured RSS sources.");
  const sources = (data ?? []).map((source) => ({
    id: source.id,
    name: source.name,
    feedUrl: source.feed_url,
    homepage: source.homepage,
    region: source.region,
    kind: source.kind,
    trustWeight: source.trust_weight,
    active: source.active,
  }));

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.sourcesTitle}
        title={siteCopy.desk.sourcesTitle}
        description={siteCopy.desk.sourcesIntro}
      />
      <div className="mt-10">
        <SourcesTable sources={sources} />
      </div>
    </Section>
  );
}
