import { z } from "zod";
import { DraftIssueEditor } from "@/components/draft-issue-editor";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { getDraftEdition } from "@/lib/magazine/build";
import { planItemSchema } from "@/lib/magazine/plan";
import { sortPlanItems } from "@/lib/magazine/layout";
import { readMagazineTemplate } from "@/lib/magazine/template";
import { requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { getDraftPublishReadiness } from "@/lib/magazine/publication";
import { PublicationEmailSettingsForm } from "@/components/publication-email-settings-form";
import {
  getPublicationEmailSettings,
  isPublicationEmailProviderConfigured,
} from "@/lib/magazine/publication-email-delivery";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export default async function DraftPage() {
  const access = await requireEditor();
  const edition = await getDraftEdition();
  const copy = siteCopy.desk;
  if (!edition) {
    return (
      <Section>
        <EmptyState
          title="No draft issue found"
          description="Apply the latest Supabase migrations to create the magazine draft."
        />
      </Section>
    );
  }

  const admin = createSupabaseAdminClient();
  const emailSettings =
    access.editor.role === "admin" ? await getPublicationEmailSettings() : null;
  const [texResult, pdfResult] = await Promise.all([
    edition.tex_path
      ? admin.storage.from("drafts").createSignedUrl(edition.tex_path, 3600)
      : Promise.resolve({ data: null }),
    edition.pdf_path
      ? admin.storage.from("drafts").createSignedUrl(edition.pdf_path, 3600)
      : Promise.resolve({ data: null }),
  ]);
  const pdfDownloadResult = edition.pdf_path
    ? await admin.storage
        .from("drafts")
        .createSignedUrl(edition.pdf_path, 3600, {
          download: "machine-intelligence-draft.pdf",
        })
    : { data: null };
  const texUrl = texResult.data?.signedUrl ?? null;
  const pdfUrl = pdfResult.data?.signedUrl ?? null;
  const pdfDownloadUrl = pdfDownloadResult.data?.signedUrl ?? null;
  const publishReadiness = await getDraftPublishReadiness(edition);
  const layout = asRecord(edition.layout);
  const plan = asRecord(layout.plan);
  const provider = plan.provider === "gemini" ? "gemini" : "fallback";
  const warning = typeof plan.warning === "string" ? plan.warning : null;
  const generatedAt =
    typeof plan.generatedAt === "string" ? plan.generatedAt : null;
  const template = readMagazineTemplate(edition.layout);
  const savedItems = z.array(planItemSchema).safeParse(plan.items);
  const orderedItems = savedItems.success
    ? sortPlanItems(savedItems.data, template.sections)
    : [];
  const plannedSections = template.sections.map((section) => ({
    ...section,
    stories: orderedItems.flatMap((item, index) =>
      item.section === section.id && edition.in_this_issue[index]
        ? [
            {
              headline: edition.in_this_issue[index],
              presentation: item.presentation,
            },
          ]
        : [],
    ),
  }));

  return (
    <>
      <Section contained={false} variant="band" className="py-10 sm:py-12">
        <Container>
          <Eyebrow tone="sun">{copy.draftTitle}</Eyebrow>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl tracking-tight sm:text-5xl">
                {edition.title}
              </h1>
              <p className="mt-3 text-sm text-white/75">
                {generatedAt
                  ? `Last generated ${new Date(generatedAt).toLocaleString("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC`
                  : "No magazine source has been generated yet."}
              </p>
            </div>
            {texUrl ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10"
                href={texUrl}
              >
                Download TeX source
              </a>
            ) : null}
          </div>
        </Container>
      </Section>

      <Section contained={false} className="py-10 sm:py-14">
        <Container>
          {emailSettings ? (
            <div className="mb-8">
              <PublicationEmailSettingsForm
                recipients={emailSettings.recipients}
                subject={emailSettings.subject}
                body={emailSettings.body}
                facultyApproved={emailSettings.faculty_approved}
                recipientConsentConfirmed={
                  emailSettings.recipient_consent_confirmed
                }
                providerConfigured={isPublicationEmailProviderConfigured()}
                databaseReady={emailSettings.databaseReady}
              />
            </div>
          ) : null}
          <DraftIssueEditor
            title={edition.title}
            template={template}
            editorNote={edition.editor_note ?? ""}
            editorNoteReviewed={edition.editor_note_approved}
            editionId={edition.id}
            publishNotBefore={
              edition.publish_not_before ??
              new Date(
                Date.parse(edition.created_at) + 7 * 24 * 60 * 60 * 1000,
              ).toISOString()
            }
            publishReadiness={publishReadiness}
            pdfUrl={pdfUrl}
            pdfDownloadUrl={pdfDownloadUrl}
            texUrl={texUrl}
            provider={provider}
            warning={warning}
            sections={plannedSections}
          />
        </Container>
      </Section>
    </>
  );
}
