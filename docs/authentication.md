# Authentication

## Selected architecture

Authentication is isolated in `packages/auth`. CRM code consumes `AuthProvider`,
`ProviderIdentity`, and `AuthenticatedActor`; it does not depend on an identity vendor SDK.

Production uses standards-based signed JWT validation. The initial deployment target is
Cloudflare Access in front of the application, backed by the client's OIDC or SAML identity
provider. Access supplies `Cf-Access-Jwt-Assertion`; the Worker validates its signature through
the configured JWKS and validates `iss`, `aud`, `exp`, `nbf`, and `sub` with `jose`. A normal
`Authorization: Bearer` JWT is also accepted for a future generic OIDC gateway.

Tradeoff: Cloudflare Access owns the interactive SSO redirect/session while the application
retains vendor-neutral JWT verification and CRM authorization. This avoids a custom password or
session system, but deployment requires Access and explicit CRM identity mapping.

## Identity mapping

`users.auth_provider + users.auth_subject` is the stable identity key. Display names and email
addresses are not used as the authorization identity. Authenticated identities without a mapping
receive `403 IDENTITY_NOT_MAPPED`; inactive CRM users receive `403 INACTIVE_USER`.

## Development mode

`npm run dev` explicitly starts the Worker with `AUTH_MODE=mock`. The local sign-in screen lists
deterministic seeded users and writes an HttpOnly, SameSite=Strict development cookie. The mock
provider also accepts `X-Mock-User-Id` for automated tests and local API tooling. Mock headers and
cookies are ignored unless `AUTH_MODE=mock` is explicitly configured.

Production never falls back to mock mode. A missing or invalid mode or incomplete OIDC
configuration returns `503 AUTH_CONFIGURATION_ERROR`.

## Endpoints

- `GET /api/health` is public.
- `GET /api/auth/config` exposes mode and non-secret redirect URLs.
- `GET /api/auth/mock-users` and `POST /api/auth/mock-login` exist only in mock mode.
- `POST /api/auth/logout` clears the mock cookie or returns the configured SSO logout URL.
- `GET /api/auth/me` returns safe CRM actor data and backend-resolved permissions.

All other API routes require an active mapped actor. Tokens and provider claims are never logged
or returned to the frontend.

## Environment

Production requires:

```text
AUTH_MODE=oidc
AUTH_ISSUER=https://<trusted-issuer>
AUTH_AUDIENCE=<application-audience>
AUTH_JWKS_URL=https://<trusted-issuer>/<jwks-path>
AUTH_LOGIN_URL=https://<configured-login-url>
AUTH_LOGOUT_URL=https://<configured-logout-url>
```

For Cloudflare Access, configure the application policy, use the Access application AUD as
`AUTH_AUDIENCE`, the team domain as issuer, and its `/cdn-cgi/access/certs` JWKS endpoint. Store
environment-specific values in Cloudflare configuration; any future provider client credentials
must use Worker secrets.

## Session security

Production session cookies are owned by Cloudflare Access. The application validates the JWT on
every API request. Mock cookies are local-development-only, HttpOnly, SameSite=Strict, and Secure
on HTTPS. Cookie-authenticated mock mutations reject cross-site browser requests using Fetch
Metadata. A future direct OIDC
authorization-code implementation would additionally require PKCE, state, nonce, and a dedicated
CSRF design; it is not implemented here.

## References

- [Cloudflare Access JWT validation and login/logout integration](https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/)
- [`jose` JWT verification](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md)
- [`jose` remote JWKS resolver](https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md)
