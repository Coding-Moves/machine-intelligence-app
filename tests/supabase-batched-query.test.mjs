import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkValues,
  fetchAllPages,
  fetchRowsByIds,
} from "../lib/supabase/batched-query.ts";

test("chunkValues keeps order and handles empty and uneven inputs", () => {
  assert.deepEqual(chunkValues([], 3), []);
  assert.deepEqual(chunkValues([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.throws(() => chunkValues([1], 0), RangeError);
});

test("fetchAllPages reads every page and stops on a short page", async () => {
  const requests = [];
  const rows = Array.from({ length: 7 }, (_, index) => index);
  const result = await fetchAllPages(async (from, to) => {
    requests.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  }, 3);

  assert.deepEqual(requests, [
    [0, 2],
    [3, 5],
    [6, 8],
  ]);
  assert.deepEqual(result.data, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(result.error, null);
});

test("fetchRowsByIds batches unique IDs and pages each batch", async () => {
  const requests = [];
  const result = await fetchRowsByIds(
    ["a", "b", "a", "c", "d", "e"],
    async (ids, from, to) => {
      requests.push({ ids, from, to });
      return {
        data: ids.slice(from, to + 1),
        error: null,
      };
    },
    { batchSize: 2, pageSize: 1 },
  );

  assert.deepEqual(result.data, ["a", "b", "c", "d", "e"]);
  assert.equal(requests.length, 8);
  assert.deepEqual(requests[0], { ids: ["a", "b"], from: 0, to: 0 });
  assert.deepEqual(requests[1], { ids: ["a", "b"], from: 1, to: 1 });
  assert.deepEqual(requests[3], { ids: ["c", "d"], from: 0, to: 0 });
});

test("batched reads stop and return the first database error", async () => {
  const databaseError = new Error("request failed");
  let requestCount = 0;
  const result = await fetchRowsByIds(
    ["a", "b", "c"],
    async () => {
      requestCount += 1;
      return { data: null, error: databaseError };
    },
    { batchSize: 2 },
  );

  assert.equal(requestCount, 1);
  assert.equal(result.data, null);
  assert.equal(result.error, databaseError);
});
