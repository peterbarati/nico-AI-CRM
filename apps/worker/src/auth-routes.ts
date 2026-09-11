import {
  getAuthMode,
  createMockSessionCookie,
  clearMockSessionCookie,
  AuthRequestError
} from "./auth";
import { getAuthUserById, listAuthUsers, type DatabaseContext } from "@nico-ai-crm/db";
import type { AuthenticatedActor } from "@nico-ai-crm/auth";
import type { AuthEnv } from "./auth";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

export async function handlePublicAuthRoute(
  request: Request,
  env: AuthEnv,
  context: DatabaseContext,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/auth/config" && request.method === "GET") {
    try {
      const mode = getAuthMode(env);
      return success({
        mode,
        loginUrl: mode === "OIDC" ? safeRedirectUrl(env.AUTH_LOGIN_URL, null) : null,
        logoutUrl:
          mode === "OIDC" ? safeRedirectUrl(env.AUTH_LOGOUT_URL, "/cdn-cgi/access/logout") : null
      });
    } catch (error) {
      return authErrorResponse(error);
    }
  }

  if (url.pathname === "/api/auth/mock-users" && request.method === "GET") {
    try {
      if (getAuthMode(env) !== "MOCK") return notFound();
      const users = await listAuthUsers(context);
      return success(
        users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          identityMapped: user.authProvider === "mock" && user.authSubject === user.id
        }))
      );
    } catch (error) {
      return authErrorResponse(error);
    }
  }

  if (url.pathname === "/api/auth/mock-login" && request.method === "POST") {
    try {
      if (getAuthMode(env) !== "MOCK") return notFound();
      const body = (await request.json()) as unknown;
      if (!isUserSelection(body)) {
        return failure(400, "VALIDATION_ERROR", "A valid mock user ID is required.");
      }
      const user = await getAuthUserById(context, body.userId);
      if (!user) return failure(404, "NOT_FOUND", "Mock user not found.");
      return success(
        { selected: true },
        { headers: { "set-cookie": createMockSessionCookie(user.id, request) } }
      );
    } catch (error) {
      return error instanceof SyntaxError
        ? failure(400, "BAD_REQUEST", "Request body must be valid JSON.")
        : authErrorResponse(error);
    }
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    try {
      const mode = getAuthMode(env);
      return success(
        {
          logoutUrl:
            mode === "OIDC" ? safeRedirectUrl(env.AUTH_LOGOUT_URL, "/cdn-cgi/access/logout") : null
        },
        mode === "MOCK" ? { headers: { "set-cookie": clearMockSessionCookie(request) } } : undefined
      );
    } catch (error) {
      return authErrorResponse(error);
    }
  }

  return null;
}

export function safeActorResponse(actor: AuthenticatedActor): Response {
  return success({
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    active: actor.active,
    provider: actor.provider,
    permissions: actor.permissions
  });
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthRequestError) {
    return failure(error.status, error.code, error.message);
  }
  throw error;
}

function success(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    ...init,
    headers: { ...jsonHeaders, ...init?.headers }
  });
}

function failure(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: jsonHeaders
  });
}

function notFound() {
  return failure(404, "NOT_FOUND", "Not found.");
}

function isUserSelection(value: unknown): value is { userId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    typeof value.userId === "string" &&
    value.userId.trim().length > 0
  );
}

function safeRedirectUrl(value: string | undefined, fallback: string | null): string | null {
  if (!value) return fallback;
  try {
    return new URL(value).protocol === "https:" ? value : fallback;
  } catch {
    return fallback;
  }
}
