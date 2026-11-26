"use client";

import { useActionState } from "react";
import { sendPublishedIssueEmailAction } from "@/app/desk/actions";
import type { EditorActionState } from "@/app/desk/actions";
import { Button } from "@/components/ui/button";

const initialState: EditorActionState = { message: "", kind: "" };

export function PublicationEmailDeliveryForm({
  editionId,
  status,
  sentCount,
  totalCount,
}: {
  editionId: string;
  status:
    | "pending"
    | "sending"
    | "sent"
    | "failed"
    | "partial"
    | "unknown"
    | "skipped"
    | null;
  sentCount: number;
  totalCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    sendPublishedIssueEmailAction,
    initialState,
  );
  if (status === "sent") {
    return (
      <p className="text-leaf-dark text-sm">
        PDF email sent to {sentCount} recipient{sentCount === 1 ? "" : "s"}.
        {totalCount > sentCount
          ? ` ${totalCount - sentCount} recipient${totalCount - sentCount === 1 ? " was" : "s were"} skipped.`
          : ""}
      </p>
    );
  }
  if (status === "skipped") {
    return (
      <p className="text-muted text-sm">
        No issue email was sent because all saved recipients unsubscribed.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-3">
      <input type="hidden" name="editionId" value={editionId} />
      <label className="flex items-start gap-2 text-xs leading-5">
        <input
          name="issueApproved"
          type="checkbox"
          required
          className="mt-1 size-4 accent-[#28735a]"
        />
        <span>
          Faculty approved this exact published PDF and saved message for the
          subscribed recipients.
        </span>
      </label>
      {status === "unknown" ? (
        <label className="flex items-start gap-2 text-xs leading-5 text-[#704719]">
          <input
            name="confirmNoPreviousDelivery"
            type="checkbox"
            required
            className="mt-1 size-4 accent-[#28735a]"
          />
          <span>
            I checked Resend’s delivery log for every uncertain recipient and
            confirmed those emails were not sent. Only then retry them.
          </span>
        </label>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending
          ? "Sending…"
          : status === "unknown"
            ? "Confirm and retry email"
            : status === "failed" || status === "partial"
              ? `Retry unsent recipient emails (${sentCount}/${totalCount} sent)`
              : status === "sending"
                ? "Check send status"
                : "Send PDF email"}
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            "text-xs leading-5 " +
            (state.kind === "error" ? "text-[#8e443c]" : "text-leaf-dark")
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
