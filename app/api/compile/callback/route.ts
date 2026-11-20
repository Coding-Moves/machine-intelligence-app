import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCronSecret } from "@/lib/env";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const callbackSchema = z.object({
  editionId: z.string().uuid(),
  success: z.boolean(),
  texHash: z.string().regex(/^[a-f0-9]{64}$/),
  pdfPath: z.string().max(300).optional(),
  error: z.string().trim().max(1000).optional(),
});

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

  let input: z.infer<typeof callbackSchema>;
  try {
    input = callbackSchema.parse(await request.json());
  } catch {
    return Response.json(
      { ok: false, error: "Invalid compile callback." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const expectedPdfPath = `${input.editionId}/${input.texHash}.pdf`;
  if (input.success && input.pdfPath !== expectedPdfPath) {
    return Response.json(
      { ok: false, error: "The PDF path does not match the draft." },
      { status: 400 },
    );
  }

  const { data: draft, error: draftError } = await admin
    .from("editions")
    .select("id, tex_hash")
    .eq("id", input.editionId)
    .eq("status", "draft")
    .maybeSingle();
  if (draftError || !draft) {
    return Response.json(
      { ok: false, error: "The draft edition could not be found." },
      { status: 409 },
    );
  }
  if (draft.tex_hash !== input.texHash) {
    return Response.json(
      {
        ok: false,
        error:
          "The draft changed while its PDF was compiling. Compile the latest draft again.",
      },
      { status: 409 },
    );
  }

  if (input.success) {
    const { data: files, error: storageError } = await admin.storage
      .from("drafts")
      .list(input.editionId, {
        limit: 100,
        search: `${input.texHash}.pdf`,
      });
    if (
      storageError ||
      !files?.some((file) => file.name === `${input.texHash}.pdf`)
    ) {
      return Response.json(
        {
          ok: false,
          error: "The compiled PDF was not found in draft storage.",
        },
        { status: 409 },
      );
    }
  }

  const { data: edition, error: editionError } = await admin
    .from("editions")
    .update({
      pdf_path: input.success ? expectedPdfPath : null,
      pdf_tex_hash: input.success ? input.texHash : null,
    })
    .eq("id", input.editionId)
    .eq("status", "draft")
    .eq("tex_hash", input.texHash)
    .select("id")
    .maybeSingle();
  if (editionError || !edition) {
    return Response.json(
      { ok: false, error: "The draft edition could not be updated." },
      { status: 409 },
    );
  }

  const details = {
    editionId: input.editionId,
    texHash: input.texHash,
    pdfPath: input.success ? expectedPdfPath : null,
    error: input.success ? null : (input.error ?? "LaTeX compilation failed."),
  } as unknown as Json;
  const { data: run, error: runError } = await admin
    .from("runs")
    .insert({
      kind: "compile",
      started_at: now,
      finished_at: now,
      ok: input.success,
      details,
      errors: input.success
        ? ([] as unknown as Json)
        : ([
            {
              source: "LaTeX compiler",
              message: input.error ?? "Compilation failed.",
            },
          ] as unknown as Json),
    })
    .select("id")
    .single();

  if (runError || !run) {
    return Response.json(
      { ok: false, error: "Could not record the compile result." },
      { status: 503 },
    );
  }
  return Response.json({
    ok: true,
    runId: run.id,
    editionId: edition.id,
    compiled: input.success,
  });
}
