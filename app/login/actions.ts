"use server";

import { z } from "zod";
import { siteCopy } from "@/content/site";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  message: string;
  kind: "error" | "success" | "";
};

export async function sendMagicLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsedEmail = z.string().trim().email().safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { message: siteCopy.login.invalidEmail, kind: "error" };
  }

  const email = parsedEmail.data.toLowerCase();
  const admin = createSupabaseAdminClient();
  const { data: editor, error: lookupError } = await admin
    .from("editors")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { message: siteCopy.login.genericError, kind: "error" };
  }
  if (!editor) {
    return { message: siteCopy.login.notEditor, kind: "error" };
  }

  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const callbackUrl = new URL("/auth/callback", NEXT_PUBLIC_SITE_URL);
  callbackUrl.searchParams.set("next", "/desk");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { message: siteCopy.login.genericError, kind: "error" };
  }

  return {
    message: siteCopy.login.sent + " " + siteCopy.login.checkInbox,
    kind: "success",
  };
}
