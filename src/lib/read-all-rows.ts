// Keep every register complete beyond the Data API's per-request row cap.
export async function readAllRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const data: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const page = await load(from, from + pageSize - 1);
    if (page.error) throw new Error(page.error.message);
    const rows = page.data ?? [];
    data.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data, error: null };
}