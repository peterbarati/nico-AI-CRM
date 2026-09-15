import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { permissionForPath } from "../../App";
import { fetchOpportunities } from "./api";
import { opportunityLabels, reasonLabels, routeStatusLabels } from "./labels";

afterEach(() => vi.unstubAllGlobals());

describe("Sales opportunities frontend", () => {
  it("uses the shared credentialed API client and pagination contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchOpportunities({
        page: 1,
        pageSize: 20,
        salesRepId: "",
        type: "",
        status: "OPEN",
        minimumScore: "",
        hasCoordinates: ""
      })
    ).resolves.toMatchObject({ items: [], pagination: { total: 0 } });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin" });
  });

  it("keeps stable codes internal and exposes Slovak labels", () => {
    const markup = renderToStaticMarkup(
      <div>
        <span>{opportunityLabels.REACTIVATION}</span>
        <span>{reasonLabels.VISIT_OVERDUE}</span>
        <span>{routeStatusLabels.RECOMMENDED}</span>
      </div>
    );
    expect(markup).toContain("Reaktivácia");
    expect(markup).toContain("Návšteva je po termíne");
    expect(markup).toContain("Odporúčaná");
    expect(permissionForPath("/sales/opportunities")).toBe("SALES_OPPORTUNITIES_READ");
    expect(permissionForPath("/sales/routes/route-1")).toBe("SALES_ROUTES_READ");
  });
});
