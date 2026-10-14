import { describe, expect, it, vi } from "vitest";
import { fetchAll } from "./paginate";

describe("complete workspace collections", () => {
  it("loads beyond the 1,000 row cap without dropping the last page", async () => {
    const rows = Array.from({ length: 1203 }, (_, id) => ({ id }));
    const range = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
    expect((await fetchAll({ range })).data).toEqual(rows);
    expect(range.mock.calls).toEqual([[0,499],[500,999],[1000,1499]]);
  });
  it("fails the collection instead of returning misleading partial data", async () => {
    const range = vi.fn().mockResolvedValueOnce({ data: [1,2], error: null }).mockResolvedValueOnce({ data: null, error: { message: "Connection failed" } });
    expect(await fetchAll<number>({ range }, 2)).toEqual({ data: null, error: { message: "Connection failed" } });
  });
});
