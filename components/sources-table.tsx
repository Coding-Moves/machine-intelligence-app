import { siteCopy } from "@/content/site";
import type { Source } from "@/lib/types";

export function SourcesTable({ sources }: { sources: Source[] }) {
  if (!sources.length) {
    return <p className="text-muted text-sm">{siteCopy.desk.sourcesEmpty}</p>;
  }

  return (
    <div className="border-line overflow-x-auto border-y">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-line text-muted border-b text-xs tracking-[0.12em] uppercase">
            <th className="py-3 pr-4 font-medium">
              {siteCopy.desk.sourceName}
            </th>
            <th className="py-3 pr-4 font-medium">
              {siteCopy.desk.feedColumn}
            </th>
            <th className="py-3 pr-4 font-medium">
              {siteCopy.desk.sourceRegionLabel}
            </th>
            <th className="py-3 pr-4 font-medium">
              {siteCopy.desk.sourceType}
            </th>
            <th className="py-3 pr-4 font-medium">
              {siteCopy.desk.trustWeight}
            </th>
            <th className="py-3 pr-4 font-medium">AI pipeline</th>
            <th className="py-3 font-medium">{siteCopy.desk.activeSource}</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr
              key={source.id}
              className="border-line border-b last:border-b-0"
            >
              <td className="py-4 pr-4">
                <a
                  className="text-leaf-dark font-medium underline-offset-4 hover:underline"
                  href={source.homepage}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.name}
                </a>
              </td>
              <td className="text-muted py-4 pr-4">
                {source.feedUrl ? (
                  <a
                    className="hover:text-ink underline underline-offset-4"
                    href={source.feedUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {siteCopy.desk.feedLink}
                  </a>
                ) : (
                  "Not configured"
                )}
              </td>
              <td className="text-muted py-4 pr-4">
                {siteCopy.desk.sourceRegion[source.region]}
              </td>
              <td className="text-muted py-4 pr-4">
                {siteCopy.desk.sourceKind[source.kind]}
              </td>
              <td className="text-muted py-4 pr-4">
                {source.trustWeight.toFixed(1)}
              </td>
              <td className="text-muted py-4 pr-4">
                {source.trusted ? "Trusted source" : "Excluded from ingestion"}
              </td>
              <td className="text-muted py-4">
                {source.active
                  ? siteCopy.desk.activeSource
                  : siteCopy.desk.pausedSource}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
