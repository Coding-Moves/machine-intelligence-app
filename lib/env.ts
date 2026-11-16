import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(32),
  GEMINI_API_KEY: z.string().optional(),
  WRITER_MODEL: z.string().optional(),
  DESIGNER_MODEL: z.string().optional(),
  GITHUB_DISPATCH_TOKEN: z.string().optional(),
  APP_URL: z.string().url().optional(),
});

function parseEnvironment<T extends z.ZodType>(schema: T): z.output<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => issue.path.join(".") + ": " + issue.message)
      .join("; ");
    throw new Error("Invalid environment configuration: " + details);
  }
  return result.data;
}

export function getPublicEnv() {
  return parseEnvironment(publicEnvironmentSchema);
}

export function getServerEnv() {
  return parseEnvironment(serverEnvironmentSchema);
}

export function getCronSecret() {
  const result = z.string().min(32).safeParse(process.env.CRON_SECRET);
  if (!result.success) {
    throw new Error(
      "Invalid environment configuration: CRON_SECRET must contain at least 32 characters.",
    );
  }
  return result.data;
}
