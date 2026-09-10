export interface DatabaseContext {
  db: D1Database;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type SortDirection = "asc" | "desc";

export interface UserReference {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CountRow {
  total: number;
}

export function createDatabaseContext(db: D1Database): DatabaseContext {
  return { db };
}
