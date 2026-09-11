import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navItems, permissionForPath } from "../../App";
import { rolePermissions } from "@nico-ai-crm/auth";
import { fetchCurrentActor } from "./api";
import { ForbiddenState } from "./ForbiddenState";

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
