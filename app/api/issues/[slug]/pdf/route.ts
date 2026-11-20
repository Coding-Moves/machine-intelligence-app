import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();
  const { data: edition, error } = await admin
    .from("editions")
    .select("id, status, pdf_path, tex_hash, pdf_tex_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (
    error ||
    !edition ||
    edition.status !== "published" ||
    !edition.pdf_path
  ) {
    return new Response("Published issue PDF not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (
    !edition.tex_hash ||
    edition.pdf_tex_hash !== edition.tex_hash ||
    edition.pdf_path !== `${edition.id}/${edition.tex_hash}.pdf`
  ) {
    return new Response("Published issue PDF not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { data: file, error: storageError } = await admin.storage
    .from("drafts")
    .createSignedUrl(edition.pdf_path, 900);
  if (storageError || !file?.signedUrl) {
    return new Response("Published issue PDF is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: file.signedUrl,
      "Cache-Control": "private, no-store",
    },
  });
}
