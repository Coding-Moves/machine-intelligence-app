import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCronSecret } from "@/lib/env";
import { hasValidCronBearer } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const requestSchema = z.object({ editionId: z.string().uuid().optional() });

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getCronSecret();
  } catch {
    return Response.json(
      { ok: false, error: "Cron authentication is not configured." },
      { status: 503 },
    );
  }

  if (!hasValidCronBearer(request.headers.get("authorization"), secret)) {
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return Response.json(
      { ok: false, error: "Invalid compile request." },
      { status: 400 },
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    let query = admin
      .from("editions")
      .select("id, status, tex_path, tex_hash")
      .eq("status", "draft");
    if (input.editionId) query = query.eq("id", input.editionId);
    const { data: edition, error } = await query.maybeSingle();
    if (error) throw new Error("Could not load the draft edition.");
    if (!edition) {
      return Response.json({
        ok: true,
        ready: false,
        reason: "No draft issue exists.",
      });
    }
    if (!edition.tex_path) {
      return Response.json({
        ok: true,
        ready: false,
        reason: "The draft has no TeX source yet.",
      });
    }
    if (!edition.tex_hash || !/^[a-f0-9]{64}$/.test(edition.tex_hash)) {
      return Response.json({
        ok: true,
        ready: false,
        reason:
          "Rebuild the draft to record its source fingerprint before compiling.",
      });
    }
    if (edition.tex_path !== `${edition.id}/${edition.tex_hash}.tex`) {
      throw new Error("The draft source path is invalid.");
    }

    const pdfPath = `${edition.id}/${edition.tex_hash}.pdf`;
    const [
      { data: source, error: sourceError },
      { data: upload, error: uploadError },
    ] = await Promise.all([
      admin.storage.from("drafts").createSignedUrl(edition.tex_path, 3600),
      admin.storage
        .from("drafts")
        .createSignedUploadUrl(pdfPath, { upsert: true }),
    ]);
    if (sourceError || !source?.signedUrl) {
      throw new Error("Could not create a temporary source download link.");
    }
    if (uploadError || !upload?.signedUrl) {
      throw new Error("Could not create a temporary PDF upload link.");
    }

    return Response.json({
      ok: true,
      ready: true,
      editionId: edition.id,
      texHash: edition.tex_hash,
      sourceUrl: source.signedUrl,
      pdfUploadUrl: upload.signedUrl,
      pdfPath,
    });
  } catch (error) {
    console.error("Could not prepare the draft PDF compile.", error);
    return Response.json(
      { ok: false, error: "Could not prepare the draft PDF compile." },
      { status: 503 },
    );
  }
}
