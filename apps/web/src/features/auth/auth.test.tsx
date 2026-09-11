import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navItems, permissionForPath } from "../../App";
import { rolePermissions } from "@nico-ai-crm/auth";
import { fetchAuthConfiguration, fetchCurrentActor, fetchMockUsers, selectMockUser } from "./api";
import { isLoggedOutError } from "./AuthContext";
import { ForbiddenState } from "./ForbiddenState";
import { initialLoginBootstrapState, loadLoginBootstrap, LoginPageContent } from "./LoginPage";
import { AuthApiError } from "./types";

afterEach(() => vi.unstubAllGlobals());

describe("frontend authentication", () => {
  it("loads backend-resolved actor permissions and surfaces auth errors", async () => {
    const actor = {
      id: "usr-manager-001",
      name: "Manager",
      email: "manager@example.test",
      role: "manager",
      active: true,
      provider: "mock",
      permissions: ["DASHBOARD_READ", "SETTINGS_READ"]
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, data: actor }), {
            status: 200,
            headers: { "content-type": "application/json" }
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: false,
              error: { code: "UNAUTHENTICATED", message: "Authentication required." }
            }),
            { status: 401, headers: { "content-type": "application/json" } }
          )
        )
    );
    await expect(fetchCurrentActor()).resolves.toEqual(actor);
    await expect(fetchCurrentActor()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401
    });
  });

  it("treats an unauthenticated current-user response as a normal logged-out state", () => {
    expect(
      isLoggedOutError(new AuthApiError("UNAUTHENTICATED", "Authentication required.", 401))
    ).toBe(true);
    expect(isLoggedOutError(new AuthApiError("FORBIDDEN", "Forbidden.", 403))).toBe(false);
  });

  it("loads mock authentication configuration and seeded role choices", async () => {
    const users = [
      mockUser("usr-admin-001", "admin"),
      mockUser("usr-manager-001", "manager"),
      mockUser("usr-cs-001", "customer_service"),
      mockUser("usr-sales-001", "sales_rep")
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            ok: true,
            data: { mode: "MOCK", loginUrl: null, logoutUrl: null }
          })
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true, data: users }))
    );

    await expect(loadLoginBootstrap()).resolves.toEqual({
      loading: false,
      configuration: { mode: "MOCK", loginUrl: null, logoutUrl: null },
      users,
      error: null
    });
  });

  it("completes mock login and then loads the authenticated actor", async () => {
    const actor = {
      id: "usr-admin-001",
      name: "Admin",
      email: "admin@example.test",
      role: "admin",
      active: true,
      provider: "mock",
      permissions: ["USER_ADMIN"]
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, data: { selected: true } }))
        .mockResolvedValueOnce(jsonResponse({ ok: true, data: actor }))
    );

    await expect(selectMockUser("usr-admin-001")).resolves.toBeUndefined();
    await expect(fetchCurrentActor()).resolves.toEqual(actor);
  });

  it("clears bootstrap loading and shows one error when the service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const state = await loadLoginBootstrap();
    expect(state).toEqual({
      loading: false,
      configuration: null,
      users: [],
      error: "Authentication service is unavailable."
    });

    const markup = renderToStaticMarkup(
      <LoginPageContent
        bootstrap={state}
        error={
          new AuthApiError("AUTH_SERVICE_UNAVAILABLE", "Authentication service is unavailable.", 0)
        }
        localError={null}
        selecting={null}
        select={async () => undefined}
      />
    );
    expect(markup.match(/Authentication service is unavailable\./g)).toHaveLength(1);
    expect(markup).not.toContain("Loading authentication options...");
  });

  it("rejects malformed success envelopes and non-JSON auth responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, data: { mode: "MOCK" } }))
        .mockResolvedValueOnce(new Response("proxy unavailable", { status: 502 }))
    );

    await expect(fetchAuthConfiguration()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(fetchMockUsers()).rejects.toMatchObject({
      code: "AUTH_SERVICE_UNAVAILABLE",
      status: 502
    });
  });

  it("keeps the initial login bootstrap in an explicit loading state", () => {
    const markup = renderToStaticMarkup(
      <LoginPageContent
        bootstrap={initialLoginBootstrapState}
        error={null}
        localError={null}
        selecting={null}
        select={async () => undefined}
      />
    );
    expect(markup).toContain("Loading authentication options...");
  });

  it("maps routes and navigation to resolved permissions", () => {
    expect(permissionForPath("/settings")).toBe("SETTINGS_READ");
    expect(permissionForPath("/customers/cus-001")).toBe("CUSTOMERS_READ");
    const salesNavigation = navItems
      .filter((item) => rolePermissions.sales_rep.includes(item.permission))
      .map((item) => item.label);
    expect(salesNavigation).toContain("Sales");
    expect(salesNavigation).not.toContain("Settings");
    expect(salesNavigation).not.toContain("Reports");
    expect(renderToStaticMarkup(<ForbiddenState />)).toContain("Access denied");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function mockUser(id: string, role: "admin" | "manager" | "customer_service" | "sales_rep") {
  return {
    id,
    name: id,
    email: `${id}@example.test`,
    role,
    active: true,
    identityMapped: true
  };
}
