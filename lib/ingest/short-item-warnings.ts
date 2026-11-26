export type IngestWarning = { source: string; message: string };

export function getShortItemWarnings(
  shortItemsBySource: ReadonlyMap<string, number>,
): IngestWarning[] {
  return Array.from(shortItemsBySource, ([source, count]) => ({
    source,
    message: `${count} recent feed item${count === 1 ? "" : "s"} had too little text to review and ${count === 1 ? "was" : "were"} not added to the magazine.`,
  }));
}
