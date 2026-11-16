import type { Issue } from "@/lib/types";
import { mockIssue } from "@/lib/data/mock-issues";

type EditionRow = {
  id: string;
  slug: string;
  title: string;
  in_this_issue: string[] | null;
  pdf_path: string | null;
  cover_path: string | null;
  published_at: string | null;
};

function publicStorageUrl(projectUrl: string, path: string | null) {
  if (!path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return projectUrl + "/storage/v1/object/public/issues/" + encodedPath;
}

function toIssue(row: EditionRow, projectUrl: string): Issue {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.published_at ?? "",
    inThisIssue: row.in_this_issue ?? [],
    stories: [],
    pdfUrl: publicStorageUrl(projectUrl, row.pdf_path),
    coverUrl: publicStorageUrl(projectUrl, row.cover_path),
    isMock: false,
  };
}

export async function getIssues(): Promise<Issue[]> {
  const rawProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectUrl = rawProjectUrl?.endsWith("/")
    ? rawProjectUrl.slice(0, -1)
    : rawProjectUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!projectUrl || !anonKey || projectUrl.includes("127.0.0.1")) {
    return [mockIssue];
  }

  try {
    const query = new URL("/rest/v1/editions", projectUrl);
    query.searchParams.set(
      "select",
      "id,slug,title,in_this_issue,pdf_path,cover_path,published_at",
    );
    query.searchParams.set("status", "eq.published");
    query.searchParams.set("order", "published_at.desc");

    const response = await fetch(query, {
      headers: {
        apikey: anonKey,
        Authorization: "Bearer " + anonKey,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [mockIssue];
    const rows = (await response.json()) as EditionRow[];
    if (!rows.length) return [mockIssue];
    return rows.map((row) => toIssue(row, projectUrl));
  } catch {
    return [mockIssue];
  }
}

export async function getIssue(slug: string): Promise<Issue | null> {
  const issues = await getIssues();
  return issues.find((issue) => issue.slug === slug) ?? null;
}
