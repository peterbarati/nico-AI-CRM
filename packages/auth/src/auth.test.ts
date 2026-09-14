import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  MockAuthProvider,
  OidcAuthProvider,
  hasPermission,
  resolvePermissions,
  type AuthenticatedActor
} from "./index";

describe("authentication providers", () => {
  it("uses an explicit mock identity and otherwise remains logged out", async () => {
    const provider = new MockAuthProvider();
    await expect(provider.authenticate(new Request("http://localhost"))).resolves.toBeNull();
    await expect(
      provider.authenticate(
        new Request("http://localhost", { headers: { "x-mock-user-id": "usr-cs-001" } })
      )
    ).resolves.toMatchObject({ provider: "mock", subject: "usr-cs-001" });
  });

  it("validates OIDC signature, issuer, audience, expiry, and subject", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ email: "admin@example.test", name: "Admin" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://identity.example.test")
      .setAudience("nico-ai-crm")
      .setSubject("identity-1")
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey);
    const provider = new OidcAuthProvider(
      {
        issuer: "https://identity.example.test",
        audience: "nico-ai-crm",
        jwksUrl: "https://identity.example.test/jwks"
      },
      async () => publicKey
    );
    await expect(
      provider.authenticate(
        new Request("https://crm.example.test", {
          headers: { "cf-access-jwt-assertion": token }
        })
      )
    ).resolves.toMatchObject({ subject: "identity-1", email: "admin@example.test" });

    const wrongAudience = new OidcAuthProvider(
      {
        issuer: "https://identity.example.test",
        audience: "another-application",
        jwksUrl: "https://identity.example.test/jwks"
      },
      async () => publicKey
    );
    await expect(
      wrongAudience.authenticate(
        new Request("https://crm.example.test", { headers: { authorization: `Bearer ${token}` } })
      )
    ).rejects.toThrow("invalid");

    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://identity.example.test")
      .setAudience("nico-ai-crm")
      .setSubject("identity-1")
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 60)
      .sign(privateKey);
    await expect(
      provider.authenticate(
        new Request("https://crm.example.test", {
          headers: { authorization: `Bearer ${expired}` }
        })
      )
    ).rejects.toThrow("invalid");
    await expect(
      provider.authenticate(
        new Request("https://crm.example.test", {
          headers: { authorization: "Bearer malformed" }
        })
      )
    ).rejects.toThrow("invalid");
  });
});

describe("role permissions", () => {
  it("keeps settings writes and user administration with administrators", () => {
    expect(resolvePermissions("admin")).toContain("SETTINGS_WRITE");
    expect(resolvePermissions("manager")).toContain("SETTINGS_READ");
    expect(resolvePermissions("manager")).toContain("TASK_WRITE");
    expect(resolvePermissions("manager")).not.toContain("SETTINGS_WRITE");
    expect(resolvePermissions("customer_service")).toContain("CUSTOMER_INTERACTIONS_WRITE");
    expect(resolvePermissions("sales_rep")).toContain("SALES_VISIT_WRITE");
    expect(resolvePermissions("sales_rep")).not.toContain("REPORTS_READ");

    const actor: AuthenticatedActor = {
      id: "usr-admin-001",
      email: "admin@example.test",
      name: "Admin",
      role: "admin",
      active: true,
      provider: "mock",
      providerIdentityId: "usr-admin-001",
      permissions: resolvePermissions("admin")
    };
    expect(hasPermission(actor, "USER_ADMIN")).toBe(true);
    expect(hasPermission({ ...actor, active: false }, "USER_ADMIN")).toBe(false);
  });
});
