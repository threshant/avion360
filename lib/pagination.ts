export type Pagination = {
  page: number;
  pageSize: number;
  from: number; // zero-based start index
  to: number; // zero-based end index (inclusive)
};

/**
 * Parse pagination params from URLSearchParams and enforce limits.
 * Defaults: page=1, pageSize=20. Max pageSize = 50.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  opts?: {
    defaultPage?: number;
    defaultPageSize?: number;
    maxPageSize?: number;
  },
): Pagination {
  const defaultPage = opts?.defaultPage ?? 1;
  const defaultPageSize = opts?.defaultPageSize ?? 20;
  const maxPageSize = opts?.maxPageSize ?? 50;

  const page = Math.max(1, Number(searchParams.get("page") ?? defaultPage));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number(searchParams.get("pageSize") ?? defaultPageSize)),
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

/**
 * Build a query string for pagination params.
 */
export function paginationQueryString(page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params.toString() ? `?${params.toString()}` : "";
}
