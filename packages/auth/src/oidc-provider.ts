import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import {
  AuthConfigurationError,
  InvalidAuthenticationError,
  type AuthProvider,
  type ProviderIdentity
} from "./types";

export interface OidcAuthOptions {
  issuer: string;
  audience: string;
  jwksUrl: string;
  tokenHeader?: string;
}

export class OidcAuthProvider implements AuthProvider {
  readonly mode = "OIDC" as const;
  private readonly keyResolver: JWTVerifyGetKey;

  constructor(
    private readonly options: OidcAuthOptions,
    keyResolver?: JWTVerifyGetKey
  ) {
    assertHttpsUrl(options.issuer, "AUTH_ISSUER");
    assertHttpsUrl(options.jwksUrl, "AUTH_JWKS_URL");
    if (!options.audience.trim()) {
      throw new AuthConfigurationError("AUTH_AUDIENCE must be configured.");
    }
    this.keyResolver = keyResolver ?? createRemoteJWKSet(new URL(options.jwksUrl));
  }

  async authenticate(request: Request): Promise<ProviderIdentity | null> {
    const token = readToken(request, this.options.tokenHeader);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.keyResolver, {
        issuer: this.options.issuer,
        audience: this.options.audience,
        algorithms: ["RS256", "ES256"]
      });
      if (!payload.sub) throw new InvalidAuthenticationError("Token subject is missing.");
      return {
        provider: this.options.issuer,
        subject: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        name: typeof payload.name === "string" ? payload.name : null
      };
    } catch (error) {
      if (error instanceof InvalidAuthenticationError) throw error;
      throw new InvalidAuthenticationError();
    }
  }
}

function readToken(request: Request, preferredHeader?: string): string | null {
  const preferred = preferredHeader ? request.headers.get(preferredHeader) : null;
  if (preferred?.trim()) return preferred.trim();
  const accessToken = request.headers.get("cf-access-jwt-assertion");
  if (accessToken?.trim()) return accessToken.trim();
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

function assertHttpsUrl(value: string, name: string) {
  try {
    if (new URL(value).protocol !== "https:") throw new Error();
  } catch {
    throw new AuthConfigurationError(`${name} must be a valid HTTPS URL.`);
  }
}
