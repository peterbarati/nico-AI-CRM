import type { AuthenticatedActor } from "@nico-ai-crm/auth";
import {
  createAdminUser,
  getAdminUser,
  listAdminUsers,
  setAdminUserActive,
  updateAdminUser,
  UserManagementError,
  type DatabaseContext,
  type UserAdminListQuery,
  type UserAdminSortField,
  type UserAdminValues,
  type UserRole
} from "@nico-ai-crm/db";
import type { ApiErrorResponse, ApiSuccess, ValidationIssue } from "@nico-ai-crm/shared";

const roles = new Set<UserRole>(["admin", "manager", "customer_service", "sales_rep"]);
const sortFields = new Set<UserAdminSortField>([
  "name",
  "email",
  "role",
  "active",
  "created_at",
  "updated_at"
]);
const allowedFields = new Set(["name", "email", "role", "active", "authProvider", "authSubject"]);
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

export async function handleUserManagementRoute(
  request: Request,
  context: DatabaseContext,
  actor: AuthenticatedActor,
  url: URL,
  authMode?: string
): Promise<Response | null> {
  if (url.pathname === "/api/admin/users" && request.method === "GET") {
    const query = parseListQuery(url);
    if (query instanceof Response) return query;
    const result = await listAdminUsers(context, query);
    return success({ items: result.items, pagination: result.pagination });
  }

  if (url.pathname === "/api/admin/users" && request.method === "POST") {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const id = crypto.randomUUID();
    const validation = validateValues(body, null);
    if (!validation.success) return validationFailure(validation.issues);
    const values =
      authMode?.toLowerCase() === "mock" &&
      validation.data.authProvider === null &&
      validation.data.authSubject === null
        ? { ...validation.data, authProvider: "mock", authSubject: id }
        : validation.data;
    try {
      return success(
        await createAdminUser(context, {
          id,
          actorUserId: actor.id,
          auditId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          values
        }),
        201
      );
    } catch (error) {
      return handleUserError(error);
    }
  }

  const itemRoute = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (itemRoute && request.method === "PATCH") {
    const userId = decodeURIComponent(itemRoute[1]);
    const current = await getAdminUser(context, userId);
    if (!current) return failure(404, "USER_NOT_FOUND", "User not found.");
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const validation = validateValues(body, current);
    if (!validation.success) return validationFailure(validation.issues);
    try {
      return success(
        await updateAdminUser(context, {
          userId,
          actorUserId: actor.id,
          auditId: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
          values: validation.data
        })
      );
    } catch (error) {
      return handleUserError(error);
    }
  }

  const statusRoute = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/(activate|deactivate)$/);
  if (statusRoute && request.method === "POST") {
    try {
      return success(
        await setAdminUserActive(context, {
          userId: decodeURIComponent(statusRoute[1]),
          actorUserId: actor.id,
          auditId: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
          active: statusRoute[2] === "activate"
        })
      );
    } catch (error) {
      return handleUserError(error);
    }
  }

  return url.pathname.startsWith("/api/admin/users")
    ? failure(405, "METHOD_NOT_ALLOWED", "Method not allowed.")
    : null;
}

function parseListQuery(url: URL): UserAdminListQuery | Response {
  const role = url.searchParams.get("role");
  if (role && !roles.has(role as UserRole)) return failure(400, "INVALID_ROLE", "Role is invalid.");
  const active = url.searchParams.get("active");
  if (active && active !== "true" && active !== "false") {
    return failure(400, "VALIDATION_ERROR", "Active filter must be true or false.");
  }
  const sort = url.searchParams.get("sort");
  if (sort && !sortFields.has(sort as UserAdminSortField)) {
    return failure(400, "VALIDATION_ERROR", "Sort field is invalid.");
  }
  return {
    page: positiveInteger(url.searchParams.get("page")),
    pageSize: positiveInteger(url.searchParams.get("pageSize")),
    search: url.searchParams.get("search") ?? undefined,
    role: role ? (role as UserRole) : undefined,
    active: active ? active === "true" : undefined,
    sort: sort ? (sort as UserAdminSortField) : undefined,
    direction: url.searchParams.get("direction") === "desc" ? "desc" : "asc"
  };
}

function validateValues(
  body: Record<string, unknown>,
  current: UserAdminValues | null
): { success: true; data: UserAdminValues } | { success: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) issues.push({ field: key, message: "Field is not editable." });
  }
  const name = readString(body, "name", current?.name)?.trim() ?? "";
  const email = readString(body, "email", current?.email)?.trim().toLowerCase() ?? "";
  const role = readString(body, "role", current?.role);
  const active =
    "active" in body
      ? typeof body.active === "boolean"
        ? body.active
        : null
      : (current?.active ?? null);
  const authProvider = readNullableString(body, "authProvider", current?.authProvider ?? null);
  const authSubject = readNullableString(body, "authSubject", current?.authSubject ?? null);
  for (const key of ["name", "email", "role"] as const) {
    if (key in body && typeof body[key] !== "string") {
      issues.push({ field: key, message: `${key} must be a string.` });
    }
  }
  if ("active" in body && typeof body.active !== "boolean") {
    issues.push({ field: "active", message: "Active status must be true or false." });
  }
  for (const key of ["authProvider", "authSubject"] as const) {
    if (key in body && body[key] !== null && typeof body[key] !== "string") {
      issues.push({ field: key, message: `${key} must be a string or null.` });
    }
  }
  if (!name || name.length > 200)
    issues.push({ field: "name", message: "Name is required and must not exceed 200 characters." });
  if (!isEmail(email)) issues.push({ field: "email", message: "A valid email is required." });
  if (!role || !roles.has(role as UserRole))
    issues.push({ field: "role", message: "Role is invalid." });
  if (active === null) issues.push({ field: "active", message: "Active status is required." });
  if ((authProvider === null) !== (authSubject === null)) {
    issues.push({
      field: "authProvider",
      message: "Auth provider and subject must be supplied together."
    });
  }
  if (authProvider && !/^[a-z0-9._-]{1,64}$/i.test(authProvider)) {
    issues.push({ field: "authProvider", message: "Auth provider is invalid." });
  }
  if (authSubject && authSubject.length > 255) {
    issues.push({ field: "authSubject", message: "Auth subject must not exceed 255 characters." });
  }
  if (issues.length || !role || active === null) return { success: false, issues };
  return {
    success: true,
    data: {
      name,
      email,
      role: role as UserRole,
      active,
      authProvider,
      authSubject
    }
  };
}

function readString(
  body: Record<string, unknown>,
  key: string,
  fallback?: string
): string | undefined {
  if (!(key in body)) return fallback;
  return typeof body[key] === "string" ? body[key] : undefined;
}

function readNullableString(
  body: Record<string, unknown>,
  key: string,
  fallback: string | null
): string | null {
  if (!(key in body)) return fallback;
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : failure(400, "VALIDATION_ERROR", "Request body must be an object.");
  } catch {
    return failure(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}

function handleUserError(error: unknown): Response {
  if (error instanceof UserManagementError) {
    const status = error.code === "USER_NOT_FOUND" ? 404 : 409;
    return failure(status, error.code, error.message);
  }
  if (error instanceof Error && error.message.includes("LAST_ADMIN_PROTECTED")) {
    return failure(
      409,
      "LAST_ADMIN_PROTECTED",
      "The last active Admin cannot be demoted or deactivated."
    );
  }
  throw error;
}

function validationFailure(issues: ValidationIssue[]): Response {
  const invalidRole = issues.some((issue) => issue.field === "role");
  return json<ApiErrorResponse>(
    {
      ok: false,
      error: {
        code: invalidRole ? "INVALID_ROLE" : "VALIDATION_ERROR",
        message: invalidRole ? "Role is invalid." : "Request validation failed.",
        fields: issues
      }
    },
    400
  );
}

function success<T>(data: T, status = 200): Response {
  return json<ApiSuccess<T>>({ ok: true, data }, status);
}

function failure(status: number, code: string, message: string): Response {
  return json<ApiErrorResponse>({ ok: false, error: { code, message } }, status);
}

function json<T>(body: T, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function positiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}
