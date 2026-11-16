import { getCronSecret } from "@/lib/env";
import { recordStubRun } from "@/lib/api/record-stub-run";
import { hasValidCronBearer } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getCronSecret();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "CRON_SECRET is missing or invalid.";
    return Response.json({ ok: false, error: message }, { status: 503 });
  }

  if (!hasValidCronBearer(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    // TODO(phase-2): validate the compile result and store its artifacts.
    const runId = await recordStubRun("compile_callback");
    return Response.json({ ok: true, runId, stub: true });
  } catch {
    return Response.json(
      { ok: false, error: "Could not record the compile callback." },
      { status: 503 },
    );
  }
}
