import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function recordStubRun(kind: "ingest" | "compile_callback") {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("runs")
    .insert({
      kind,
      started_at: now,
      finished_at: now,
      ok: true,
      details: {
        stub: true,
        todo: "TODO(phase-2): implement the real pipeline.",
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Could not record the stub run.");
  }
  return data.id;
}
