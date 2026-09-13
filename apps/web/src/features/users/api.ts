import type { UserAdminItem, UserAdminValues, UserListFilters, UserListResult } from "./types";
import { UserApiError } from "./types";
import { ApiClientError, requestApiData } from "../../lib/api-client";

export async function fetchUsers(filters: UserListFilters): Promise<UserListResult> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sort: filters.sort,
    direction: filters.direction
  });
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.role) query.set("role", filters.role);
  if (filters.active) query.set("active", filters.active);
  return request(`/api/admin/users?${query}`, undefined, isUserListResult);
}

export function createUser(values: UserAdminValues): Promise<UserAdminItem> {
  return request("/api/admin/users", jsonRequest("POST", values), isUser);
}

export function updateUser(userId: string, values: UserAdminValues): Promise<UserAdminItem> {
  return request(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    jsonRequest("PATCH", values),
    isUser
  );
}

export function setUserActive(userId: string, active: boolean): Promise<UserAdminItem> {
  return request(
    `/api/admin/users/${encodeURIComponent(userId)}/${active ? "activate" : "deactivate"}`,
    { method: "POST" },
    isUser
  );
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  validate: (value: unknown) => value is T
): Promise<T> {
  try {
    return await requestApiData(path, init, validate);
  } catch (error) {
    if (!(error instanceof ApiClientError)) throw error;
    throw new UserApiError(
      { code: error.code, message: error.message, fields: error.fields },
      error.status
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isUserListResult(value: unknown): value is UserListResult {
  const pagination = isObject(value) ? value.pagination : null;
  return (
    isObject(value) &&
    Array.isArray(value.items) &&
    value.items.every(isUser) &&
    isObject(pagination) &&
    ["page", "pageSize", "total", "totalPages"].every((key) => typeof pagination[key] === "number")
  );
}
function isUser(value: unknown): value is UserAdminItem {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    ["admin", "manager", "customer_service", "sales_rep"].includes(String(value.role)) &&
    typeof value.active === "boolean" &&
    (value.authProvider === null || typeof value.authProvider === "string") &&
    (value.authSubject === null || typeof value.authSubject === "string") &&
    typeof value.identityMapped === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}
