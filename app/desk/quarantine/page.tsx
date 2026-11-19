import { PageHeading } from "@/components/page-heading";
import {
  QuarantineBoard,
  type QuarantinedStory,
} from "@/components/quarantine-board";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function QuarantinePage() {
  await requireEditor();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stories")
    .select("id, headline, summary, reject_reason")
    .eq("status", "rejected")
    .order("last_updated_at", { ascending: false });
  if (error) throw new Error("Could not load rejected stories.");
  const stories: QuarantinedStory[] = (data ?? []).map((story) => ({
    id: story.id,
    headline: story.headline,
    summary: story.summary,
    rejectReason: story.reject_reason,
  }));

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.quarantineTitle}
        title={siteCopy.desk.quarantineTitle}
        description="Rejected stories stay out of the magazine. Restore one to put it back in the review queue."
      />
      <div className="mt-10">
        <QuarantineBoard stories={stories} />
      </div>
    </Section>
  );
}
