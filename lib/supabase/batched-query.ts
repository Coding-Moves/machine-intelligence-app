export type PageResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

type PageFetcher<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

type BatchedPageFetcher<T> = (
  ids: string[],
  from: number,
  to: number,
) => PromiseLike<PageResult<T>>;

export type BatchedQueryOptions = {
  batchSize?: number;
  pageSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_PAGE_SIZE = 500;

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

export function chunkValues<T>(values: readonly T[], size: number): T[][] {
  assertPositiveInteger(size, "Chunk size");
  const chunks: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    chunks.push(values.slice(offset, offset + size));
  }
  return chunks;
}

/**
 * Fetches every row in stable, range-based pages. The callback should apply a
 * deterministic order before its range so adjacent pages do not overlap.
 */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PageResult<T>> {
  assertPositiveInteger(pageSize, "Page size");
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

/**
 * Splits large PostgREST `in` filters into short requests, then pages through
 * each result set so neither URL length nor the API row cap truncates results.
 */
export async function fetchRowsByIds<T>(
  ids: readonly string[],
  fetchPage: BatchedPageFetcher<T>,
  {
    batchSize = DEFAULT_BATCH_SIZE,
    pageSize = DEFAULT_PAGE_SIZE,
  }: BatchedQueryOptions = {},
): Promise<PageResult<T>> {
  assertPositiveInteger(batchSize, "Batch size");
  assertPositiveInteger(pageSize, "Page size");

  const uniqueIds = [...new Set(ids)];
  const rows: T[] = [];
  for (const batch of chunkValues(uniqueIds, batchSize)) {
    const result = await fetchAllPages(
      (from, to) => fetchPage(batch, from, to),
      pageSize,
    );
    if (result.error) return result;
    rows.push(...(result.data ?? []));
  }

  return { data: rows, error: null };
}
