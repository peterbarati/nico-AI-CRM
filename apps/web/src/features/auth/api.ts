import type { AuthConfiguration, CurrentActor, MockUser } from "./types";
import { AuthApiError } from "./types";
import type { ApiResponse } from "@nico-ai-crm/shared";
import { permissions, type Permission, type UserRole } from "@nico-ai-crm/auth";

const userRoles = new Set<UserRole>(["admin", "manager", "customer_service", "sales_rep"]);

export async function fetchCurrentActor(): Promise<CurrentActor> {
  return request("/api/auth/me", undefined, isCurrentActor);
}

export async function fetchAuthConfiguration(): Promise<AuthConfiguration> {
  return request("/api/auth/config", undefined, isAuthConfiguration);
}

export async function fetchMockUsers(): Promise<MockUser[]> {
  return request("/api/auth/mock-users", undefined, isMockUserList);
}

export async function selectMockUser(userId: string): Promise<void> {
  await request(
    "/api/auth/mock-login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId })
    },
    isMockLoginResult
  );
}

export async function endSession(): Promise<{ logoutUrl: string | null }> {
  return request("/api/auth/logout", { method: "POST" }, isLogoutResult);
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
    throw serviceUnavailable();
  }

  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw response.status >= 500
      ? serviceUnavailable(response.status)
      : invalidResponse(response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw response.status >= 500
      ? serviceUnavailable(response.status)
      : invalidResponse(response.status);
  }

  if (isErrorResponse(body)) {
    throw new AuthApiError(body.error.code, body.error.message, response.status);
  }

  if (!response.ok || !isSuccessResponse(body) || !validate(body.data)) {
    throw invalidResponse(response.status);
  }
  return body.data;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuccessResponse(value: unknown): value is ApiResponse<unknown> & { ok: true } {
  return isObject(value) && value.ok === true && "data" in value;
}

function isErrorResponse(value: unknown): value is ApiResponse<never> & { ok: false } {
  return (
    isObject(value) &&
    value.ok === false &&
    isObject(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function isAuthConfiguration(value: unknown): value is AuthConfiguration {
  return (
    isObject(value) &&
    (value.mode === "MOCK" || value.mode === "OIDC") &&
    isNullableString(value.loginUrl) &&
    isNullableString(value.logoutUrl)
  );
}

function isCurrentActor(value: unknown): value is CurrentActor {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    isUserRole(value.role) &&
    typeof value.active === "boolean" &&
    typeof value.provider === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isPermission)
  );
}

function isMockUserList(value: unknown): value is MockUser[] {
  return Array.isArray(value) && value.every(isMockUser);
}

function isMockUser(value: unknown): value is MockUser {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    isUserRole(value.role) &&
    typeof value.active === "boolean" &&
    typeof value.identityMapped === "boolean"
  );
}

function isMockLoginResult(value: unknown): value is { selected: boolean } {
  return isObject(value) && value.selected === true;
}

function isLogoutResult(value: unknown): value is { logoutUrl: string | null } {
  return isObject(value) && isNullableString(value.logoutUrl);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.has(value as UserRole);
}

function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && permissions.includes(value as Permission);
}

function invalidResponse(status: number): AuthApiError {
  return new AuthApiError(
    "INVALID_RESPONSE",
    "Authentication service returned invalid data.",
    status
  );
}

function serviceUnavailable(status = 0): AuthApiError {
  return new AuthApiError(
    "AUTH_SERVICE_UNAVAILABLE",
    "Authentication service is unavailable.",
    status
  );
}
