import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import {
  publicationEmailApprovalHash,
  publicationEmailIdempotencyKey,
  publicationRecipientConsentHash,
  renderPublicationEmail,
} from "@/lib/magazine/publication-email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const defaultSettings = {
  recipients: [] as string[],
  subject: "Machine Intelligence — {{issue_title}}",
  body: "Dear colleagues,\n\nPlease find attached the {{issue_title}} issue of Machine Intelligence, published {{issue_date}}.\n\nRead the issue online: {{issue_url}}\n\nRegards,\nMachine Intelligence Editorial Team",
} as const;

export function isPublicationEmailProviderConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.PUBLICATION_FROM_EMAIL,
  );
}

export async function getPublicationEmailSettings() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("publication_email_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const settings = data ?? {
    id: true,
    ...defaultSettings,
    faculty_approved_hash: null,
    consent_confirmed_hash: null,
    updated_at: new Date(0).toISOString(),
    updated_by: null,
  };
  const approvedHash = publicationEmailApprovalHash(settings);
  return {
    ...settings,
    faculty_approved: settings.faculty_approved_hash === approvedHash,
    recipient_consent_confirmed:
      settings.consent_confirmed_hash ===
      publicationRecipientConsentHash(settings.recipients),
    databaseReady: !error,
  };
}

function formatIssueDate(value: string | null) {
  return new Date(value ?? Date.now()).toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "long",
  });
}

async function prepareDeliveries(input: {
  editionId: string;
  approver: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: edition, error: editionError } = await admin
    .from("editions")
    .select("id, slug, title, status, published_at, pdf_path")
    .eq("id", input.editionId)
    .eq("status", "published")
    .maybeSingle();
  if (editionError || !edition) {
    throw new Error("Only a published issue can be emailed.");
  }
  if (!edition.pdf_path) {
    throw new Error("The published issue PDF is missing from private storage.");
  }
  const pdfPath = edition.pdf_path;

  const settings = await getPublicationEmailSettings();
  if (!settings.recipients.length) {
    throw new Error("Add recipients in the draft email settings first.");
  }
  if (!settings.faculty_approved) {
    throw new Error(
      "The faculty-approved email template changed or has not been approved.",
    );
  }
  if (!settings.recipient_consent_confirmed) {
    throw new Error(
      "Confirm that every recipient agreed to receive recurring issue emails.",
    );
  }

  const { data: subscriberRows, error: subscriberError } = await admin
    .from("publication_email_recipients")
    .select("email, unsubscribe_token, consented_at, unsubscribed_at")
    .in("email", settings.recipients);
  if (subscriberError) {
    throw new Error("Could not check email consent and unsubscribe records.");
  }
  const subscribersByEmail = new Map(
    (subscriberRows ?? []).map((subscriber) => [subscriber.email, subscriber]),
  );
  if (
    settings.recipients.some(
      (email) => !subscribersByEmail.get(email)?.consented_at,
    )
  ) {
    throw new Error(
      "Some recipients have no saved consent record. Confirm the recipient list again before sending.",
    );
  }
  const activeRecipients = settings.recipients.filter(
    (email) => !subscribersByEmail.get(email)?.unsubscribed_at,
  );
  if (!activeRecipients.length) {
    throw new Error(
      "All saved recipients have unsubscribed from issue emails.",
    );
  }

  const { NEXT_PUBLIC_SITE_URL } = getServerEnv();
  const issueUrl = new URL(
    `/issues/${encodeURIComponent(edition.slug)}`,
    NEXT_PUBLIC_SITE_URL,
  ).toString();
  const { data: existing, error: existingError } = await admin
    .from("publication_email_deliveries")
    .select("*")
    .eq("edition_id", input.editionId);
  if (existingError) {
    throw new Error("Could not check this issue's email status.");
  }
  const byRecipient = new Map(
    (existing ?? []).map((delivery) => [delivery.recipient, delivery]),
  );
  const activeRecipientSet = new Set(activeRecipients);
  const configuredRecipientSet = new Set(settings.recipients);
  for (const delivery of existing ?? []) {
    const active = activeRecipientSet.has(delivery.recipient);
    const unfinished =
      delivery.status !== "sent" && delivery.status !== "skipped";
    if (
      active &&
      unfinished &&
      (delivery.subject !== settings.subject || delivery.body !== settings.body)
    ) {
      throw new Error(
        "This issue already has an unfinished send using an earlier message. Retry only after the matching message has been restored and approved, or leave this issue email unchanged.",
      );
    }
    if (active || !["pending", "failed"].includes(delivery.status)) {
      continue;
    }
    const { error: skipError } = await admin
      .from("publication_email_deliveries")
      .update({
        status: "skipped",
        last_error: configuredRecipientSet.has(delivery.recipient)
          ? "Skipped because this recipient unsubscribed."
          : "Skipped because this recipient is no longer on the approved recipient list.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .in("status", ["pending", "failed"]);
    if (skipError) {
      throw new Error("Could not save the recipient's unsubscribe choice.");
    }
  }

  for (const recipient of activeRecipients) {
    if (byRecipient.has(recipient)) continue;
    const { data: created, error: insertError } = await admin
      .from("publication_email_deliveries")
      .insert({
        edition_id: input.editionId,
        recipient,
        subject: settings.subject,
        body: settings.body,
        idempotency_key: publicationEmailIdempotencyKey(
          input.editionId,
          recipient,
        ),
        approved_by: input.approver.toLowerCase(),
      })
      .select("*")
      .maybeSingle();
    if (created) {
      byRecipient.set(recipient, created);
      continue;
    }
    if (insertError?.code === "23505") {
      const { data: raced, error: raceError } = await admin
        .from("publication_email_deliveries")
        .select("*")
        .eq("edition_id", input.editionId)
        .eq("recipient", recipient)
        .maybeSingle();
      if (!raceError && raced) {
        byRecipient.set(recipient, raced);
        continue;
      }
    }
    throw new Error("Could not safely prepare the issue email.");
  }

  return {
    admin,
    edition,
    pdfPath,
    issueUrl,
    deliveries: activeRecipients.flatMap((recipient) => {
      const delivery = byRecipient.get(recipient);
      const unsubscribeToken =
        subscribersByEmail.get(recipient)?.unsubscribe_token;
      return delivery && unsubscribeToken
        ? [{ delivery, unsubscribeToken }]
        : [];
    }),
    skippedCount: settings.recipients.length - activeRecipients.length,
  };
}

function providerMessage(value: unknown) {
  if (!value || typeof value !== "object")
    return "Email provider returned an error.";
  const message = "message" in value ? value.message : null;
  return typeof message === "string"
    ? message.slice(0, 500)
    : "Email provider returned an error.";
}

async function finishDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  deliveryId: string,
  status: "sent" | "failed" | "unknown",
  providerId: string | null,
  error: string | null,
) {
  const { error: finishError } = await admin.rpc(
    "finish_publication_email_delivery",
    {
      p_delivery_id: deliveryId,
      p_status: status,
      p_provider_id: providerId,
      p_error: error,
    },
  );
  if (finishError)
    throw new Error("Could not record this recipient's email status.");
}

export async function sendPublishedIssueEmail(input: {
  editionId: string;
  approver: string;
  confirmNoPreviousDelivery?: boolean;
}) {
  if (!isPublicationEmailProviderConfigured()) {
    throw new Error(
      "Email is not configured yet. Add the Resend key and verified sender in Vercel.",
    );
  }
  const { RESEND_API_KEY, PUBLICATION_FROM_EMAIL, NEXT_PUBLIC_SITE_URL } =
    getServerEnv();
  if (!RESEND_API_KEY || !PUBLICATION_FROM_EMAIL) {
    throw new Error(
      "Email is not configured yet. Add the Resend key and verified sender in Vercel.",
    );
  }

  const prepared = await prepareDeliveries(input);
  const { admin, edition, pdfPath, issueUrl, deliveries, skippedCount } =
    prepared;
  const unknownDeliveries = deliveries.filter(
    ({ delivery }) => delivery.status === "unknown",
  );
  if (unknownDeliveries.length && !input.confirmNoPreviousDelivery) {
    throw new Error(
      "Delivery is uncertain. Check Resend's log for every uncertain recipient before confirming a retry.",
    );
  }
  for (const { delivery } of unknownDeliveries) {
    const { data: reset, error: resetError } = await admin
      .from("publication_email_deliveries")
      .update({
        status: "failed",
        last_error:
          "An editor checked the provider log and confirmed no email was sent before retrying.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .eq("status", "unknown")
      .select("id")
      .maybeSingle();
    if (resetError || !reset) {
      throw new Error(
        "An uncertain delivery changed while preparing the retry. Reload and check its status.",
      );
    }
  }

  const { data: pdf, error: pdfError } = await admin.storage
    .from("drafts")
    .download(pdfPath);
  if (pdfError || !pdf)
    throw new Error("Could not download the published issue PDF.");
  const pdfBase64 = Buffer.from(await pdf.arrayBuffer()).toString("base64");
  let sentCount = 0;

  for (const { delivery, unsubscribeToken } of deliveries) {
    if (delivery.status === "sent") {
      sentCount += 1;
      continue;
    }
    const unsubscribeUrl = new URL(
      `/api/publication-unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
      NEXT_PUBLIC_SITE_URL,
    ).toString();
    const rendered = renderPublicationEmail({
      subject: delivery.subject,
      body: delivery.body,
      issueTitle: edition.title,
      issueUrl,
      issueDate: formatIssueDate(edition.published_at),
      unsubscribeUrl,
    });
    if (!rendered.subject || rendered.subject.length > 180) {
      throw new Error("The saved issue email subject is invalid.");
    }

    const { data: claim, error: claimError } = await admin.rpc(
      "claim_publication_email_delivery",
      { p_delivery_id: delivery.id },
    );
    if (claimError) throw new Error(claimError.message);
    if (
      claim &&
      typeof claim === "object" &&
      !Array.isArray(claim) &&
      claim.status === "unknown"
    ) {
      throw new Error(
        "A recipient's previous send attempt did not finish. Check Resend's delivery log before retrying.",
      );
    }
    if (
      claim &&
      typeof claim === "object" &&
      !Array.isArray(claim) &&
      claim.status === "sent"
    ) {
      sentCount += 1;
      continue;
    }

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": delivery.idempotency_key,
        },
        body: JSON.stringify({
          from: PUBLICATION_FROM_EMAIL,
          to: [delivery.recipient],
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          attachments: [
            {
              filename: `${edition.slug}.pdf`,
              content: pdfBase64,
            },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      await finishDelivery(
        admin,
        delivery.id,
        "unknown",
        null,
        "No response from the email provider; check its delivery log before retrying.",
      );
      throw new Error(
        "Email delivery could not be confirmed. Check the Resend dashboard before retrying.",
      );
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // The HTTP status still determines whether this request was accepted.
    }
    if (!response.ok) {
      const uncertain = response.status >= 500;
      const message = providerMessage(payload);
      await finishDelivery(
        admin,
        delivery.id,
        uncertain ? "unknown" : "failed",
        null,
        message,
      );
      throw new Error(
        uncertain
          ? "Resend returned a server error. Check its delivery log before retrying."
          : `Resend could not send an issue email: ${message}`,
      );
    }

    const providerId = z.object({ id: z.string().min(1) }).safeParse(payload);
    if (!providerId.success) {
      await finishDelivery(
        admin,
        delivery.id,
        "unknown",
        null,
        "Provider accepted the request but returned no delivery ID.",
      );
      throw new Error(
        "Resend accepted a recipient email without a delivery ID. Check its delivery log.",
      );
    }

    await finishDelivery(admin, delivery.id, "sent", providerId.data.id, null);
    sentCount += 1;
  }

  return {
    status: "sent" as const,
    sentCount,
    totalCount: deliveries.length,
    skippedCount,
  };
}
