// Keep every register complete beyond the Data API's per-request row cap.
// Pages are fetched a few at a time (never more than PARALLEL_PAGES in flight per register)
// so 25k-row registers load quickly while staying under the six-connection runtime limit.
const PAGE_SIZE = 500;
const PARALLEL_PAGES = 4;

export async function readAllRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const data: T[] = [];
  const first = await load(0, PAGE_SIZE - 1);
  if (first.error) throw new Error(first.error.message);
  const firstRows = first.data ?? [];
  data.push(...firstRows);
  if (firstRows.length < PAGE_SIZE) return { data, error: null };
  for (let start = PAGE_SIZE; ; start += PAGE_SIZE * PARALLEL_PAGES) {
    const pages = await Promise.all(
      Array.from({ length: PARALLEL_PAGES }, (_, i) => {
        const from = start + i * PAGE_SIZE;
        return load(from, from + PAGE_SIZE - 1);
      }),
    );
    for (const page of pages) {
      if (page.error) throw new Error(page.error.message);
      const rows = page.data ?? [];
      data.push(...rows);
      if (rows.length < PAGE_SIZE) return { data, error: null };
    }
  }
}
