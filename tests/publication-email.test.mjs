import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PUBLICATION_EMAIL_RECIPIENTS,
  parsePublicationRecipients,
  publicationEmailApprovalHash,
  publicationEmailIdempotencyKey,
  publicationRecipientConsentHash,
  renderPublicationEmail,
} from "../lib/magazine/publication-email.ts";

test("recipient input supports lines and separators, lowercases, and removes duplicates", () => {
  assert.deepEqual(
    parsePublicationRecipients(
      "HOD@nfciet.edu.pk; vc@nfciet.edu.pk\n hod@nfciet.edu.pk",
    ),
    ["hod@nfciet.edu.pk", "vc@nfciet.edu.pk"],
  );
});

test("recipient input rejects invalid addresses and more than 50 recipients", () => {
  assert.throws(() => parsePublicationRecipients("not-an-email"));
  const tooMany = Array.from(
    { length: MAX_PUBLICATION_EMAIL_RECIPIENTS + 1 },
    (_, index) => "person" + index + "@example.edu",
  ).join("\n");
  assert.throws(() => parsePublicationRecipients(tooMany), /no more than 50/);
});

test("faculty approval hash binds the exact recipient list and message", () => {
  const approved = {
    recipients: ["vc@example.edu", "hod@example.edu"],
    subject: "Issue {{issue_title}}",
    body: "Please read {{issue_url}}",
  };
  assert.equal(
    publicationEmailApprovalHash(approved),
    publicationEmailApprovalHash({
      ...approved,
      recipients: [...approved.recipients].reverse(),
    }),
  );
  assert.notEqual(
    publicationEmailApprovalHash(approved),
    publicationEmailApprovalHash({ ...approved, body: "Changed message" }),
  );
});

test("recipient consent hash binds the normalized recipient list, not the message", () => {
  assert.equal(
    publicationRecipientConsentHash(["a@example.edu", "b@example.edu"]),
    publicationRecipientConsentHash(["b@example.edu", "a@example.edu"]),
  );
  assert.notEqual(
    publicationRecipientConsentHash(["a@example.edu"]),
    publicationRecipientConsentHash(["b@example.edu"]),
  );
});

test("email rendering replaces issue fields and prevents subject line injection", () => {
  const rendered = renderPublicationEmail({
    subject: "Issue {{issue_title}}\nBcc: attacker@example.com",
    body: "Read {{issue_title}} on {{issue_date}}: {{issue_url}}",
    issueTitle: "AI <Review>",
    issueDate: "25 November 2026",
    issueUrl: "https://example.edu/issues/ai-review",
    unsubscribeUrl:
      "https://example.edu/api/publication-unsubscribe?token=secret",
  });
  assert.equal(rendered.subject, "Issue AI <Review> Bcc: attacker@example.com");
  assert.equal(
    rendered.text,
    "Read AI <Review> on 25 November 2026: https://example.edu/issues/ai-review\n\nYou are receiving this issue because you agreed to receive publication emails. Unsubscribe from future issue emails: https://example.edu/api/publication-unsubscribe?token=secret",
  );
  assert.doesNotMatch(rendered.subject, /[\r\n]/);
  assert.match(rendered.html, /AI &lt;Review&gt;/);
  assert.match(rendered.html, /<a href="https:\/\/example\.edu\/api/);
});

test("delivery idempotency key is stable per issue and recipient", () => {
  const first = publicationEmailIdempotencyKey("issue-one", "a@example.edu");
  assert.equal(
    first,
    publicationEmailIdempotencyKey("issue-one", "A@example.edu"),
  );
  assert.notEqual(
    first,
    publicationEmailIdempotencyKey("issue-one", "b@example.edu"),
  );
  assert.notEqual(
    first,
    publicationEmailIdempotencyKey("issue-two", "a@example.edu"),
  );
});
