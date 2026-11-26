import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const MAX_PUBLICATION_EMAIL_RECIPIENTS = 50;

const emailSchema = z.string().trim().email().max(254);

export function parsePublicationRecipients(value: string) {
  const entries = value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.length) {
    throw new Error("Add at least one recipient email address.");
  }
  if (entries.length > MAX_PUBLICATION_EMAIL_RECIPIENTS) {
    throw new Error(
      `Use no more than ${MAX_PUBLICATION_EMAIL_RECIPIENTS} recipient addresses.`,
    );
  }

  const invalid = entries.filter(
    (entry) => !emailSchema.safeParse(entry).success,
  );
  if (invalid.length) {
    throw new Error(`Check this recipient email address: ${invalid[0]}`);
  }
  return [...new Set(entries)];
}

export function publicationEmailApprovalHash(input: {
  recipients: string[];
  subject: string;
  body: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        recipients: [...input.recipients].sort(),
        subject: input.subject.trim(),
        body: input.body.trim(),
      }),
    )
    .digest("hex");
}

export function publicationRecipientConsentHash(recipients: string[]) {
  return createHash("sha256")
    .update(JSON.stringify([...recipients].sort()))
    .digest("hex");
}

export function createPublicationUnsubscribeToken() {
  return randomBytes(32).toString("base64url");
}

export function publicationEmailIdempotencyKey(
  editionId: string,
  recipient: string,
) {
  const recipientHash = createHash("sha256")
    .update(recipient.trim().toLowerCase())
    .digest("hex");
  return `machine-intelligence-issue-${editionId}-${recipientHash}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPublicationEmail(input: {
  subject: string;
  body: string;
  issueTitle: string;
  issueUrl: string;
  issueDate: string;
  unsubscribeUrl: string;
}) {
  const replaceTokens = (value: string) =>
    value
      .replaceAll("{{issue_title}}", input.issueTitle)
      .replaceAll("{{issue_url}}", input.issueUrl)
      .replaceAll("{{issue_date}}", input.issueDate);

  const body = replaceTokens(input.body).trim();
  return {
    subject: replaceTokens(input.subject)
      .replace(/[\r\n]+/g, " ")
      .trim(),
    text: `${body}\n\nYou are receiving this issue because you agreed to receive publication emails. Unsubscribe from future issue emails: ${input.unsubscribeUrl}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:normal">${escapeHtml(body).replace(/\n/g, "<br>")}</div><p style="font:12px Arial,sans-serif;color:#5d6d64">You are receiving this issue because you agreed to receive publication emails. <a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe from future issue emails</a>.</p>`,
  };
}
