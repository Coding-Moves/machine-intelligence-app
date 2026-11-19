import { getCronSecret } from "@/lib/env";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { runIngest } from "@/lib/ingest/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const result = await runIngest();
    // Feed-level failures are included in the run record. The automation still
    // needs to run the PDF compiler for the current draft after a partial fetch.
    return Response.json(result);
  } catch (error) {
    console.error("The authenticated ingest request failed.", error);
    return Response.json(
      { ok: false, error: "The ingest run could not be completed." },
      { status: 503 },
    );
  }
}
