import {
  AuthConfigurationError,
  InvalidAuthenticationError,
  MockAuthProvider,
  OidcAuthProvider,
  hasPermission,
  mockAuthCookieName,
  resolvePermissions,
  type AuthProvider,
  type AuthenticatedActor,
  type Permission
} from "@nico-ai-crm/auth";
import { getAuthUserById, getAuthUserByIdentity, type DatabaseContext } from "@nico-ai-crm/db";

export interface AuthEnv {
  AUTH_MODE?: string;
  AUTH_ISSUER?: string;
  AUTH_AUDIENCE?: string;
  AUTH_JWKS_URL?: string;
  AUTH_LOGIN_URL?: string;
  AUTH_LOGOUT_URL?: string;
}

export class AuthRequestError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "INACTIVE_USER"
      | "IDENTITY_NOT_MAPPED"
      | "AUTH_CONFIGURATION_ERROR",
    message: string
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

let cachedOidcProvider: { key: string; provider: OidcAuthProvider } | null = null;

export function getAuthMode(env: AuthEnv): "MOCK" | "OIDC" {
  if (env.AUTH_MODE?.toLowerCase() === "mock") return "MOCK";
  if (env.AUTH_MODE?.toLowerCase() === "oidc") return "OIDC";
  throw new AuthRequestError(
    503,
    "AUTH_CONFIGURATION_ERROR",
    "Authentication mode is not configured."
  );
}

export async function authenticateActor(
  request: Request,
  env: AuthEnv,
  context: DatabaseContext
): Promise<AuthenticatedActor> {
  let provider: AuthProvider;
  try {
    provider = createAuthProvider(env);
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      throw new AuthRequestError(503, "AUTH_CONFIGURATION_ERROR", error.message);
    }
    throw error;
  }

  let identity;
  try {
    identity = await provider.authenticate(request);
  } catch (error) {
    if (error instanceof InvalidAuthenticationError) {
      throw new AuthRequestError(401, "UNAUTHENTICATED", "Authentication token is invalid.");
    }
    throw error;
  }
  if (!identity) {
    throw new AuthRequestError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  const user = identity.crmUserId
    ? await getAuthUserById(context, identity.crmUserId)
    : await getAuthUserByIdentity(context, identity.provider, identity.subject);
  if (!user) {
    throw new AuthRequestError(
      403,
      "IDENTITY_NOT_MAPPED",
      "Authenticated identity is not mapped to a CRM user."
    );
  }
  if (!user.active) {
    throw new AuthRequestError(403, "INACTIVE_USER", "This CRM user is inactive.");
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    provider: identity.provider,
    providerIdentityId: identity.subject,
    permissions: resolvePermissions(user.role)
  };
}

export function requirePermission(actor: AuthenticatedActor, permission: Permission) {
  if (!hasPermission(actor, permission)) {
    throw new AuthRequestError(
      403,
      "FORBIDDEN",
      "You do not have permission to perform this action."
    );
  }
}

export function createMockSessionCookie(userId: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${mockAuthCookieName}=${encodeURIComponent(userId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`;
}

export function clearMockSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${mockAuthCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export function requireSameOriginForMockCookie(request: Request) {
  if (!request.headers.get("cookie")?.includes(`${mockAuthCookieName}=`)) return;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none"
  ) {
    throw new AuthRequestError(403, "FORBIDDEN", "Cross-origin state change was rejected.");
  }
}

function createAuthProvider(env: AuthEnv): AuthProvider {
  if (getAuthMode(env) === "MOCK") return new MockAuthProvider();
  const issuer = env.AUTH_ISSUER ?? "";
  const audience = env.AUTH_AUDIENCE ?? "";
  const jwksUrl = env.AUTH_JWKS_URL ?? "";
  const key = `${issuer}\n${audience}\n${jwksUrl}`;
  if (cachedOidcProvider?.key === key) return cachedOidcProvider.provider;
  const provider = new OidcAuthProvider({ issuer, audience, jwksUrl });
  cachedOidcProvider = { key, provider };
  return provider;
}
