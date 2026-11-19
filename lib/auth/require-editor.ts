import "server-only";

import { redirect } from "next/navigation";
import { hasPublicEnvironment } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireEditor() {
  if (!hasPublicEnvironment()) {
    redirect("/login?error=auth-unavailable");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    redirect("/login");
  }

  const { data: editor, error: editorError } = await supabase
    .from("editors")
    .select("email, name, role, created_at")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (editorError) {
    throw new Error("Could not verify editor access: " + editorError.message);
  }

  if (!editor) {
    await supabase.auth.signOut();
    redirect("/login?error=not-editor");
  }

  return { user, editor };
}

export async function requireAdmin() {
  const access = await requireEditor();
  if (access.editor.role !== "admin") {
    redirect("/desk?error=admin-required");
  }
  return access;
}
