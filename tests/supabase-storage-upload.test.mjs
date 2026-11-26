import assert from "node:assert/strict";
import test from "node:test";
import { uploadSignedPdf } from "../scripts/upload-signed-pdf.mjs";

test("compiled PDFs are sent to signed Supabase URLs with PUT and upsert", async () => {
  const pdf = Buffer.from("%PDF-1.7 test");
  let request;

  await uploadSignedPdf(
    "https://project.supabase.co/storage/v1/object/upload/sign/drafts/issue.pdf?token=secret",
    pdf,
    async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200 };
    },
  );

  assert.equal(request.url.includes("token=secret"), true);
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers["content-type"], "application/pdf");
  assert.equal(request.options.headers["x-upsert"], "true");
  assert.equal(request.options.body, pdf);
});

test("signed PDF uploads report Supabase failures", async () => {
  await assert.rejects(
    uploadSignedPdf("https://project.supabase.co/signed-upload", Buffer.alloc(0), async () => ({
      ok: false,
      status: 400,
    })),
    /Supabase PDF upload returned HTTP 400\./,
  );
});
