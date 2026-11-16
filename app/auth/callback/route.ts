import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/desk";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=sign-in-failed", requestUrl.origin),
      );
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.redirect(
      new URL("/login?error=sign-in-failed", requestUrl.origin),
    );
  }

  const { data: editor, error: editorError } = await supabase
    .from("editors")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (editorError || !editor) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=not-editor", requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
