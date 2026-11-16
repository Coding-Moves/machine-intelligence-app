import Link from "next/link";
import type { Issue } from "@/lib/types";
import { CoverArtwork } from "@/components/cover-artwork";
import { siteCopy } from "@/content/site";

export function IssueCard({ issue }: { issue: Issue }) {
  const dateLabel = issue.isMock
    ? siteCopy.issues.sampleDate
    : issue.date
      ? new Date(issue.date).toLocaleDateString("en", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : siteCopy.issues.dateUnknown;

  return (
    <article className="grid gap-6 border-t border-line py-8 sm:grid-cols-[220px_1fr] sm:gap-9">
      <Link
        className="w-full max-w-[220px] focus-visible:rounded-sm"
        href={"/issues/" + issue.slug}
        aria-label={siteCopy.issues.open + ": " + issue.title}
      >
        {issue.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="aspect-[0.72] w-full border border-line object-cover"
            src={issue.coverUrl}
          />
        ) : (
          <CoverArtwork
            compact
            issueTitle={issue.title}
            issueDate={dateLabel}
            sample={issue.isMock}
          />
        )}
      </Link>
      <div className="flex flex-col items-start">
        <p className="text-sm text-muted">{dateLabel}</p>
        {issue.isMock ? (
          <p className="mt-3 rounded-full border border-line px-3 py-1 text-xs font-medium text-leaf-dark">
            {siteCopy.issues.sample}
          </p>
        ) : null}
        <h2 className="mt-4 text-3xl leading-tight tracking-tight">
          <Link className="hover:text-leaf-dark" href={"/issues/" + issue.slug}>
            {issue.title}
          </Link>
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
          {issue.inThisIssue.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
            href={"/issues/" + issue.slug}
          >
            {siteCopy.issues.open}
          </Link>
          {issue.pdfUrl ? (
            <a
              className="rounded-sm text-sm font-medium text-leaf-dark underline underline-offset-4 hover:text-ink"
              href={issue.pdfUrl}
            >
              {siteCopy.home.pdf}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
