import { siteCopy } from "@/content/site";
import type { Source } from "@/lib/types";

export function SourcesTable({ sources }: { sources: Source[] }) {
  if (!sources.length) {
    return <p className="text-sm text-muted">{siteCopy.desk.sourcesEmpty}</p>;
  }

  return (
    <div className="overflow-x-auto border-y border-line">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <th className="py-3 pr-4 font-medium">{siteCopy.desk.sourceName}</th>
            <th className="py-3 pr-4 font-medium">{siteCopy.desk.sourceRegionLabel}</th>
            <th className="py-3 pr-4 font-medium">{siteCopy.desk.sourceType}</th>
            <th className="py-3 pr-4 font-medium">{siteCopy.desk.trustWeight}</th>
            <th className="py-3 font-medium">{siteCopy.desk.activeSource}</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-line last:border-b-0">
              <td className="py-4 pr-4">
                <a
                  className="font-medium text-leaf-dark underline-offset-4 hover:underline"
                  href={source.homepage}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.name}
                </a>
                <p className="mt-1 text-xs text-muted">{siteCopy.desk.feedPending}</p>
              </td>
              <td className="py-4 pr-4 text-muted">
                {siteCopy.desk.sourceRegion[source.region]}
              </td>
              <td className="py-4 pr-4 text-muted">
                {siteCopy.desk.sourceKind[source.kind]}
              </td>
              <td className="py-4 pr-4 text-muted">
                {source.trustWeight.toFixed(1)}
              </td>
              <td className="py-4 text-muted">{siteCopy.desk.activeSource}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
