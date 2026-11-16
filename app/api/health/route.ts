export const runtime = "nodejs";
export const preferredRegion = "bom1";

export function GET() {
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
  });
}
