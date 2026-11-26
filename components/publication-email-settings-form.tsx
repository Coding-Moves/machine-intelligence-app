"use client";

import { useActionState } from "react";
import { savePublicationEmailSettings } from "@/app/desk/actions";
import type { EditorActionState } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";

const initialState: EditorActionState = { message: "", kind: "" };

export function PublicationEmailSettingsForm({
  recipients,
  subject,
  body,
  facultyApproved,
  recipientConsentConfirmed,
  providerConfigured,
  databaseReady,
}: {
  recipients: string[];
  subject: string;
  body: string;
  facultyApproved: boolean;
  recipientConsentConfirmed: boolean;
  providerConfigured: boolean;
  databaseReady: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    savePublicationEmailSettings,
    initialState,
  );

  return (
    <section className="border-line border bg-white p-5 sm:p-7">
      <div className="border-line border-b pb-5">
        <h2 className="font-serif text-2xl tracking-tight">
          Publication email
        </h2>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          Save the recipient list and reusable message here. The sender is the
          publication address configured in Vercel. A human must confirm faculty
          approval of the template and each final issue before sending.
        </p>
      </div>

      <p
        className={
          "mt-4 border-l-2 px-3 py-2 text-sm leading-6 " +
          (providerConfigured
            ? "border-[#28735a] bg-[#eef5ef] text-[#245b45]"
            : "border-[#b76b23] bg-[#fff7e9] text-[#704719]")
        }
      >
        {!databaseReady
          ? "Apply the publication email database migration before saving email settings."
          : providerConfigured
            ? "Email provider is configured. Sending still waits for the approval checkboxes below."
            : "Email provider setup is incomplete. Add RESEND_API_KEY and a verified PUBLICATION_FROM_EMAIL in Vercel before sending."}
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">
          Recipient emails (up to 50, one per line)
          <textarea
            name="recipients"
            rows={4}
            maxLength={5000}
            required
            defaultValue={recipients.join("\n")}
            className="border-line bg-paper mt-2 w-full rounded border p-3 font-normal"
            placeholder="faculty@example.edu\nvc-office@example.edu"
          />
        </label>
        <label className="block text-sm font-medium">
          Email subject
          <input
            name="subject"
            required
            minLength={4}
            maxLength={180}
            defaultValue={subject}
            className="border-line bg-paper mt-2 min-h-11 w-full rounded border px-3 font-normal"
          />
        </label>
        <label className="block text-sm font-medium">
          Reusable message
          <textarea
            name="body"
            rows={8}
            required
            minLength={40}
            maxLength={5000}
            defaultValue={body}
            className="border-line bg-paper mt-2 w-full rounded border p-3 font-normal"
          />
        </label>
        <p className="text-muted text-xs leading-5">
          Available placeholders: <code>{"{{issue_title}}"}</code>,{" "}
          <code>{"{{issue_date}}"}</code>, and <code>{"{{issue_url}}"}</code>.
          The published PDF is attached automatically. Each message is sent
          privately to one recipient and includes an unsubscribe link.
        </p>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            name="recipientConsentConfirmed"
            type="checkbox"
            defaultChecked={recipientConsentConfirmed}
            className="mt-1 size-4 accent-[#28735a]"
          />
          <span>
            I confirmed that every listed recipient explicitly agreed to receive
            recurring issue emails. Anyone who unsubscribes will be skipped in
            future sends.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            name="facultyApproved"
            type="checkbox"
            defaultChecked={facultyApproved}
            className="mt-1 size-4 accent-[#28735a]"
          />
          <span>
            Faculty reviewed and approved this exact recipient list and email
            template. Clear and save this if the approved details change.
          </span>
        </label>
        <Button type="submit" disabled={pending || !databaseReady}>
          {pending ? "Saving…" : "Save email settings"}
        </Button>
        {state.message ? (
          <p
            aria-live="polite"
            className={
              "text-sm " +
              (state.kind === "error" ? "text-[#8e443c]" : "text-leaf-dark")
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
