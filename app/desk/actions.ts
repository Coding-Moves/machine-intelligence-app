"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteCopy } from "@/content/site";
import { requireAdmin } from "@/lib/auth/require-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EditorActionState = {
  message: string;
  kind: "error" | "success" | "";
};

const emailSchema = z.string().trim().email();
const nameSchema = z.string().trim().min(2).max(80);

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
