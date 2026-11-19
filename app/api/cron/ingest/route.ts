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
    return Response.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    console.error("The authenticated ingest request failed.", error);
    return Response.json(
      { ok: false, error: "The ingest run could not be completed." },
      { status: 503 },
    );
  }
}
