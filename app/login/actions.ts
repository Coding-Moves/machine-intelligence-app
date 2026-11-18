"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { siteCopy } from "@/content/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  message: string;
  kind: "error" | "";
};

export async function signInEditor(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsedEmail = z.string().trim().email().safeParse(formData.get("email"));
  const parsedPassword = z.string().min(1).safeParse(formData.get("password"));
  if (!parsedEmail.success) {
    return { message: siteCopy.login.invalidEmail, kind: "error" };
  }
  if (!parsedPassword.success) {
    return { message: siteCopy.login.genericError, kind: "error" };
  }

  const email = parsedEmail.data.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsedPassword.data,
  });

  if (signInError || !data.user) {
    return { message: siteCopy.login.genericError, kind: "error" };
  }

  const signedInEmail = data.user.email?.toLowerCase();
  if (!signedInEmail || signedInEmail !== email) {
    await supabase.auth.signOut();
    return { message: siteCopy.login.genericError, kind: "error" };
  }

  const { data: editor, error: editorError } = await supabase
    .from("editors")
    .select("email")
    .eq("email", signedInEmail)
    .maybeSingle();

  if (editorError || !editor) {
    await supabase.auth.signOut();
    return { message: siteCopy.login.genericError, kind: "error" };
  }

  redirect("/desk");
}
