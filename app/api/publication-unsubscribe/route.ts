import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Issue email preferences</title><body style="font:16px system-ui,sans-serif;max-width:38rem;margin:12vh auto;padding:0 1.5rem;color:#18372b"><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

function getToken(request: Request) {
  const raw = new URL(request.url).searchParams.get("token") ?? "";
  const parsed = tokenSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function GET(request: Request) {
  const token = getToken(request);
  if (!token) {
    return html(
      "<h1>This unsubscribe link is invalid.</h1><p>Contact the publication team if you need help changing your email preferences.</p>",
      400,
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: recipient, error } = await admin
    .from("publication_email_recipients")
    .select("unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) {
    return html(
      "<h1>Preferences are temporarily unavailable.</h1><p>Please try again later.</p>",
      503,
    );
  }
  if (!recipient) {
    return html(
      "<h1>This unsubscribe link is invalid.</h1><p>Contact the publication team if you need help changing your email preferences.</p>",
      404,
    );
  }
  if (recipient.unsubscribed_at) {
    return html(
      "<h1>You are unsubscribed.</h1><p>You will not receive future issue emails.</p>",
    );
  }

  return html(
    `<h1>Issue email preferences</h1><p>Stop receiving future Machine Intelligence issue emails.</p><form method="post" action="/api/publication-unsubscribe?token=${token}"><button type="submit" name="unsubscribe" value="confirm" style="border:0;border-radius:999px;background:#28735a;color:white;padding:.8rem 1.2rem;font:inherit;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(request: Request) {
  const token = getToken(request);
  if (!token) return new Response(null, { status: 202 });

  try {
    const formData = await request.formData();
    const oneClick = formData.get("List-Unsubscribe") === "One-Click";
    const confirmation = formData.get("unsubscribe") === "confirm";
    if (!oneClick && !confirmation) {
      return new Response("Invalid unsubscribe request.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  } catch {
    return new Response("Invalid unsubscribe request.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("unsubscribe_publication_email", {
    p_token: token,
  });
  if (error) {
    return new Response("Preferences are temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(null, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
