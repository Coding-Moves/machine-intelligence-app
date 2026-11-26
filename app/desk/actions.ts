"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteCopy } from "@/content/site";
import { requireAdmin, requireEditor } from "@/lib/auth/require-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchRowsByIds } from "@/lib/supabase/batched-query";
import {
  invalidateCurrentDraftArtifacts,
  rebuildMagazineDraft,
  refreshDraftTex,
  saveDraftEditorNote,
  saveDraftTemplate,
} from "@/lib/magazine/build";
import { sectionLayoutChanged } from "@/lib/magazine/layout";
import {
  magazineTemplateSchema,
  readMagazineTemplate,
} from "@/lib/magazine/template";
import { getDraftPublishReadiness } from "@/lib/magazine/publication";
import { unsupportedNumbers } from "@/lib/ingest/scoring";
import { dispatchDraftCompile } from "@/lib/magazine/compile-dispatch";
import {
  publicationEmailApprovalHash,
  publicationRecipientConsentHash,
  createPublicationUnsubscribeToken,
  parsePublicationRecipients,
} from "@/lib/magazine/publication-email";
import { sendPublishedIssueEmail } from "@/lib/magazine/publication-email-delivery";

export type EditorActionState = {
  message: string;
  kind: "error" | "success" | "";
};

const emailSchema = z.string().trim().email();
const nameSchema = z.string().trim().min(2).max(80);
const storyIdSchema = z.string().uuid();
const storyStatusSchema = z.enum(["candidate", "rejected"]);
const storySectionSchema = z.enum([
  "pakistan",
  "global",
  "research",
  "industry",
]);

async function rebuildAndDispatchDraft() {
  const rebuilt = await rebuildMagazineDraft();
  await dispatchDraftCompile(rebuilt.editionId);
}

async function refreshAndDispatchDraft(editionId: string) {
  await refreshDraftTex(editionId);
  await dispatchDraftCompile(editionId);
}

async function getTrustedStoryEvidence(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  storyId: string,
) {
  const { data: articles, error: articlesError } = await admin
    .from("articles")
    .select("source_id, content_text")
    .eq("story_id", storyId);
  if (articlesError) throw new Error("Could not load story source evidence.");
  const sourceIds = [
    ...new Set((articles ?? []).map((article) => article.source_id)),
  ];
  const { data: sources, error: sourcesError } = sourceIds.length
    ? await fetchRowsByIds(sourceIds, (ids, from, to) =>
        admin
          .from("sources")
          .select("id")
          .in("id", ids)
          .eq("trusted", true)
          .order("id", { ascending: true })
          .range(from, to),
      )
    : { data: [], error: null };
  if (sourcesError) throw new Error("Could not verify trusted story sources.");
  const trustedSourceIds = new Set((sources ?? []).map((source) => source.id));
  return (articles ?? []).filter((article) =>
    trustedSourceIds.has(article.source_id),
  );
}

async function verifyAdmin() {
  const { user, editor } = await requireAdmin();
  return { email: user.email?.toLowerCase() ?? editor.email };
}

export async function addEditor(
  _previousState: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  await verifyAdmin();

  const parsedName = nameSchema.safeParse(formData.get("name"));
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedName.success || !parsedEmail.success) {
    return { message: siteCopy.desk.editorInvalid, kind: "error" };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("editors").insert({
    email: parsedEmail.data.toLowerCase(),
    name: parsedName.data,
    role: "editor",
  });

  if (error?.code === "23505") {
    return { message: siteCopy.desk.editorDuplicate, kind: "error" };
  }
  if (error) {
    return { message: siteCopy.desk.editorActionError, kind: "error" };
  }

  revalidatePath("/desk/editors");
  return { message: siteCopy.desk.editorCreated, kind: "success" };
}

export async function removeEditor(
  _previousState: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const actor = await verifyAdmin();
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { message: siteCopy.desk.editorInvalid, kind: "error" };
  }

  const email = parsedEmail.data.toLowerCase();
  if (email === actor.email) {
    return { message: siteCopy.desk.editorSelfRemove, kind: "error" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: target, error: lookupError } = await supabase
    .from("editors")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { message: siteCopy.desk.editorActionError, kind: "error" };
  }
  if (!target) {
    return { message: siteCopy.desk.editorNotFound, kind: "error" };
  }

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("editors")
      .select("email", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      return { message: siteCopy.desk.editorActionError, kind: "error" };
    }
    if ((count ?? 0) <= 1) {
      return { message: siteCopy.desk.editorLastAdmin, kind: "error" };
    }
  }

  const { error } = await supabase.from("editors").delete().eq("email", email);
  if (error) {
    return { message: siteCopy.desk.editorActionError, kind: "error" };
  }

  revalidatePath("/desk/editors");
  return { message: siteCopy.desk.editorRemoved, kind: "success" };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setStoryStatus(formData: FormData) {
  await requireEditor();
  const id = storyIdSchema.safeParse(formData.get("storyId"));
  const status = storyStatusSchema.safeParse(formData.get("status"));
  const rejectReason = z
    .string()
    .trim()
    .max(500)
    .safeParse(formData.get("rejectReason") ?? "");
  if (!id.success || !status.success || !rejectReason.success) {
    throw new Error("Invalid story review update.");
  }

  const admin = createSupabaseAdminClient();
  const { data: story, error: lookupError } = await admin
    .from("stories")
    .select("status, needs_reprocess")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError || !story) throw new Error("Could not find that story.");
  if (story.status === "ready" || story.status === "approved") {
    await invalidateCurrentDraftArtifacts();
  }

  const { data: updatedStory, error } = await admin
    .from("stories")
    .update({
      status: status.data,
      needs_reprocess:
        status.data === "candidate" ? true : story.needs_reprocess,
      last_updated_at: new Date().toISOString(),
      reject_reason:
        status.data === "rejected" ? rejectReason.data || null : null,
    })
    .eq("id", id.data)
    .neq("status", "published")
    .select("id")
    .maybeSingle();
  if (error || !updatedStory)
    throw new Error("Could not save the story review decision.");
  if (story.status === "ready" || story.status === "approved") {
    await rebuildAndDispatchDraft();
  }
  revalidatePath("/desk/stories");
  revalidatePath("/desk/quarantine");
  revalidatePath("/desk");
}

export async function saveStoryEdit(formData: FormData) {
  await requireEditor();
  const id = storyIdSchema.safeParse(formData.get("storyId"));
  const headline = z
    .string()
    .trim()
    .min(8)
    .max(300)
    .safeParse(formData.get("headline"));
  const summary = z
    .string()
    .trim()
    .min(40)
    .max(3000)
    .safeParse(formData.get("summary"));
  const section = storySectionSchema.safeParse(formData.get("section"));
  if (
    !id.success ||
    !headline.success ||
    !summary.success ||
    !section.success
  ) {
    throw new Error("Enter a headline, summary, and section before saving.");
  }

  const admin = createSupabaseAdminClient();
  const { data: story, error: lookupError } = await admin
    .from("stories")
    .select("status, key_facts")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError || !story) throw new Error("Could not find that story.");
  const trustedEvidence = await getTrustedStoryEvidence(admin, id.data);
  const sourceTexts = trustedEvidence.map((article) => article.content_text);
  const hasTrustedEvidence = trustedEvidence.length > 0;
  const keyFacts = z
    .array(z.object({ value: z.string() }))
    .safeParse(story.key_facts);
  const unsupported = unsupportedNumbers(
    [
      summary.data,
      ...(keyFacts.success ? keyFacts.data.map((fact) => fact.value) : []),
    ],
    sourceTexts,
  );
  if (story.status === "ready" || story.status === "approved")
    await invalidateCurrentDraftArtifacts();

  const { data: updatedStory, error } = await admin
    .from("stories")
    .update({
      headline: headline.data,
      summary: summary.data,
      section: section.data,
      last_updated_at: new Date().toISOString(),
      verification: {
        failed: unsupported.length > 0,
        unsupported_numbers: unsupported,
      },
      status:
        (story.status === "ready" || story.status === "approved") &&
        (unsupported.length > 0 || !hasTrustedEvidence)
          ? "rejected"
          : story.status,
      reject_reason:
        (story.status === "ready" || story.status === "approved") &&
        (unsupported.length > 0 || !hasTrustedEvidence)
          ? !hasTrustedEvidence
            ? "No trusted source evidence is currently linked to this story."
            : `The automatic numeric check found claims not present in trusted source text: ${unsupported.join(", ")}.`
          : null,
    })
    .eq("id", id.data)
    .neq("status", "published")
    .select("id")
    .maybeSingle();
  if (error || !updatedStory)
    throw new Error("Could not save the story changes.");
  if (story.status === "ready" || story.status === "approved")
    await rebuildAndDispatchDraft();
  revalidatePath("/desk/stories");
  revalidatePath("/desk");
}

export async function setImageApproval(formData: FormData) {
  await requireEditor();
  const id = storyIdSchema.safeParse(formData.get("imageId"));
  const approvedValue = z
    .enum(["true", "false"])
    .safeParse(formData.get("approved"));
  if (!id.success || !approvedValue.success) {
    throw new Error("Invalid image review update.");
  }

  const admin = createSupabaseAdminClient();
  const { data: image, error: lookupError } = await admin
    .from("images")
    .select("id, story_id, license")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError || !image)
    throw new Error("Could not find that illustration.");
  if (image.license !== "own") {
    throw new Error(
      "Only publication-owned illustrations can be approved here.",
    );
  }

  const approved = approvedValue.data === "true";
  const { error } = await admin
    .from("images")
    .update({ approved })
    .eq("id", image.id)
    .eq("license", "own");
  if (error) throw new Error("Could not save the illustration review.");

  if (image.story_id) {
    const { data: story, error: storyError } = await admin
      .from("stories")
      .select("status")
      .eq("id", image.story_id)
      .maybeSingle();
    if (storyError) throw new Error("Could not load the illustration's story.");
    if (story?.status === "ready" || story?.status === "approved") {
      await invalidateCurrentDraftArtifacts();
      await rebuildAndDispatchDraft();
    }
  }

  revalidatePath("/desk/images");
  revalidatePath("/desk/stories");
  revalidatePath("/desk");
}

export async function saveDraftTemplateAction(formData: FormData) {
  await requireEditor();
  const admin = createSupabaseAdminClient();
  const { data: edition, error } = await admin
    .from("editions")
    .select("id, layout")
    .eq("status", "draft")
    .maybeSingle();
  if (error || !edition)
    throw new Error("Could not find the current draft issue.");

  const current = readMagazineTemplate(edition.layout);
  const sections = current.sections.map((section) => {
    const label = z
      .string()
      .trim()
      .min(2)
      .max(40)
      .safeParse(formData.get(`section.${section.id}.label`));
    const slots = z
      .string()
      .regex(/^(?:[0-9]|1[0-2])$/)
      .transform(Number)
      .safeParse(formData.get(`section.${section.id}.slots`));
    if (!label.success || !slots.success)
      throw new Error(
        "Each section needs a label and a slot count from 0 to 12.",
      );
    return { ...section, label: label.data, slots: slots.data };
  });
  const editorsValue = z.string().max(1000).safeParse(formData.get("editors"));
  const template = magazineTemplateSchema.safeParse({
    publicationName: formData.get("publicationName"),
    coverSubtitle: formData.get("coverSubtitle"),
    coverTagline: formData.get("coverTagline"),
    backCoverNote: formData.get("backCoverNote"),
    supervisorName: formData.get("supervisorName"),
    supervisorTitle: formData.get("supervisorTitle"),
    editors: editorsValue.success
      ? editorsValue.data
          .split(/[\n,]/)
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
    theme: formData.get("theme"),
    sections,
  });
  const title = z
    .string()
    .trim()
    .min(4)
    .max(100)
    .safeParse(formData.get("title"));
  if (!template.success || !title.success) {
    throw new Error(
      "Check the issue title, cover details, editor list, theme, and section settings.",
    );
  }
  const editionId = await saveDraftTemplate({
    title: title.data,
    template: template.data,
  });
  if (sectionLayoutChanged(current.sections, template.data.sections)) {
    const rebuilt = await rebuildMagazineDraft({ preserveEditorNote: true });
    await dispatchDraftCompile(rebuilt.editionId);
  } else {
    await refreshAndDispatchDraft(editionId);
  }
  revalidatePath("/desk");
  revalidatePath("/desk/issues");
}

export async function saveDraftEditorNoteAction(formData: FormData) {
  await requireEditor();
  const note = z
    .string()
    .trim()
    .max(1800)
    .safeParse(formData.get("editorNote"));
  const approved = formData.get("reviewed") === "on";
  if (!note.success || (approved && note.data.length < 40)) {
    throw new Error(
      "Write at least 40 characters before marking the editor's note reviewed.",
    );
  }
  const editionId = await saveDraftEditorNote({ note: note.data, approved });
  await refreshAndDispatchDraft(editionId);
  revalidatePath("/desk");
}

export async function savePublicationEmailSettings(
  _previousState: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const actor = await verifyAdmin();
  const recipientsText = z
    .string()
    .max(5000)
    .safeParse(formData.get("recipients"));
  const subject = z
    .string()
    .trim()
    .min(4)
    .max(180)
    .safeParse(formData.get("subject"));
  const body = z
    .string()
    .trim()
    .min(40)
    .max(5000)
    .safeParse(formData.get("body"));
  if (!recipientsText.success || !subject.success || !body.success) {
    return {
      message:
        "Add recipients, a subject, and an email message within the length limits.",
      kind: "error",
    };
  }

  let recipients: string[];
  try {
    recipients = parsePublicationRecipients(recipientsText.data);
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Check the recipient addresses.",
      kind: "error",
    };
  }
  const invalidTokens = [subject.data, body.data].some((value) => {
    const tokens = value.match(/{{[^}]+}}/g) ?? [];
    return tokens.some(
      (token) =>
        !["{{issue_title}}", "{{issue_url}}", "{{issue_date}}"].includes(token),
    );
  });
  if (invalidTokens) {
    return {
      message:
        "Use only {{issue_title}}, {{issue_url}}, and {{issue_date}} as message placeholders.",
      kind: "error",
    };
  }

  const facultyApproved = formData.get("facultyApproved") === "on";
  const consentConfirmed = formData.get("recipientConsentConfirmed") === "on";
  const approvedHash = publicationEmailApprovalHash({
    recipients,
    subject: subject.data,
    body: body.data,
  });
  const admin = createSupabaseAdminClient();
  const { data: previousSettings, error: previousError } = await admin
    .from("publication_email_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (previousError) {
    return {
      message: "Could not read the current email approval.",
      kind: "error",
    };
  }
  const previousHash = previousSettings
    ? publicationEmailApprovalHash(previousSettings)
    : null;
  if (consentConfirmed) {
    const { error: consentError } = await admin.rpc(
      "record_publication_email_consent",
      {
        p_emails: recipients,
        p_tokens: recipients.map(() => createPublicationUnsubscribeToken()),
      },
    );
    if (consentError) {
      return {
        message: "Could not save recipient consent and unsubscribe settings.",
        kind: "error",
      };
    }
  }
  const changedAfterApproval =
    previousSettings?.faculty_approved_hash === previousHash &&
    previousHash !== approvedHash;
  if (facultyApproved && changedAfterApproval) {
    return {
      message:
        "These details changed after faculty approval. Save them with the approval box clear, obtain approval for the updated version, then check and save again.",
      kind: "error",
    };
  }
  const { error } = await admin.from("publication_email_settings").upsert({
    id: true,
    recipients,
    subject: subject.data,
    body: body.data,
    faculty_approved_hash: facultyApproved ? approvedHash : null,
    consent_confirmed_hash: consentConfirmed
      ? publicationRecipientConsentHash(recipients)
      : null,
    updated_at: new Date().toISOString(),
    updated_by: actor.email,
  });
  if (error)
    return {
      message: "Could not save publication email settings.",
      kind: "error",
    };
  revalidatePath("/desk");
  revalidatePath("/desk/issues");
  return {
    message: facultyApproved
      ? "Email settings saved with faculty approval for this exact template and recipient list."
      : "Email settings saved. The faculty-approved checkbox is clear, so sending is disabled.",
    kind: "success",
  };
}

export async function sendPublishedIssueEmailAction(
  _previousState: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const actor = await verifyAdmin();
  const editionId = storyIdSchema.safeParse(formData.get("editionId"));
  const issueApproval = formData.get("issueApproved") === "on";
  const confirmNoPreviousDelivery =
    formData.get("confirmNoPreviousDelivery") === "on";
  if (!editionId.success || !issueApproval) {
    return {
      message:
        "Confirm faculty approval of this exact published issue before emailing it.",
      kind: "error",
    };
  }
  try {
    const result = await sendPublishedIssueEmail({
      editionId: editionId.data,
      approver: actor.email,
      confirmNoPreviousDelivery,
    });
    revalidatePath("/desk/issues");
    return {
      message: `Sent the PDF to ${result.sentCount} recipient${result.sentCount === 1 ? "" : "s"}.${result.skippedCount ? ` Skipped ${result.skippedCount} unsubscribed recipient${result.skippedCount === 1 ? "" : "s"}.` : ""}`,
      kind: "success",
    };
  } catch (error) {
    revalidatePath("/desk/issues");
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not send the issue email.",
      kind: "error",
    };
  }
}

export async function rebuildDraftAction() {
  await requireEditor();
  await rebuildAndDispatchDraft();
  revalidatePath("/desk");
  revalidatePath("/desk/stories");
}

export async function compileDraftAction(formData: FormData) {
  await requireEditor();
  const id = storyIdSchema.safeParse(formData.get("editionId"));
  if (!id.success) throw new Error("Invalid draft edition.");
  await dispatchDraftCompile(id.data);
  revalidatePath("/desk");
}

export async function publishDraftAction(formData: FormData) {
  await requireEditor();
  const id = storyIdSchema.safeParse(formData.get("editionId"));
  if (!id.success) throw new Error("Invalid draft edition.");

  const admin = createSupabaseAdminClient();
  const { data: edition, error: editionError } = await admin
    .from("editions")
    .select("*")
    .eq("id", id.data)
    .eq("status", "draft")
    .maybeSingle();
  if (editionError || !edition)
    throw new Error("This draft is no longer available.");

  const readiness = await getDraftPublishReadiness(edition);
  if (!readiness.canPublish) {
    throw new Error(
      `This issue is not ready to publish: ${readiness.blockers.join(" ")}`,
    );
  }

  const { error } = await admin.rpc("publish_draft_edition", {
    p_edition_id: id.data,
  });
  if (error) {
    throw new Error(
      error.message || "The database could not publish this issue.",
    );
  }

  revalidatePath("/");
  revalidatePath("/issues");
  revalidatePath("/desk");
  revalidatePath("/desk/issues");
  redirect("/desk/issues?published=1");
}
