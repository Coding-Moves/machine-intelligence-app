import { runIngest } from "@/lib/ingest/pipeline";

const requiredSecrets = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
] as const;

async function main() {
  const missingSecrets = requiredSecrets.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missingSecrets.length > 0) {
    console.error(
      `Missing required Actions secrets: ${missingSecrets.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  try {
    const result = await runIngest();
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          runId: result.runId,
          sourcesProcessed: result.sourcesProcessed,
          newArticles: result.newArticles,
          newStories: result.newStories,
          enrichedStories: result.enrichedStories,
          duplicateArticles: result.duplicateArticles,
          skippedShortItems: result.skippedShortItems,
          storiesQueuedForEnrichment: result.storiesQueuedForEnrichment,
          aiWarning: result.aiWarning,
          sourceErrors: result.sourceErrors,
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected ingest failure.";
    console.error(`Ingest failed: ${message.replace(/[\r\n]+/g, " ")}`);
    process.exitCode = 1;
  }
}

void main();
