import type {
  UserAdminItem,
  UserAdminValues,
  UserApiErrorBody,
  UserListFilters,
  UserListResult
} from "./types";
import { UserApiError } from "./types";

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
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new UserApiError(
      { code: "USER_SERVICE_UNAVAILABLE", message: "User management is unavailable." },
      0
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UserApiError(
      { code: "INVALID_RESPONSE", message: "User management returned invalid data." },
      response.status
    );
  }
  if (isErrorEnvelope(body)) throw new UserApiError(body.error, response.status);
  if (!response.ok || !isSuccessEnvelope(body) || !validate(body.data)) {
    throw new UserApiError(
      { code: "INVALID_RESPONSE", message: "User management returned invalid data." },
      response.status
    );
  }
  return body.data;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isSuccessEnvelope(value: unknown): value is { ok: true; data: unknown } {
  return isObject(value) && value.ok === true && "data" in value;
}
function isErrorEnvelope(value: unknown): value is { ok: false; error: UserApiErrorBody } {
  return (
    isObject(value) &&
    value.ok === false &&
    isObject(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
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
