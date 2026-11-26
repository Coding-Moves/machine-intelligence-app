import "server-only";

import { getServerEnv } from "@/lib/env";

const REPOSITORY = "Coding-Moves/machine-intelligence-app";
const WORKFLOW = "compile-draft.yml";

export async function dispatchDraftCompile(editionId: string) {
  const { GITHUB_DISPATCH_TOKEN } = getServerEnv();
  if (!GITHUB_DISPATCH_TOKEN) {
    throw new Error(
      "The draft was saved, but automatic PDF compilation is not configured. Add GITHUB_DISPATCH_TOKEN to Vercel Production, then build the PDF from the editor desk.",
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { edition_id: editionId },
      }),
    },
  );

  if (!response.ok) {
    console.error("GitHub rejected the draft PDF workflow dispatch.", {
      status: response.status,
    });
    throw new Error(
      "The latest TeX was saved, but GitHub could not start its PDF build. Check that GITHUB_DISPATCH_TOKEN has Actions write access and retry the PDF build.",
    );
  }
}
