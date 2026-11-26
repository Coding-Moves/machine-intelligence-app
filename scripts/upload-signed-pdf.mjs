import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function uploadSignedPdf(url, pdf, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "cache-control": "max-age=3600",
      "x-upsert": "true",
    },
    body: pdf,
  });

  if (!response.ok) {
    throw new Error(`Supabase PDF upload returned HTTP ${response.status}.`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [pdfPath] = process.argv.slice(2);
  const uploadUrl = process.env.UPLOAD_URL;
  if (!pdfPath || !uploadUrl) {
    throw new Error("A PDF path and UPLOAD_URL are required.");
  }

  const pdf = await readFile(pdfPath);
  await uploadSignedPdf(uploadUrl, pdf);
  console.log(`Uploaded compiled PDF (${pdf.byteLength} bytes).`);
}
