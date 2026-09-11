import type { AuthConfiguration, CurrentActor, MockUser } from "./types";
import { AuthApiError } from "./types";

export async function fetchCurrentActor(): Promise<CurrentActor> {
  return request<CurrentActor>("/api/auth/me");
}

export async function fetchAuthConfiguration(): Promise<AuthConfiguration> {
  return request<AuthConfiguration>("/api/auth/config");
}

export async function fetchMockUsers(): Promise<MockUser[]> {
  return request<MockUser[]>("/api/auth/mock-users");
}

export async function selectMockUser(userId: string): Promise<void> {
  await request("/api/auth/mock-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId })
  });
}

export async function endSession(): Promise<{ logoutUrl: string | null }> {
  return request("/api/auth/logout", { method: "POST" });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AuthApiError(
      "INVALID_RESPONSE",
      "Authentication service returned invalid data.",
      response.status
    );
  }
  if (!isObject(body) || body.ok !== true || !("data" in body)) {
    const error = isObject(body) && isObject(body.error) ? body.error : null;
    throw new AuthApiError(
      typeof error?.code === "string" ? error.code : "AUTH_REQUEST_FAILED",
      typeof error?.message === "string" ? error.message : "Authentication request failed.",
      response.status
    );
  }
  return body.data as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
