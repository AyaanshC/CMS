type Result<T> = { data: T[] | null; error: { message: string; code?: string } | null };

/** Fetch complete RLS-visible collections without relying on the API row cap. */
export async function fetchAll<T>(query: { range(from: number, to: number): PromiseLike<Result<T>> }, pageSize = 500): Promise<Result<T>> {
  const data: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await query.range(from, from + pageSize - 1);
    if (page.error) return { data: null, error: page.error };
    data.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < pageSize) return { data, error: null };
  }
}
