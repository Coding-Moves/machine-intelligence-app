"use client";

import { useActionState } from "react";
import type { LoginActionState } from "@/app/login/actions";
import { sendMagicLink } from "@/app/login/actions";
import { siteCopy } from "@/content/site";
import { Button } from "@/components/ui/button";

const initialState: LoginActionState = { message: "", kind: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 max-w-md">
      <label
        className="mb-2 block text-sm font-medium text-ink"
        htmlFor="email"
      >
        {siteCopy.login.email}
      </label>
      <input
        autoComplete="email"
        className="min-h-12 w-full rounded border border-line bg-white px-4 text-base text-ink placeholder:text-muted focus-visible:border-leaf"
        id="email"
        name="email"
        placeholder={siteCopy.login.placeholder}
        required
        type="email"
      />
      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          {pending ? siteCopy.login.sending : siteCopy.login.submit}
        </Button>
      </div>
      <p
        aria-live="polite"
        className={
          "mt-4 min-h-6 text-sm leading-6 " +
          (state.kind === "error" ? "text-[#8e443c]" : "text-leaf-dark")
        }
      >
        {state.message}
      </p>
    </form>
  );
}
