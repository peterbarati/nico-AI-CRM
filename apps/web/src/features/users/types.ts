import type { UserRole } from "@nico-ai-crm/auth";

export type UserAdminSortField = "name" | "email" | "role" | "active" | "created_at" | "updated_at";
export type SortDirection = "asc" | "desc";

export interface UserAdminItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  authSubject: string | null;
  identityMapped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAdminValues {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  authSubject: string | null;
}

export interface UserListFilters {
  page: number;
  pageSize: number;
  search: string;
  role: "" | UserRole;
  active: "" | "true" | "false";
  sort: UserAdminSortField;
  direction: SortDirection;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserListResult {
  items: UserAdminItem[];
  pagination: PaginationMeta;
}

export interface UserApiErrorBody {
  code: string;
  message: string;
  fields?: Array<{ field: string; message: string }>;
}

export class UserApiError extends Error {
  constructor(
    public readonly details: UserApiErrorBody,
    public readonly status: number
  ) {
    super(details.fields?.[0]?.message ?? details.message);
    this.name = "UserApiError";
  }
}
