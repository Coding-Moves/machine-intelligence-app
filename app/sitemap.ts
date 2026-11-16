import type { MetadataRoute } from "next";
import { getIssues } from "@/lib/data/issues";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticPaths = [
    "",
    "/issues",
    "/about",
    "/how-its-made",
    "/privacy",
  ];
  const staticEntries = staticPaths.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date("2026-11-16T00:00:00.000Z"),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const issues = await getIssues();
  const issueEntries = issues
    .filter((issue) => !issue.isMock && issue.date)
    .map((issue) => ({
      url: new URL("/issues/" + issue.slug, siteUrl).toString(),
      lastModified: new Date(issue.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...issueEntries];
}
