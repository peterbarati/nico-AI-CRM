import type { PaginationInput, PaginationMeta } from "./types";

export function normalizePagination(input: PaginationInput): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize ?? 20)));

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

export function toPagination(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}
