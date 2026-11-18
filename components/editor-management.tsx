"use client";

import { useActionState } from "react";
import { addEditor, removeEditor } from "@/app/desk/actions";
import type { EditorActionState } from "@/app/desk/actions";
import type { EditorRole } from "@/lib/supabase/types";
import { siteCopy } from "@/content/site";
import { Button } from "@/components/ui/button";

const initialState: EditorActionState = { message: "", kind: "" };

export type EditorRow = {
  email: string;
  name: string;
  role: EditorRole;
  created_at: string;
};

function ActionMessage({ state }: { state: EditorActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={
        "mt-3 text-sm " +
        (state.kind === "error" ? "text-[#8e443c]" : "text-leaf-dark")
      }
    >
      {state.message}
    </p>
  );
}

export function AddEditorForm() {
  const [state, formAction, pending] = useActionState(addEditor, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-4 border-y border-line py-6 md:grid-cols-[1fr_1fr_auto]"
    >
      <label className="text-sm font-medium text-ink">
        {siteCopy.desk.editorName}
        <input
          autoComplete="name"
          className="mt-2 min-h-11 w-full rounded border border-line bg-white px-3 font-normal"
          maxLength={80}
          minLength={2}
          name="name"
          required
        />
      </label>
      <label className="text-sm font-medium text-ink">
        {siteCopy.desk.editorEmail}
        <input
          autoComplete="email"
          className="mt-2 min-h-11 w-full rounded border border-line bg-white px-3 font-normal"
          name="email"
          required
          type="email"
        />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? siteCopy.desk.savingEditor : siteCopy.desk.addEditor}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted md:col-span-3">
        {siteCopy.desk.editorAddHelp}
      </p>
      <div className="md:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function RemoveEditorForm({
  email,
  disabled = false,
}: {
  email: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(removeEditor, initialState);

  return (
    <div>
      <form action={formAction}>
        <input name="email" type="hidden" value={email} />
        <Button
          className="min-h-9 border-[#e7c9c3] px-3 text-xs text-[#8e443c] hover:border-[#8e443c] hover:text-[#743b34]"
          disabled={disabled || pending}
          title={disabled ? siteCopy.desk.editorSelfRemove : undefined}
          type="submit"
          variant="secondary"
        >
          {siteCopy.desk.removeEditor}
        </Button>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
